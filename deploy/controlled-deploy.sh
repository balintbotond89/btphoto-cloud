#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly REPOSITORY_URL='https://github.com/balintbotond89/btphoto-cloud.git'
readonly TARGET_DIR='/opt/btphoto'
readonly PRODUCTION_ENV='/etc/btphoto/.env.production'
readonly CA_FILE='/etc/btphoto/certs/ca.crt'
readonly DB_HOST='10.20.0.20'
readonly DB_PORT='26257'
readonly LOCK_FILE='/run/lock/btphoto-controlled-deploy.lock'
readonly DIAGNOSTIC_DIR='/var/log/btphoto'
readonly MINIMUM_FREE_KIB=$((5 * 1024 * 1024))
readonly GATEWAY_IMAGE='caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f'

RELEASE_SHA=''
BACKEND_IMAGE=''
FRONTEND_IMAGE=''
MIGRATIONS_IMAGE=''
DEPLOYMENT_ID=''
CANDIDATE_DIR=''
PREVIOUS_DIR=''
FAILED_DIR=''
TEMPORARY_ENV=''
ENV_BACKUP=''
ACTIVATION_STARTED=0
ENV_BACKUP_CREATED=0
ENV_ACTIVATED=0
PREVIOUS_CHECKOUT_MOVED=0
CANDIDATE_ACTIVATED=0
STACK_START_ATTEMPTED=0
DIAGNOSTIC_FILE=''
ROLLBACK_STATE='not-started'
ERROR_HANDLER_ACTIVE=0
HANDLER_FINAL_STATUS=70
DIAGNOSTICS_ATTEMPTED=0
STACK_STOP_ATTEMPTED=0
CHECKOUT_ROLLBACK_ATTEMPTED=0
ENV_ROLLBACK_ATTEMPTED=0

SELF_TEST_MODE=0
SELF_TEST_FAILURE=''
SELF_TEST_DIAGNOSTIC_CALLS=0
SELF_TEST_STACK_STOP_CALLS=0
SELF_TEST_CHECKOUT_CALLS=0
SELF_TEST_ENV_CALLS=0
SELF_TEST_REAL_ERR_CHILD=0

log() {
    printf '[BTPhoto] %s\n' "$1"
}

fail() {
    printf '[BTPhoto] HIBA: %s\n' "$1" >&2
    return 1
}

usage() {
    printf 'Használat: %s <teljes-40-karakteres-kisbetűs-release-SHA>\n' "$0" >&2
}

require_command() {
    local command_name=$1
    command -v "$command_name" >/dev/null 2>&1 \
        || fail "A szükséges parancs nem érhető el: ${command_name}"
}

configure_release() {
    if [[ "$#" -ne 1 || ! "${1:-}" =~ ^[0-9a-f]{40}$ ]]; then
        usage
        return 2
    fi

    RELEASE_SHA=$1
    BACKEND_IMAGE="ghcr.io/balintbotond89/btphoto-backend:${RELEASE_SHA}"
    FRONTEND_IMAGE="ghcr.io/balintbotond89/btphoto-frontend:${RELEASE_SHA}"
    MIGRATIONS_IMAGE="ghcr.io/balintbotond89/btphoto-migrations:${RELEASE_SHA}"
}

check_exact_metadata() {
    local path=$1
    local expected_owner=$2
    local expected_mode=$3
    local actual_owner
    local actual_mode

    [[ -f "$path" && ! -L "$path" ]] || fail "Nem szabályos fájl: ${path}"
    [[ -s "$path" ]] || fail "A fájl üres: ${path}"
    actual_owner=$(stat -c '%U:%G' "$path")
    actual_mode=$(stat -c '%a' "$path")
    [[ "$actual_owner" == "$expected_owner" ]] \
        || fail "Helytelen tulajdonos a következő fájlon: ${path}"
    [[ "$actual_mode" == "$expected_mode" ]] \
        || fail "Helytelen jogosultság a következő fájlon: ${path}"
}

check_port_is_free() {
    local listeners
    listeners=$(ss -H -ltn | awk '$4 ~ /(^|:)8080$/ {print $4}')
    [[ -z "$listeners" ]] || fail 'A 127.0.0.1:8080 port nem szabad.'
}

check_no_running_stack() {
    local running
    running=$(docker ps \
        --filter label=com.docker.compose.project=btphoto \
        --format '{{.Names}}')
    [[ -z "$running" ]] || fail 'Már fut BTPhoto Compose stack.'
}

check_tcp_connection() {
    timeout 5 bash -c "exec 3<>/dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null \
        || fail "A CockroachDB TCP-végpont nem érhető el: ${DB_HOST}:${DB_PORT}"
}

check_disk_capacity() {
    local free_kib
    free_kib=$(df -Pk /opt | awk 'NR == 2 {print $4}')
    log "Az /opt szabad kapacitása: ${free_kib} KiB; minimum: ${MINIMUM_FREE_KIB} KiB."
    [[ "$free_kib" =~ ^[0-9]+$ && "$free_kib" -ge "$MINIMUM_FREE_KIB" ]] \
        || fail 'Nincs legalább 5 GiB szabad hely az /opt fájlrendszerén.'
}

