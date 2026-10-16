#!/usr/bin/env bash
# Kizárólag az eldobható, címkézett GitHub-hosted CockroachDB-fixture-ben futhat.
set -Eeuo pipefail
[[ "${GITHUB_ACTIONS:-}" == true && "${BTPHOTO_TEST_FIXTURE:-}" == ephemeral-cockroach26 ]]
[[ "$#" -eq 3 && "$1" == "btphoto-crdb-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}" ]]
database=$1
image=$2
network=$3
[[ "$network" == "$database" ]]
[[ "$(docker inspect --format '{{index .Config.Labels "hu.btphoto.fixture"}}' "$database")" == ephemeral-cockroach26 ]]

sql() {
    local user=$1
    shift
    docker exec "$database" cockroach sql --insecure --host=127.0.0.1:26257 --user="$user" --format=csv --execute "$*"
}

sql root 'CREATE USER btphoto_staging_migrator; CREATE USER btphoto_staging_app;'
docker exec -i "$database" cockroach sql --insecure --host=127.0.0.1:26257 --set=errexit=true \
    < deploy/cd/provision-staging.sql

# Az egyszeri migrációs konténer csak az eldobható fixture hálózatát és üres CI-jelszót kapja.
callback_dir=$(mktemp -d)
temporary=$(mktemp)
trap 'rm -f "$temporary"; rm -rf "$callback_dir"' EXIT
python3 -B - "$callback_dir" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, 'deploy/cd')
from btphoto_cd import migration_callback
root = Path(sys.argv[1])
root.chmod(0o755)
path = root / 'afterMigrate.sql'
path.write_text(migration_callback('btphoto_staging_app'))
path.chmod(0o644)
PY
docker run --rm --network "$network" --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,nodev,size=32m --cap-drop ALL \
    --security-opt no-new-privileges:true --user 10001:10001 \
    --env HOME=/tmp --env FLYWAY_PASSWORD= --env FLYWAY_USER=btphoto_staging_migrator \
    --env FLYWAY_LOCATIONS=filesystem:/flyway/sql,filesystem:/flyway/callbacks \
    --volume "${callback_dir}:/flyway/callbacks:ro" \
    --env "FLYWAY_URL=jdbc:postgresql://${database}:26257/btphoto_staging?sslmode=disable" \
    "$image"

sql btphoto_staging_app 'SELECT count(*) FROM btphoto_staging.public.admin_user;'
sql btphoto_staging_app 'BEGIN; INSERT INTO btphoto_staging.public.admin_user (id, username, password_hash, active, approval_status) VALUES (gen_random_uuid(), '\''ci-isolation'\'', '\''not-a-real-hash'\'', false, '\''PENDING'\''); ROLLBACK;'

denied() {
    local user=$1 statement=$2
    if sql "$user" "$statement" >"$temporary" 2>&1; then
        echo '::error::Tiltott keresztkörnyezeti vagy DDL-hozzáférés sikerült.' >&2
        exit 1
    fi
    # Kapcsolati hiba nem helyettesítheti az ellenőrzött permission denied választ.
    grep -Eq 'SQLSTATE: 42501|insufficient privilege|does not have.*privilege|permission denied' "$temporary"
}
denied btphoto_staging_app 'SELECT 1 FROM btphoto.public.admin_user LIMIT 0;'
denied btphoto_staging_migrator 'SELECT 1 FROM btphoto.public.admin_user LIMIT 0;'
denied btphoto_app 'SELECT 1 FROM btphoto_staging.public.admin_user LIMIT 0;'
denied btphoto_staging_app 'CREATE TABLE btphoto_staging.public.must_not_exist (id INT PRIMARY KEY);'
denied btphoto_staging_app 'DELETE FROM btphoto_staging.public.flyway_schema_history WHERE false;'
echo 'Staging runtime DML, tiltott DDL és kétirányú adatbázis-elkülönítés: sikeres.'
