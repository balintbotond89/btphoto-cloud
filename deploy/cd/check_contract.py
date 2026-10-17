"""GitHub-hosted, kizárólag dummy értékű Compose/Caddy contract ellenőrzés."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import uuid

import btphoto_cd as cd


def main():
    body = {"sha": "a" * 40, "digests": {c: "sha256:" + "b" * 64 for c in cd.COMPONENTS}}
    value = 'ci-dummy-${NOT_EXPANDED}-"quote"-\'quote\'-\\-#=x'
    with tempfile.TemporaryDirectory(prefix="btphoto-cd-contract-") as temporary:
        root = Path(temporary)
        for environment in cd.CONFIG:
            directory = root / environment
            directory.mkdir()
            document = cd.compose_document(environment, body, directory)
            (directory / "compose.json").write_text(json.dumps(document), encoding="utf-8")
            (directory / ".env.backend").write_bytes(cd.raw_env({"DB_PASSWORD": value}))
            (directory / ".env.migrations").write_bytes(cd.raw_env({"FLYWAY_PASSWORD": value}))
            caddyfile = directory / "Caddyfile"
            caddyfile.write_text(cd.gateway_config(environment), encoding="utf-8")
            callbacks = directory / "callbacks"
            callbacks.mkdir()
            (callbacks / "afterMigrate.sql").write_text(cd.migration_callback(cd.CONFIG[environment]["user"]))
            config = subprocess.check_output(["docker", "compose", "--env-file", "/dev/null", "-f",
                                               str(directory / "compose.json"), "config", "--format", "json"])
            resolved = json.loads(config)
            # A config kimenet újraolvasható Compose-ként dollárjelet duplázhat;
            # a tényleges konténerbeli értéket külön raw-env probe igazolja.
            for service, key in (("backend", "DB_PASSWORD"), ("migrations", "FLYWAY_PASSWORD")):
                assert resolved["services"][service]["environment"][key] in (value, value.replace('$', '$$'))
            assert "MIGRATIONS_PASSWORD" not in resolved["services"]["backend"]["environment"]
            assert resolved["services"]["caddy"]["ports"][0]["host_ip"] == "127.0.0.1"
            validate_caddy(caddyfile)
        probe = {"services": {"probe": {"image": cd.CADDY, "network_mode": "none", "read_only": True,
                 "cap_drop": ["ALL"], "security_opt": ["no-new-privileges:true"], "user": "65534:65534",
                 "mem_limit": "64m", "pids_limit": 32,
                 "env_file": [{"path": str(directory / '.env.backend'), "format": "raw"}]}}}
        probe_file = root / 'probe.json'
        probe_file.write_text(json.dumps(probe))
        actual = subprocess.check_output(['docker', 'compose', '--project-name', 'btphoto-cd-raw-' + uuid.uuid4().hex[:12],
                   '--env-file', '/dev/null', '-f', str(probe_file), 'run', '--rm', '--no-deps',
                   '--pull', os.environ.get('BTPHOTO_CONTRACT_PULL', 'missing'), '--entrypoint', '/bin/sh',
                   'probe', '-c', 'printf %s "$DB_PASSWORD"']).decode()
        assert actual == value, 'A raw env tényleges runtime értéke eltér.'
        # A hash csak CI-dummy jelszóhoz tartozik, nem production hitelesítő.
        password_hash = subprocess.check_output(["docker", "run", "--rm", "--network", "none", "--read-only",
                           "--pull", os.environ.get("BTPHOTO_CONTRACT_PULL", "missing"),
                           "--tmpfs", "/tmp", "--entrypoint", "caddy", cd.CADDY,
                           "hash-password", "--plaintext", "ci-dummy-only"]).decode().strip()
        edge = Path(__file__).with_name("edge.Caddyfile").resolve()
        validate_caddy(edge, ["--env", "STAGING_BASIC_AUTH_USERNAME=ci", "--env", "STAGING_BASIC_AUTH_HASH=" + password_hash])
    print("CD Compose raw-env és három Caddyfile natív validálás: sikeres.")


def validate_caddy(path, extra=None):
    subprocess.run(["docker", "run", "--rm", "--network", "none", "--read-only", "--tmpfs", "/tmp",
                    "--pull", os.environ.get("BTPHOTO_CONTRACT_PULL", "missing"),
                    "--entrypoint", "caddy", "--volume", str(path) + ":/etc/caddy/Caddyfile:ro",
                    *(extra or []), cd.CADDY, "validate", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"], check=True)


if __name__ == "__main__":
    main()