check_remote_main() {
    local remote_line
    local remote_sha
    local remote_ref

    remote_line=$(git ls-remote --exit-code "$REPOSITORY_URL" refs/heads/main)
    read -r remote_sha remote_ref <<<"$remote_line"
    [[ "$remote_ref" == 'refs/heads/main' && "$remote_sha" == "$RELEASE_SHA" ]] \
        || fail 'A távoli main pontos SHA-ja eltér a jóváhagyott release SHA-tól.'
}

check_preconditions() {
    local command_name
    local image

    [[ "$EUID" -eq 0 ]] || fail 'A script kizárólag rootként futtatható.'

    for command_name in \
        awk bash chmod chown cp curl date df docker flock git grep install mktemp mv \
        python3 sed ss stat timeout tr wc; do
        require_command "$command_name"
    done

    exec 9>"$LOCK_FILE"
    flock -n 9 || fail 'Másik BTPhoto deployment folyamat tartja a globális lockot.'

    docker version >/dev/null 2>&1 || fail 'A Docker Engine nem érhető el.'
    docker compose version >/dev/null 2>&1 || fail 'A Docker Compose plugin nem érhető el.'

    check_exact_metadata "$PRODUCTION_ENV" 'root:root' '600'
    [[ -f "$CA_FILE" && ! -L "$CA_FILE" && -r "$CA_FILE" ]] \
        || fail "A CockroachDB CA-fájl hiányzik vagy nem olvasható: ${CA_FILE}"
    [[ -d "$TARGET_DIR" && ! -L "$TARGET_DIR" ]] \
        || fail "A meglévő checkout hiányzik vagy nem szabályos könyvtár: ${TARGET_DIR}"

    check_remote_main
    check_tcp_connection
    check_port_is_free
    check_no_running_stack
    check_disk_capacity

    for image in "$BACKEND_IMAGE" "$FRONTEND_IMAGE" "$MIGRATIONS_IMAGE"; do
        docker manifest inspect "$image" >/dev/null 2>&1 \
            || fail "A jóváhagyott image-manifest nem érhető el: ${image}"
    done
}

initialize_paths() {
    DEPLOYMENT_ID="$(date -u '+%Y%m%dT%H%M%SZ')-$$"
    CANDIDATE_DIR="/opt/btphoto.candidate-${DEPLOYMENT_ID}"
    PREVIOUS_DIR="/opt/btphoto.predeploy-${DEPLOYMENT_ID}"
    FAILED_DIR="/opt/btphoto.failed-${DEPLOYMENT_ID}"
    ENV_BACKUP="/etc/btphoto/.env.production.predeploy-${DEPLOYMENT_ID}"

    [[ ! -e "$CANDIDATE_DIR" ]] || fail "A candidate útvonal már létezik: ${CANDIDATE_DIR}"
    [[ ! -e "$PREVIOUS_DIR" ]] || fail "A predeploy útvonal már létezik: ${PREVIOUS_DIR}"
    [[ ! -e "$FAILED_DIR" ]] || fail "A failed útvonal már létezik: ${FAILED_DIR}"
    [[ ! -e "$ENV_BACKUP" ]] || fail "Az env-backup útvonal már létezik: ${ENV_BACKUP}"
}

create_candidate_checkout() {
    local actual_head

    git clone --no-checkout -- "$REPOSITORY_URL" "$CANDIDATE_DIR"
    git -C "$CANDIDATE_DIR" checkout --detach "$RELEASE_SHA"

    actual_head=$(git -C "$CANDIDATE_DIR" rev-parse HEAD)
    [[ "$actual_head" == "$RELEASE_SHA" ]] \
        || fail 'A candidate checkout nem a jóváhagyott commiton áll.'
    if git -C "$CANDIDATE_DIR" symbolic-ref -q HEAD >/dev/null 2>&1; then
        fail 'A candidate checkout nem detached HEAD állapotú.'
    fi
    [[ -z "$(git -C "$CANDIDATE_DIR" status --porcelain=v1)" ]] \
        || fail 'A candidate checkout nem tiszta.'
}

create_temporary_env() {
    TEMPORARY_ENV=$(mktemp '/etc/btphoto/.env.production.candidate.XXXXXX')
    chown root:root "$TEMPORARY_ENV"
    chmod 0600 "$TEMPORARY_ENV"

    python3 - "$PRODUCTION_ENV" "$TEMPORARY_ENV" "$RELEASE_SHA" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
sha = sys.argv[3].encode("ascii")
data = source.read_bytes()
pattern = re.compile(br"(?m)^BTPHOTO_IMAGE_TAG=[^\r\n]*")
matches = list(pattern.finditer(data))
if len(matches) != 1:
    raise SystemExit("A BTPHOTO_IMAGE_TAG kulcsnak pontosan egyszer kell szerepelnie.")
match = matches[0]
updated = data[:match.start()] + b"BTPHOTO_IMAGE_TAG=" + sha + data[match.end():]
target.write_bytes(updated)
PY

    chown root:root "$TEMPORARY_ENV"
    chmod 0600 "$TEMPORARY_ENV"
    [[ -s "$TEMPORARY_ENV" ]] || fail 'Az ideiglenes production env üres.'
}

verify_image_revision() {
    local image=$1
    local revision

    revision=$(docker image inspect \
        --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
        "$image")
    [[ "$revision" == "$RELEASE_SHA" ]] \
        || fail "Az image OCI revision labelje eltér a release SHA-tól: ${image}"
}

