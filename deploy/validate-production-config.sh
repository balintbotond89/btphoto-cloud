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
backend_image=''
frontend_image=''
backend_count=0
frontend_count=0

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
    esac
done

if [ "$backend_count" -ne 1 ] || [ "$frontend_count" -ne 1 ]; then
    fail "a backend es frontend feloldott image-neve nem egyertelmu"
fi

backend_tag=${backend_image#"$backend_prefix"}
frontend_tag=${frontend_image#"$frontend_prefix"}

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

if [ "$backend_tag" != "$frontend_tag" ]; then
    fail "a backend es frontend image tagje nem azonos commit SHA"
fi

echo "A production konfiguracio ervenyes; az alkalmazas image-ek kozos commit SHA-ja: $backend_tag"
