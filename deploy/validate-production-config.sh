#!/bin/sh

set -eu

usage() {
    echo "Hasznalat: $0 <production-env-fajl>" >&2
}

fail() {
    echo "Hiba: $1" >&2
    exit 1
}

if [ "$#" -ne 1 ]; then
    usage
    exit 2
fi

env_file=$1

if [ ! -f "$env_file" ]; then
    fail "a megadott production env-fajl nem letezik vagy nem szabalyos fajl"
fi

if ! command -v docker >/dev/null 2>&1; then
    fail "a docker parancs nem erheto el"
fi

if ! docker compose version >/dev/null 2>&1; then
    fail "a Docker Compose plugin nem erheto el"
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
compose_file="$script_dir/compose.production.yml"

if ! docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    config --quiet; then
    fail "a production Compose-konfiguracio ervenytelen"
fi

if ! resolved_images=$(docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    config --images); then
    fail "a feloldott Compose image-nevek nem kerdezhetok le"
fi

backend_prefix='ghcr.io/balintbotond89/btphoto-backend:'
frontend_prefix='ghcr.io/balintbotond89/btphoto-frontend:'
migrations_prefix='ghcr.io/balintbotond89/btphoto-migrations:'
backend_image=''
frontend_image=''
migrations_image=''
backend_count=0
frontend_count=0
migrations_count=0

for image in $resolved_images; do
    case "$image" in
        "$backend_prefix"*)
            backend_image=$image
            backend_count=$((backend_count + 1))
            ;;
        "$frontend_prefix"*)
            frontend_image=$image
            frontend_count=$((frontend_count + 1))
            ;;
        "$migrations_prefix"*)
            migrations_image=$image
            migrations_count=$((migrations_count + 1))
            ;;
    esac
done

if [ "$backend_count" -ne 1 ] || [ "$frontend_count" -ne 1 ] || [ "$migrations_count" -ne 1 ]; then
    fail "a backend, frontend es migrations feloldott image-neve nem egyertelmu"
fi