validate_and_pull_images() {
    local compose_file="${CANDIDATE_DIR}/deploy/compose.production.yml"
    local validator="${CANDIDATE_DIR}/deploy/validate-production-config.sh"
    local resolved_images
    local image

    [[ -f "$compose_file" ]] || fail 'A candidate Compose-fájl hiányzik.'
    [[ -f "$validator" ]] || fail 'A candidate production validator hiányzik.'

    sh "$validator" "$TEMPORARY_ENV"
    resolved_images=$(docker compose \
        --env-file "$TEMPORARY_ENV" \
        -f "$compose_file" \
        config --images)

    for image in "$BACKEND_IMAGE" "$FRONTEND_IMAGE" "$MIGRATIONS_IMAGE" "$GATEWAY_IMAGE"; do
        [[ "$(printf '%s\n' "$resolved_images" | grep -Fxc "$image" || true)" -eq 1 ]] \
            || fail "A feloldott Compose image-készletből hiányzik vagy duplikált: ${image}"
    done
    [[ "$(printf '%s\n' "$resolved_images" | sed '/^$/d' | wc -l)" -eq 4 ]] \
        || fail 'A feloldott Compose image-készlet nem pontosan négy elemből áll.'

    docker compose \
        --env-file "$TEMPORARY_ENV" \
        -f "$compose_file" \
        pull migrations backend frontend caddy

    verify_image_revision "$BACKEND_IMAGE"
    verify_image_revision "$FRONTEND_IMAGE"
    verify_image_revision "$MIGRATIONS_IMAGE"
}

create_env_backup() {
    local backup_temp

    backup_temp=$(mktemp "${ENV_BACKUP}.tmp.XXXXXX")
    cp --preserve=mode,ownership,timestamps -- "$PRODUCTION_ENV" "$backup_temp"
    chown root:root "$backup_temp"
    chmod 0600 "$backup_temp"
    mv -T -- "$backup_temp" "$ENV_BACKUP"
    ENV_BACKUP_CREATED=1
}

activate_candidate() {
    ACTIVATION_STARTED=1
    create_env_backup

    mv -T -- "$TEMPORARY_ENV" "$PRODUCTION_ENV"
    TEMPORARY_ENV=''
    ENV_ACTIVATED=1

    mv -T -- "$TARGET_DIR" "$PREVIOUS_DIR"
    PREVIOUS_CHECKOUT_MOVED=1

    mv -T -- "$CANDIDATE_DIR" "$TARGET_DIR"
    CANDIDATE_DIR=''
    CANDIDATE_ACTIVATED=1
}

sanitize_diagnostic_stream() {
    python3 -c '
import re
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
secret_values = []
try:
    for raw_line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if re.search(r"(?:PASSWORD|TOKEN|SECRET|CREDENTIAL)", key, re.IGNORECASE):
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("\"", "\x27"):
                value = value[1:-1]
            if value:
                secret_values.append(value)
except OSError:
    raise SystemExit("A diagnosztikai szűrés nem készíthető elő.")

text = sys.stdin.read()
for value in sorted(set(secret_values), key=len, reverse=True):
    text = text.replace(value, "[REDACTED]")
text = re.sub(
    r"(?i)\b(?:DB_PASSWORD|[A-Z0-9_]*(?:PASSWORD|TOKEN|SECRET|CREDENTIAL)[A-Z0-9_]*)\b\s*[:=]\s*\S+",
    "[REDACTED]",
    text,
)
text = re.sub(r"(?i)\bAuthorization\s*:\s*\S+(?:\s+\S+)?", "Authorization: [REDACTED]", text)
sys.stdout.write(text)
' "$PRODUCTION_ENV"
}

append_container_diagnostic() {
    local service=$1
    local container_ids
    local container_id

    if ! container_ids=$(docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        ps --all -q "$service" 2>/dev/null); then
        printf '%s: a konténerazonosító nem kérdezhető le.\n' "$service" >>"$DIAGNOSTIC_FILE"
        return 0
    fi
    if [[ -z "$container_ids" ]]; then
        printf '%s: nincs konténer.\n' "$service" >>"$DIAGNOSTIC_FILE"
        return 0
    fi

    while IFS= read -r container_id; do
        [[ -n "$container_id" ]] || continue
        if ! docker inspect --format \
            'service={{index .Config.Labels "com.docker.compose.service"}} status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} image={{.Config.Image}} exit_code={{.State.ExitCode}}' \
            "$container_id" >>"$DIAGNOSTIC_FILE" 2>/dev/null; then
            printf '%s: a biztonságos konténerösszefoglaló nem kérdezhető le.\n' \
                "$service" >>"$DIAGNOSTIC_FILE"
        fi
    done <<<"$container_ids"
}

append_service_logs() {
    local service=$1

    printf '\n[%s utolsó legfeljebb 200 logsora]\n' "$service" >>"$DIAGNOSTIC_FILE"
    if ! docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        logs --no-color --tail 200 "$service" 2>&1 \
        | sanitize_diagnostic_stream >>"$DIAGNOSTIC_FILE"; then
        printf '%s: a titokszűrt naplórészlet nem készíthető el.\n' \
            "$service" >>"$DIAGNOSTIC_FILE"
    fi
}

capture_rollback_diagnostics() {
    local timestamp
    local service

    timestamp=$(date -u '+%Y%m%dT%H%M%SZ') || return 1
    DIAGNOSTIC_FILE="${DIAGNOSTIC_DIR}/rollback-${DEPLOYMENT_ID}-${timestamp}.log"

    if [[ -e "$DIAGNOSTIC_DIR" && ( ! -d "$DIAGNOSTIC_DIR" || -L "$DIAGNOSTIC_DIR" ) ]]; then
        return 1
    fi
    install -d -o root -g root -m 0700 -- "$DIAGNOSTIC_DIR" || return 1
    chown root:root "$DIAGNOSTIC_DIR" || return 1
    chmod 0700 "$DIAGNOSTIC_DIR" || return 1
    [[ ! -e "$DIAGNOSTIC_FILE" && ! -L "$DIAGNOSTIC_FILE" ]] || return 1
    install -o root -g root -m 0600 -- /dev/null "$DIAGNOSTIC_FILE" || return 1

    {
        printf 'UTC időpont: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        printf 'Jóváhagyott SHA: %s\n' "$RELEASE_SHA"
        printf '\n[docker compose ps]\n'
    } >>"$DIAGNOSTIC_FILE" || return 1

    if ! docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        ps --all >>"$DIAGNOSTIC_FILE" 2>&1; then
        printf 'A docker compose ps lekérdezése sikertelen.\n' >>"$DIAGNOSTIC_FILE"
    fi

    printf '\n[biztonságos konténerösszefoglaló]\n' >>"$DIAGNOSTIC_FILE" || return 1
    for service in migrations backend frontend caddy; do
        append_container_diagnostic "$service"
    done
    for service in migrations backend frontend caddy; do
        append_service_logs "$service"
    done

    chown root:root "$DIAGNOSTIC_FILE" || return 1
    chmod 0600 "$DIAGNOSTIC_FILE" || return 1
}

restore_production_env() {
    local restore_temp

    [[ "$ENV_ACTIVATED" -eq 1 ]] || return 0
    if [[ "$ENV_BACKUP_CREATED" -ne 1 || ! -f "$ENV_BACKUP" ]]; then
        return 1
    fi

    restore_temp=$(mktemp '/etc/btphoto/.env.production.restore.XXXXXX') || return 1
    cp --preserve=mode,ownership,timestamps -- "$ENV_BACKUP" "$restore_temp" || return 1
    chown root:root "$restore_temp" || return 1
    chmod 0600 "$restore_temp" || return 1
    mv -T -- "$restore_temp" "$PRODUCTION_ENV" || return 1
    ENV_ACTIVATED=0
}

preserve_failed_checkout() {
    if [[ "$CANDIDATE_ACTIVATED" -eq 1 ]]; then
        if [[ -d "$TARGET_DIR" && ! -e "$FAILED_DIR" ]]; then
            mv -T -- "$TARGET_DIR" "$FAILED_DIR" || return 1
        elif [[ ! -e "$TARGET_DIR" && -d "$FAILED_DIR" ]]; then
            :
        else
            return 1
        fi
        CANDIDATE_ACTIVATED=0
        return 0
    fi

    if [[ -n "$CANDIDATE_DIR" && -d "$CANDIDATE_DIR" ]]; then
        [[ ! -e "$FAILED_DIR" ]] || return 1
        mv -T -- "$CANDIDATE_DIR" "$FAILED_DIR" || return 1
        CANDIDATE_DIR=''
    fi
}

restore_previous_checkout() {
    [[ "$PREVIOUS_CHECKOUT_MOVED" -eq 1 ]] || return 0

    if [[ -d "$PREVIOUS_DIR" && ! -e "$TARGET_DIR" ]]; then
        mv -T -- "$PREVIOUS_DIR" "$TARGET_DIR" || return 1
    elif [[ ! -e "$PREVIOUS_DIR" && -d "$TARGET_DIR" ]]; then
        :
    else
        return 1
    fi
    PREVIOUS_CHECKOUT_MOVED=0
}

rollback_capture_diagnostics() {
    DIAGNOSTICS_ATTEMPTED=1
    if [[ "$SELF_TEST_MODE" -eq 1 ]]; then
        SELF_TEST_DIAGNOSTIC_CALLS=$((SELF_TEST_DIAGNOSTIC_CALLS + 1))
        [[ "$SELF_TEST_FAILURE" != 'diagnostics' ]] || return 1
        return 0
    fi
    capture_rollback_diagnostics
}

rollback_stop_stack() {
    STACK_STOP_ATTEMPTED=1
    if [[ "$SELF_TEST_MODE" -eq 1 ]]; then
        SELF_TEST_STACK_STOP_CALLS=$((SELF_TEST_STACK_STOP_CALLS + 1))
        [[ "$SELF_TEST_FAILURE" != 'stack' ]] || return 1
        return 0
    fi

    docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        down
}

rollback_restore_checkout() {
    local failed=0

    CHECKOUT_ROLLBACK_ATTEMPTED=1
    if [[ "$SELF_TEST_MODE" -eq 1 ]]; then
        SELF_TEST_CHECKOUT_CALLS=$((SELF_TEST_CHECKOUT_CALLS + 1))
        [[ "$SELF_TEST_FAILURE" != 'checkout' ]] || return 1
        return 0
    fi

    preserve_failed_checkout || failed=1
    restore_previous_checkout || failed=1
    [[ "$failed" -eq 0 ]]
}