backend_tag=${backend_image#"$backend_prefix"}
frontend_tag=${frontend_image#"$frontend_prefix"}
migrations_tag=${migrations_image#"$migrations_prefix"}

validate_sha() {
    component=$1
    tag=$2

    if [ "${#tag}" -ne 40 ]; then
        fail "a $component image tagje nem pontosan 40 karakteres Git SHA"
    fi

    case "$tag" in
        *[!0-9a-f]*)
            fail "a $component image tagje nem kizarolag kisbetus hexadecimalis Git SHA"
            ;;
    esac
}

validate_sha backend "$backend_tag"
validate_sha frontend "$frontend_tag"
validate_sha migrations "$migrations_tag"

if [ "$backend_tag" != "$frontend_tag" ] || [ "$backend_tag" != "$migrations_tag" ]; then
    fail "a backend, frontend es migrations image tagje nem azonos commit SHA"
fi

resolved_config=$(mktemp)
chmod 0600 "$resolved_config"
bind_reference=''
trap 'rm -f "$resolved_config"; if [ -n "$bind_reference" ]; then rm -f "$bind_reference"; fi' EXIT HUP INT TERM
bind_reference=$(mktemp)
chmod 0600 "$bind_reference"

if ! docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    config --format json >"$resolved_config"; then
    fail "a feloldott Compose-konfiguracio nem kerdezheto le"
fi

# A Compose-verziók másként hagyják ki a JSON logikai alapértékeit.
# Ugyanazon parser explicit false referenciája nélkül nincs implicit elfogadás.
if ! docker compose \
    --project-name btphoto-bind-contract \
    --env-file "$env_file" \
    -f - config --format json >"$bind_reference" <<'YAML'
services:
  bind-contract:
    image: btphoto-preflight-probe:unused
    volumes:
      - type: bind
        source: /srv/btphoto/media/avatars
        target: /srv/btphoto/avatars
        bind:
          create_host_path: false
YAML
then
    fail "a Compose bind false referenciaja nem kerdezheto le"
fi

if ! python3 - "$resolved_config" "$bind_reference" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    config = json.load(config_file)
with open(sys.argv[2], encoding="utf-8") as reference_file:
    reference = json.load(reference_file)

services = config.get("services", {})
backend = services.get("backend")
migrations = services.get("migrations")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


require(isinstance(backend, dict), "a backend szolgaltatas hianyzik")
require(isinstance(migrations, dict), "a migrations szolgaltatas hianyzik")

depends_on = backend.get("depends_on") or {}
migration_dependency = depends_on.get("migrations") or {}
require(
    migration_dependency.get("condition") == "service_completed_successfully",
    "a backend nem varja meg a migrations sikeres befejezeset",
)

require(migrations.get("user") == "10001:10001", "a migrations user nem a rogzitett nem root user")
require(migrations.get("read_only") is True, "a migrations root fajlrendszere nem read-only")
require(migrations.get("restart") in ("no", "none"), "a migrations restart policy nem pontosan tiltott")
require(migrations.get("cap_drop") == ["ALL"], "a migrations cap_drop nem pontosan ALL")
require(not migrations.get("cap_add"), "a migrations nem kaphat hozzaadott capabilityt")
require(
    "no-new-privileges:true" in (migrations.get("security_opt") or []),
    "a migrations no-new-privileges vedelme hianyzik",
)
require(not migrations.get("ports"), "a migrations nem publikalhat hostportot")

networks = migrations.get("networks") or {}
network_names = set(networks if isinstance(networks, list) else networks.keys())
require(network_names == {"application"}, "a migrations csak az application halozathoz csatlakozhat")

tmpfs = migrations.get("tmpfs") or []
require(len(tmpfs) == 1, "a migrations pontosan egy tmpfs mountot kaphat")
tmpfs_entry = str(tmpfs[0])
require(tmpfs_entry.startswith("/tmp:"), "a migrations tmpfs celutvonala nem /tmp")
tmpfs_options = set(tmpfs_entry.split(":", 1)[1].split(","))
require(
    {"rw", "noexec", "nosuid", "nodev", "size=32m"}.issubset(tmpfs_options),
    "a migrations tmpfs kotelezo opcioi hianyoznak",
)

volumes = migrations.get("volumes") or []
require(len(volumes) == 1, "a migrations mountkeszlete nem pontosan egy CA bind mount")
ca_mount = volumes[0]
require(ca_mount.get("type") == "bind", "a migrations CA mountja nem bind")
require(ca_mount.get("source") == "/etc/btphoto/certs/ca.crt", "a migrations CA forrasa elter")
require(
    ca_mount.get("target") == "/run/secrets/btphoto/cockroach-ca.crt",
    "a migrations CA celutvonala elter",
)
require(ca_mount.get("read_only") is True, "a migrations CA mountja nem read-only")

environment = migrations.get("environment") or {}
url = str(environment.get("FLYWAY_URL", ""))
require("sslmode=verify-full" in url, "a migrations TLS modja nem verify-full")
require(
    "sslrootcert=/run/secrets/btphoto/cockroach-ca.crt" in url,
    "a migrations CA utvonala nem rogzitett",
)
require(environment.get("FLYWAY_LOCATIONS") == "filesystem:/flyway/sql", "a migrations location elter")

backend_environment = backend.get("environment") or {}
require(backend_environment.get("BTPHOTO_REGISTRATION_ENABLED") in ("true", "false"),
        "a regisztracios gate csak true vagy false lehet")
if backend_environment.get("BTPHOTO_REGISTRATION_ENABLED") == "true":
    for key in ("BTPHOTO_RECAPTCHA_SITE_KEY", "BTPHOTO_RECAPTCHA_SECRET", "BTPHOTO_RECAPTCHA_HOSTNAMES"):
        require(isinstance(backend_environment.get(key), str) and backend_environment[key].strip(),
                "az engedelyezett regisztracio CAPTCHA-konfiguracioja hianyos")
require(backend_environment.get("BTPHOTO_TRUSTED_GATEWAY") == "caddy",
        "a backend csak a caddy halozati identitasat bizhatja meg")
require(backend_environment.get("BTPHOTO_AVATAR_ROOT") == "/srv/btphoto/avatars",
        "az avatar kontenerutvonala elter")
backend_mounts = backend.get("volumes") or []
require(len(backend_mounts) == 2, "a backend pontosan CA es avatar bind mountot kaphat")
by_target = {mount.get("target"): mount for mount in backend_mounts}
require(set(by_target) == {"/run/secrets/btphoto/cockroach-ca.crt", "/srv/btphoto/avatars"},
        "a backend mount celutvonalai elternek")
backend_ca = by_target["/run/secrets/btphoto/cockroach-ca.crt"]
require(backend_ca.get("type") == "bind" and backend_ca.get("source") == "/etc/btphoto/certs/ca.crt"
        and backend_ca.get("read_only") is True, "a backend CA mountja nem read-only vagy elter")
avatar = by_target["/srv/btphoto/avatars"]
require(avatar.get("type") == "bind" and avatar.get("source") == "/srv/btphoto/media/avatars"
        and not avatar.get("read_only"), "az avatar mount nem a rogzitett irhato NFS-alkonyvtar")
# Régi Compose: bind={}, újabb: bind={create_host_path: false}.
# Az újabb verzióban az üres bind true értéket is jelenthet: csak a mért false alak jó.
reference_mounts = reference.get("services", {}).get("bind-contract", {}).get("volumes") or []
require(len(reference_mounts) == 1, "a Compose bind referencia mountkeszlete elter")
reference_bind = reference_mounts[0].get("bind")
require(isinstance(reference_bind, dict) and (
    not reference_bind or (set(reference_bind) == {"create_host_path"}
                           and reference_bind["create_host_path"] is False)),
        "a Compose explicit false bind abrazolasa nem tamogatott")
avatar_bind = avatar.get("bind")
require(isinstance(avatar_bind, dict) and set(avatar_bind) == set(reference_bind)
        and ("create_host_path" not in avatar_bind or avatar_bind["create_host_path"] is False),
        "az avatar hostkonyvtarat Docker nem hozhatja letre automatikusan")
require(backend.get("read_only") is True and backend.get("cap_drop") == ["ALL"]
        and not backend.get("cap_add"), "a backend runtime vedelme elter")
PY
then
    fail "a production Compose biztonsagi szerzodese ervenytelen"
fi

echo "A production konfiguracio ervenyes; a harom sajat image kozos commit SHA-ja: $backend_tag"