rollback_restore_env() {
    ENV_ROLLBACK_ATTEMPTED=1
    if [[ "$SELF_TEST_MODE" -eq 1 ]]; then
        SELF_TEST_ENV_CALLS=$((SELF_TEST_ENV_CALLS + 1))
        [[ "$SELF_TEST_FAILURE" != 'env' ]] || return 1
        return 0
    fi
    restore_production_env
}

rollback() {
    local rollback_failed=0

    case "$ROLLBACK_STATE" in
        succeeded)
            return 0
            ;;
        running|failed)
            return 1
            ;;
    esac

    ROLLBACK_STATE='running'
    log 'Aktiválás utáni hiba történt; rollback indul.'

    if [[ "$STACK_START_ATTEMPTED" -eq 1 && "$DIAGNOSTICS_ATTEMPTED" -eq 0 ]]; then
        if rollback_capture_diagnostics; then
            [[ "$SELF_TEST_MODE" -eq 1 ]] || log "Rollback diagnosztika: ${DIAGNOSTIC_FILE}"
        else
            printf '[BTPhoto] ROLLBACK FIGYELMEZTETÉS: a diagnosztika nem készíthető el; útvonal: %s\n' \
                "${DIAGNOSTIC_FILE:-nem hozható létre}" >&2
        fi
    fi

    if [[ "$STACK_START_ATTEMPTED" -eq 1 && "$STACK_STOP_ATTEMPTED" -eq 0 ]]; then
        if ! rollback_stop_stack; then
            printf '[BTPhoto] ROLLBACK HIBA: az új stack leállítása sikertelen.\n' >&2
            rollback_failed=1
        fi
    fi

    if [[ "$CHECKOUT_ROLLBACK_ATTEMPTED" -eq 0 ]]; then
        if ! rollback_restore_checkout; then
            printf '[BTPhoto] ROLLBACK HIBA: a checkout visszaállítása sikertelen.\n' >&2
            rollback_failed=1
        fi
    fi

    if [[ "$ENV_ROLLBACK_ATTEMPTED" -eq 0 ]]; then
        if ! rollback_restore_env; then
            printf '[BTPhoto] ROLLBACK HIBA: a production env visszaállítása sikertelen.\n' >&2
            rollback_failed=1
        fi
    fi

    if [[ "$rollback_failed" -eq 0 ]]; then
        ROLLBACK_STATE='succeeded'
        log 'ROLLBACK SIKERES.'
        return 0
    fi

    ROLLBACK_STATE='failed'
    if [[ "$SELF_TEST_REAL_ERR_CHILD" -eq 1 ]]; then
        log "SELF-TEST ERR COUNTS diagnostics=${SELF_TEST_DIAGNOSTIC_CALLS} stack=${SELF_TEST_STACK_STOP_CALLS} checkout=${SELF_TEST_CHECKOUT_CALLS} env=${SELF_TEST_ENV_CALLS} state=${ROLLBACK_STATE}"
    fi
    printf '[BTPhoto] ROLLBACK SIKERTELEN; kézi helyreállítás szükséges.\n' >&2
    return 1
}

handle_failure() {
    local exit_status=$1
    local line_number=$2

    if [[ "$ERROR_HANDLER_ACTIVE" -eq 1 ]]; then
        return "$HANDLER_FINAL_STATUS"
    fi
    ERROR_HANDLER_ACTIVE=1
    HANDLER_FINAL_STATUS=$exit_status

    printf '[BTPhoto] HIBA: a script a(z) %s. sor környezetében leállt, exit=%s.\n' \
        "$line_number" "$exit_status" >&2

    if [[ "$ACTIVATION_STARTED" -eq 1 ]]; then
        if ! rollback; then
            HANDLER_FINAL_STATUS=70
        fi
    else
        log 'Az aktiválás még nem kezdődött el; production checkout, env és stack nem változott.'
        [[ -n "$CANDIDATE_DIR" ]] && log "A candidate checkout megőrzött útvonala: ${CANDIDATE_DIR}"
        [[ -n "$TEMPORARY_ENV" ]] && log "A root-only ideiglenes env megőrzött útvonala: ${TEMPORARY_ENV}"
    fi

    return "$HANDLER_FINAL_STATUS"
}

on_error() {
    local exit_status=$1
    local line_number=$2
    local final_status

    trap - ERR EXIT INT TERM
    set +e
    handle_failure "$exit_status" "$line_number"
    final_status=$?
    exit "$final_status"
}

on_signal() {
    local signal_status=$1
    local line_number=$2
    on_error "$signal_status" "$line_number"
}

service_container_id() {
    local service=$1
    local include_stopped=${2:-0}
    local ids
    local count
    local -a compose_ps=(docker compose --env-file "$PRODUCTION_ENV" -f "$TARGET_DIR/deploy/compose.production.yml" ps)

    [[ "$include_stopped" -eq 0 ]] || compose_ps+=(--all)
    ids=$("${compose_ps[@]}" -q "$service")
    count=$(printf '%s\n' "$ids" | sed '/^$/d' | wc -l)
    [[ "$count" -eq 1 ]] || fail "A szolgáltatás konténerazonosítója nem egyértelmű: ${service}"
    printf '%s\n' "$ids"
}

verify_container() {
    local service=$1
    local container_id=$2
    local expected_image=$3
    local expected_state=$4
    local expected_capability=$5
    local expected_user=$6
    local expected_port_mode=$7
    local expected_bind_mounts=$8
    local expected_tmpfs_size_mib=$9

    docker inspect "$container_id" | python3 -c '
import json
import re
import sys

service, expected_image, expected_state, expected_capability, expected_user, port_mode, bind_spec, tmpfs_size_mib = sys.argv[1:]
container = json.load(sys.stdin)[0]
host = container["HostConfig"]
state = container["State"]
config = container["Config"]


def require(condition, message):
    if not condition:
        raise SystemExit(f"{service}: {message}")


if expected_state == "RUNNING_HEALTHY":
    require(state.get("Status") == "running", "a konténer nem fut")
    require((state.get("Health") or {}).get("Status") == "healthy", "a konténer nem healthy")
else:
    require(state.get("Status") == "exited", "a migration konténer nem exited állapotú")
    require(state.get("ExitCode") == 0, "a migration konténer exit kódja nem nulla")

require(config.get("Image") == expected_image, "a futó image eltér az elvárt referenciától")
require(config.get("User") == expected_user, "a konténer felhasználója eltér az elvárttól")
require((host.get("CapDrop") or []) == ["ALL"], "a cap_drop nem pontosan ALL")
expected_add = [] if expected_capability == "NONE" else [expected_capability]
require((host.get("CapAdd") or []) == expected_add, "a cap_add készlet eltér az elvárttól")
require(host.get("ReadonlyRootfs") is True, "a root fájlrendszer nem read-only")
require("no-new-privileges:true" in (host.get("SecurityOpt") or []), "hiányzik a no-new-privileges")

ports = host.get("PortBindings") or {}
if port_mode == "NONE":
    require(ports == {}, "a szolgáltatás hostportot publikál")
else:
    expected_ports = {"8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": "8080"}]}
    require(ports == expected_ports, "a gateway portpublikálása eltér az elvárttól")

actual_bind_mounts = sorted(
    (mount.get("Type", ""), mount.get("Source", ""),
     mount.get("Destination", ""), bool(mount.get("RW")))
    for mount in container.get("Mounts", [])
    if mount.get("Type") != "tmpfs"
)
expected_bind_mounts = []
for item in filter(None, bind_spec.split(";")):
    mount_type, source, destination, writable = item.split("|")
    expected_bind_mounts.append((mount_type, source, destination, writable == "true"))
require(actual_bind_mounts == sorted(expected_bind_mounts),
        "a bind/volume mountkészlet eltér az engedélylistától")

mount_tmpfs_entries = [
    (mount.get("Destination", ""), bool(mount.get("RW")))
    for mount in container.get("Mounts", [])
    if mount.get("Type") == "tmpfs"
]
require(all(destination == "/tmp" and writable for destination, writable in mount_tmpfs_entries)
        and len(mount_tmpfs_entries) <= 1,
        "váratlan vagy duplikált tmpfs mount található")

tmpfs = host.get("Tmpfs") or {}
require(isinstance(tmpfs, dict), "a HostConfig.Tmpfs formátuma érvénytelen")
require(set(tmpfs) == {"/tmp"}, "a tmpfs célútvonal-készlet nem pontosan /tmp")
tmpfs_options = [option.strip() for option in str(tmpfs["/tmp"]).split(",") if option.strip()]
require({"rw", "noexec", "nosuid", "nodev"}.issubset(tmpfs_options),
        "a tmpfs kötelező opciói hiányoznak")
require("ro" not in tmpfs_options, "a /tmp tmpfs nem írható")

size_options = [option.split("=", 1)[1] for option in tmpfs_options if option.startswith("size=")]
require(len(size_options) == 1, "a tmpfs méretopciója hiányzik vagy duplikált")


def size_in_bytes(value):
    match = re.fullmatch(r"([0-9]+)(b|m|mib)?", value.strip(), re.IGNORECASE)
    if not match:
        return None
    size = int(match.group(1))
    unit = (match.group(2) or "b").lower()
    return size if unit == "b" else size * 1024 * 1024


require(size_in_bytes(size_options[0]) == int(tmpfs_size_mib) * 1024 * 1024,
        "a tmpfs mérete eltér az elvárttól")
' "$service" "$expected_image" "$expected_state" "$expected_capability" "$expected_user" \
        "$expected_port_mode" "$expected_bind_mounts" "$expected_tmpfs_size_mib"
}

validate_flyway_info() {
    local info_file=$1

    python3 - "$info_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    info = json.load(source)

migrations = info.get("migrations") or []
baseline = [item for item in migrations if str(item.get("version")) == "1"]
if str(info.get("schemaVersion")) != "1":
    raise SystemExit("A Flyway schemaVersion nem 1.")
if len(baseline) != 1 or str(baseline[0].get("state", "")).lower() != "success":
    raise SystemExit("A V1 baseline nem pontosan egyszer, sikeresen szerepel.")
if any(str(item.get("state", "")).lower() in {"failed", "pending"} for item in migrations):
    raise SystemExit("Sikertelen vagy függőben lévő migráció található.")
PY
}

verify_migration_history() {
    local info_file
    local status

    info_file=$(mktemp '/run/btphoto-flyway-info.XXXXXX')
    chmod 0600 "$info_file"

    set +e
    docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        run --rm --no-deps migrations info -outputType=json >"$info_file"
    status=$?
    set -e
    if [[ "$status" -ne 0 ]]; then
        rm -f -- "$info_file"
        return "$status"
    fi

    validate_flyway_info "$info_file"
    status=$?
    rm -f -- "$info_file"
    return "$status"
}

verify_runtime() {
    local migrations_id
    local backend_id
    local frontend_id
    local gateway_id
    local all_ids

    migrations_id=$(service_container_id migrations 1)
    backend_id=$(service_container_id backend)
    frontend_id=$(service_container_id frontend)
    gateway_id=$(service_container_id caddy)

    all_ids=$(docker compose \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        ps --all -q)
    [[ "$(printf '%s\n' "$all_ids" | sed '/^$/d' | wc -l)" -eq 4 ]] \
        || fail 'A BTPhoto stack nem pontosan négy szolgáltatásból áll.'

    verify_container \
        migrations "$migrations_id" "$MIGRATIONS_IMAGE" EXITED_SUCCESS NONE '10001:10001' NONE \
        'bind|/etc/btphoto/certs/ca.crt|/run/secrets/btphoto/cockroach-ca.crt|false' 32
    verify_container \
        backend "$backend_id" "$BACKEND_IMAGE" RUNNING_HEALTHY NONE '10001:10001' NONE \
        'bind|/etc/btphoto/certs/ca.crt|/run/secrets/btphoto/cockroach-ca.crt|false' 64
    verify_container \
        frontend "$frontend_id" "$FRONTEND_IMAGE" RUNNING_HEALTHY NET_BIND_SERVICE '10001:10001' NONE \
        '' 16
    verify_container \
        caddy "$gateway_id" "$GATEWAY_IMAGE" RUNNING_HEALTHY NET_BIND_SERVICE '65534:65534' GATEWAY \
        'bind|/opt/btphoto/deploy/Caddyfile|/etc/caddy/Caddyfile|false' 16

    verify_migration_history
}

run_smoke_tests() {
    local endpoint

    for endpoint in \
        'http://127.0.0.1:8080/_gateway/health' \
        'http://127.0.0.1:8080/api/health' \
        'http://127.0.0.1:8080/'; do
        curl --fail --silent --show-error --max-time 15 "$endpoint" >/dev/null \
            || fail "A smoke teszt sikertelen: ${endpoint}"
    done
}

start_and_verify_stack() {
    local status

    STACK_START_ATTEMPTED=1
    set +e
    docker compose \
        --project-directory "$TARGET_DIR" \
        --env-file "$PRODUCTION_ENV" \
        -f "$TARGET_DIR/deploy/compose.production.yml" \
        up -d --no-build --wait
    status=$?
    set -e
    [[ "$status" -eq 0 ]] || return "$status"

    verify_runtime
    run_smoke_tests
}

reset_self_test_state() {
    ACTIVATION_STARTED=0
    STACK_START_ATTEMPTED=0
    ROLLBACK_STATE='not-started'
    ERROR_HANDLER_ACTIVE=0
    HANDLER_FINAL_STATUS=70
    DIAGNOSTICS_ATTEMPTED=0
    STACK_STOP_ATTEMPTED=0
    CHECKOUT_ROLLBACK_ATTEMPTED=0
    ENV_ROLLBACK_ATTEMPTED=0
    SELF_TEST_FAILURE=''
    SELF_TEST_DIAGNOSTIC_CALLS=0
    SELF_TEST_STACK_STOP_CALLS=0
    SELF_TEST_CHECKOUT_CALLS=0
    SELF_TEST_ENV_CALLS=0
}

self_test_assert_equal() {
    local expected=$1
    local actual=$2
    local message=$3
    [[ "$expected" == "$actual" ]] || fail "SELF-TEST: ${message}; elvárt=${expected}, tényleges=${actual}"
}

self_test_handle_failure() {
    local expected_status=$1
    local actual_status

    set +e
    handle_failure 41 999
    actual_status=$?
    set -e
    self_test_assert_equal "$expected_status" "$actual_status" 'hibakezelő státusz'
}

self_test_rollback_case() {
    local name=$1
    local failure=$2
    local expected_status=$3

    reset_self_test_state
    ACTIVATION_STARTED=1
    STACK_START_ATTEMPTED=1
    SELF_TEST_FAILURE=$failure
    self_test_handle_failure "$expected_status"
    self_test_assert_equal 1 "$SELF_TEST_DIAGNOSTIC_CALLS" "${name}: diagnosztika hívásszám"
    self_test_assert_equal 1 "$SELF_TEST_STACK_STOP_CALLS" "${name}: stackleállítás hívásszám"
    self_test_assert_equal 1 "$SELF_TEST_CHECKOUT_CALLS" "${name}: checkout hívásszám"
    self_test_assert_equal 1 "$SELF_TEST_ENV_CALLS" "${name}: env hívásszám"

    set +e
    handle_failure 42 1000
    set -e
    self_test_assert_equal 1 "$SELF_TEST_DIAGNOSTIC_CALLS" "${name}: második handler diagnosztika"
    self_test_assert_equal 1 "$SELF_TEST_STACK_STOP_CALLS" "${name}: második handler stack"
    self_test_assert_equal 1 "$SELF_TEST_CHECKOUT_CALLS" "${name}: második handler checkout"
    self_test_assert_equal 1 "$SELF_TEST_ENV_CALLS" "${name}: második handler env"
    log "SELF-TEST OK: ${name}"
}

run_self_test_err_trap_child() {
    SELF_TEST_MODE=1
    reset_self_test_state
    ACTIVATION_STARTED=1
    STACK_START_ATTEMPTED=1
    SELF_TEST_FAILURE='stack'
    SELF_TEST_REAL_ERR_CHILD=1

    set -E
    trap 'on_error "$?" "$LINENO"' ERR
    false
    fail 'SELF-TEST: a valódi ERR trap próba nem állította le az alfolyamatot'
}

self_test_real_err_trap() {
    local output
    local status
    local activation_count
    local rollback_failure_count
    local counter_summary_count

    set +e
    output=$(bash "${BASH_SOURCE[0]}" --self-test-err-trap-child 2>&1)
    status=$?
    set -e

    activation_count=$(grep -Fc 'Aktiválás utáni hiba történt; rollback indul.' <<<"$output" || true)
    rollback_failure_count=$(grep -Fc 'ROLLBACK SIKERTELEN; kézi helyreállítás szükséges.' <<<"$output" || true)
    counter_summary_count=$(grep -Fc \
        'SELF-TEST ERR COUNTS diagnostics=1 stack=1 checkout=1 env=1 state=failed' \
        <<<"$output" || true)

    self_test_assert_equal 70 "$status" 'valódi ERR trap alfolyamat kilépési kódja'
    self_test_assert_equal 1 "$activation_count" 'valódi ERR trap aktiválás utáni hibajelzése'
    self_test_assert_equal 1 "$rollback_failure_count" 'valódi ERR trap rollback eredménye'
    self_test_assert_equal 1 "$counter_summary_count" 'valódi ERR trap egyszeri rollback műveletei'
    log 'SELF-TEST OK: valódi ERR trap és egyszeri rollback hibázó segédművelet mellett'
}

run_self_tests() {
    local volume_delete_option='--volumes'
    local destructive_git_first='reset'
    local destructive_git_second='clean'

    SELF_TEST_MODE=1

    reset_self_test_state
    self_test_assert_equal 0 "$SELF_TEST_STACK_STOP_CALLS" 'sikeres migráció és stack ne indítson rollbacket'
    log 'SELF-TEST OK: sikeres migráció és sikeres stackindítás'

    reset_self_test_state
    CANDIDATE_DIR='/tmp/mock-candidate'
    self_test_handle_failure 41
    self_test_assert_equal 0 "$SELF_TEST_CHECKOUT_CALLS" 'aktiválás előtti migrációs hiba ne indítson rollbacket'
    log 'SELF-TEST OK: migrációs hiba checkoutcsere előtt'

    self_test_rollback_case 'migrációs hiba aktiválás után' '' 41
    self_test_rollback_case 'backend unhealthy' '' 41
    self_test_rollback_case 'diagnosztikai parancs hibája' diagnostics 41
    self_test_rollback_case 'stackleállítás hibája' stack 70
    self_test_rollback_case 'checkout-visszaállítás hibája' checkout 70
    self_test_rollback_case 'env-visszaállítás hibája' env 70
    self_test_rollback_case 'második handler reentrancy guard' '' 41
    self_test_real_err_trap

    if grep -Eq "docker[[:space:]]+volume|down([^[:alnum:]]|\$).*(${volume_delete_option}|[[:space:]]-v)" \
        "${BASH_SOURCE[0]}"; then
        fail 'SELF-TEST: a script tiltott automatikus volume-törlést tartalmaz'
    fi
    if grep -Eq "git[[:space:]]+(${destructive_git_first}|${destructive_git_second})" \
        "${BASH_SOURCE[0]}"; then
        fail 'SELF-TEST: a script tiltott destruktív Git-műveletet tartalmaz'
    fi
    log 'SELF-TEST OK: nincs volume-törlés vagy destruktív Git-művelet'
    log 'Minden deployment mockteszt sikeres.'
}

main() {
    trap 'on_error "$?" "$LINENO"' ERR
    trap 'on_signal 130 "$LINENO"' INT
    trap 'on_signal 143 "$LINENO"' TERM

    check_preconditions
    initialize_paths
    log "Jóváhagyott release SHA: ${RELEASE_SHA}"
    create_candidate_checkout
    create_temporary_env
    validate_and_pull_images
    log 'Minden aktiválás előtti ellenőrzés sikeres.'

    activate_candidate
    start_and_verify_stack

    trap - ERR EXIT INT TERM
    log 'A kontrollált telepítés sikeres.'
    log "Előző checkout: ${PREVIOUS_DIR}"
    log "Production env backup: ${ENV_BACKUP}"
}

if [[ "${1:-}" == '--self-test' ]]; then
    [[ "$#" -eq 1 ]] || fail 'A --self-test nem fogad további argumentumot.'
    run_self_tests
elif [[ "${1:-}" == '--self-test-err-trap-child' ]]; then
    [[ "$#" -eq 1 ]] || fail 'A belső ERR trap self-test nem fogad további argumentumot.'
    run_self_test_err_trap_child
else
    configure_release "$@"
    main
fi
