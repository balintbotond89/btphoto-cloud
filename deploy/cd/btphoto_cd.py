#!/usr/bin/env python3
"""Szűk, előre telepített CD-belépési pont; nem futtat checkoutból root kódot."""

import copy
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import signal
import socket
import stat
import subprocess
import sys
import time
import urllib.request
import uuid

REPOSITORY = "balintbotond89/btphoto-cloud"
SOURCE = "https://github.com/" + REPOSITORY
WORKFLOW = ".github/workflows/production-image-build.yml"
SHA = re.compile(r"[0-9a-f]{40}\Z")
DIGEST = re.compile(r"sha256:[0-9a-f]{64}\Z")
SCHEMA = re.compile(r"[0-9a-f]{64}\Z")
COMPONENTS = ("backend", "frontend", "migrations")
SERVICES = (*COMPONENTS, "caddy")
CADDY = "caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f"
CA = "/etc/btphoto/certs/ca.crt"
CA_TARGET = "/run/secrets/btphoto/cockroach-ca.crt"
POLICY = Path("/etc/btphoto-cd/policy.json")
ROOT = Path("/opt/btphoto-cd")
STATE = Path("/var/lib/btphoto-cd")
CONFIG = {
    "staging": {"project": "btphoto-staging", "port": 8081, "db": "btphoto_staging",
                "user": "btphoto_staging_app", "migrator": "btphoto_staging_migrator",
                "avatars": "/srv/btphoto/media/staging/avatars", "subnet": "172.30.11.0/28",
                "edge": "172.30.11.2", "gateway": "172.30.11.3"},
    "production": {"project": "btphoto", "port": 8080, "db": "btphoto",
                   "user": "btphoto_runtime", "migrator": "btphoto_migrator",
                   "avatars": "/srv/btphoto/media/avatars", "subnet": "172.30.10.0/28",
                   "edge": "172.30.10.2", "gateway": "172.30.10.3"},
}
CREDENTIAL_KEYS = {"DB_PASSWORD", "MIGRATIONS_PASSWORD", "BTPHOTO_REGISTRATION_ENABLED",
                   "BTPHOTO_RECAPTCHA_SITE_KEY", "BTPHOTO_RECAPTCHA_SECRET", "BTPHOTO_RECAPTCHA_HOSTNAMES"}


class DeploymentError(Exception):
    """Kizárólag előre meghatározott, secretmentes hibaüzenet."""

    def __init__(self, message, status=1):
        super().__init__(message)
        self.status = status if type(status) is int and 1 <= status <= 255 else 1


def require(condition, message):
    if not condition:
        raise DeploymentError(message)


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplikált JSON-kulcs.")
        result[key] = value
    return result


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def validate_request(body, now=None):
    require(isinstance(body, dict) and set(body) == {
        "version", "environment", "sha", "branch", "quality_run_id", "run_id", "run_attempt",
        "digests", "credentials", "issued_at"}, "Hibás kérésmezők.")
    require(type(body["version"]) is int and body["version"] == 1 and body["environment"] in CONFIG, "Ismeretlen környezet/protokoll.")
    require(isinstance(body["sha"], str) and SHA.fullmatch(body["sha"]), "Hibás release SHA.")
    require(body["branch"] in ("main", "staging"), "Nem engedélyezett kiadási ág.")
    require(body["environment"] != "production" or body["branch"] == "main", "Production csak main kiadás lehet.")
    for key in ("quality_run_id", "run_id", "run_attempt", "issued_at"):
        require(type(body[key]) is int and body[key] > 0, "Hibás futásazonosító/idő.")
    require(abs((time.time() if now is None else now) - body["issued_at"]) < 300, "Lejárt telepítési kérés.")
    require(isinstance(body["digests"], dict) and set(body["digests"]) == set(COMPONENTS), "Hiányos image-készlet.")
    require(all(isinstance(x, str) and DIGEST.fullmatch(x) for x in body["digests"].values()), "Hibás image digest.")
    credentials = body["credentials"]
    require(isinstance(credentials, dict) and set(credentials) == CREDENTIAL_KEYS, "Hibás credential-mezők.")
    require(all(isinstance(x, str) and len(x) <= 8192 and not any(c in x for c in "\r\n\0")
                for x in credentials.values()), "Tiltott credential-formátum.")
    require(credentials["DB_PASSWORD"] and credentials["MIGRATIONS_PASSWORD"], "Hiányzó DB-secret.")
    require(credentials["BTPHOTO_REGISTRATION_ENABLED"] in ("true", "false"), "Hibás regisztrációs kapu.")
    if credentials["BTPHOTO_REGISTRATION_ENABLED"] == "true":
        require(all(credentials[k].strip() for k in CREDENTIAL_KEYS if k.startswith("BTPHOTO_RECAPTCHA_")),
                "Hiányos CAPTCHA-konfiguráció.")
        allowed = {"staging.btphoto.hu"} if body["environment"] == "staging" else {"btphoto.hu", "www.btphoto.hu"}
        hosts = set(credentials["BTPHOTO_RECAPTCHA_HOSTNAMES"].split(","))
        require(bool(hosts) and hosts <= allowed, "A CAPTCHA hostname más környezethez tartozik.")


def verify_signature(body, signature, key):
    require(isinstance(signature, str) and SCHEMA.fullmatch(signature), "Hibás kérésaláírás.")
    require(isinstance(key, str) and SCHEMA.fullmatch(key), "Hiányzó root kéréskulcs.")
    expected = hmac.new(bytes.fromhex(key), canonical(body), hashlib.sha256).hexdigest()
    require(hmac.compare_digest(signature, expected), "Érvénytelen kérésaláírás.")


class GitHub:
    def __init__(self, token):
        require(isinstance(token, str) and 20 <= len(token) <= 512 and "\n" not in token, "Hiányzó API-hitelesítés.")
        self.token = token

    def get(self, resource):
        require(resource.startswith("/") and ".." not in resource, "Hibás API-útvonal.")
        request = urllib.request.Request("https://api.github.com/repos/" + REPOSITORY + resource,
                                         headers={"Authorization": "Bearer " + self.token,
                                                  "Accept": "application/vnd.github+json",
                                                  "User-Agent": "btphoto-controlled-cd"})
        # Az API-átirányítást nem követjük, credential más hostra nem kerülhet.
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
                data = response.read(2_000_001)
            require(len(data) <= 2_000_000, "Túl nagy API-válasz.")
            return json.loads(data, object_pairs_hook=strict_object)
        except DeploymentError:
            raise
        except Exception:
            raise DeploymentError("A GitHub ellenőrzés nem hajtható végre.") from None

    def jobs(self, run_id):
        result = []
        for page in range(1, 21):
            jobs = self.get(f"/actions/runs/{run_id}/jobs?per_page=100&page={page}")["jobs"]
            result.extend(jobs)
            if len(jobs) < 100:
                return result
        raise DeploymentError("Túl sok workflow-job.")


def verify_origin(body, api, policy):
    quality = api.get(f"/actions/runs/{body['quality_run_id']}")
    require(quality.get("path") == ".github/workflows/quality-ci.yml" and quality.get("event") == "push"
            and quality.get("conclusion") == "success" and quality.get("head_sha") == body["sha"]
            and quality.get("head_branch") == body["branch"]
            and (quality.get("head_repository") or {}).get("full_name") == REPOSITORY,
            "Nem igazolt quality eredet.")
    require(api.get(f"/branches/{body['branch']}")["commit"]["sha"] == body["sha"], "Elavult kiadási kérés.")
    run = api.get(f"/actions/runs/{body['run_id']}")
    require(run.get("path") == WORKFLOW and run.get("event") == "workflow_run"
            and run.get("head_branch") == "main" and run.get("run_attempt") == body["run_attempt"]
            and run.get("status") == "in_progress"
            and (run.get("head_repository") or {}).get("full_name") == REPOSITORY,
            "Nem megbízható CD-workflow.")
    jobs = api.jobs(body["run_id"])
    required = {"Production deployment contract check", "Kiadási manifest"}
    required |= {f"Pull request image build ({c})" for c in COMPONENTS}
    required |= {f"Publish release image ({c})" for c in COMPONENTS}
    succeeded = {j["name"] for j in jobs if j.get("conclusion") == "success"}
    require(required <= succeeded, "Hiányzó kiadási kapu.")
    manifests = [j for j in jobs if j.get("name") == "Kiadási manifest" and j.get("conclusion") == "success"]
    origin = f"Release origin {body['quality_run_id']} {body['branch']} {body['sha']}"
    require(len(manifests) == 1 and any(s.get("name") == origin and s.get("conclusion") == "success"
                                       for s in manifests[0].get("steps", [])), "Eltérő kiadás/upstream futáskapcsolat.")
    active = [j for j in jobs if j.get("name", "").endswith("Deploy " + body["environment"])
              and j.get("status") == "in_progress" and j.get("runner_name") == policy["runner"]]
    require(len(active) == 1, "Nem a kijelölt deploy runner/job fut.")
    environment = api.get("/environments/" + body["environment"])
    require(environment.get("deployment_branch_policy") == {"protected_branches": False, "custom_branch_policies": True},
            "Hiányzó environment branch-védelem.")
    rules = api.get("/environments/" + body["environment"] + "/deployment-branch-policies")["branch_policies"]
    require(len(rules) == 1 and rules[0].get("name") == "main" and rules[0].get("type", "branch") == "branch",
            "Az environment csak a main workflow-refet fogadhatja.")
    if body["environment"] == "production":
        require(any(r.get("type") == "required_reviewers" and r.get("reviewers")
                    for r in environment.get("protection_rules", [])), "Hiányzó production reviewer-kapu.")
        history = api.get(f"/actions/runs/{body['run_id']}/approvals")
        reviews = [review for review in history if any(e.get("id") == environment.get("id")
                   and e.get("name") == "production" for e in review.get("environments", []))]
        require(any(r.get("state") == "approved" and (r.get("user") or {}).get("type") == "User" for r in reviews)
                and not any(r.get("state") == "rejected" for r in reviews),
                "A production futás kézi jóváhagyása nincs igazolva.")


def image_reference(component, body):
    return f"ghcr.io/balintbotond89/btphoto-{component}:{body['sha']}@{body['digests'][component]}"


def gateway_config(environment):
    edge = CONFIG[environment]["edge"]
    return """{
    admin off
    auto_https off
    servers {
        trusted_proxies static %s/32
        trusted_proxies_strict
    }
}
:8080 {
    route {
        respond /_gateway/health "UP" 200
        reverse_proxy /api/* backend:8080 {
            header_up X-BTPhoto-Client-IP {client_ip}
        }
        reverse_proxy frontend:8080
    }
    header {
        -Server
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy no-referrer
    }
}
""" % edge


def migration_callback(runtime_user):
    require(re.fullmatch(r"[a-z_]+", runtime_user), "Hibás runtime SQL-identitás.")
    return ("-- Csak az elkészült üzleti táblák írhatók; a migrációs history nem.\n"
            "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_user, public.system_admin,\n"
            "public.photographer_workspace, public.photographer_profile, public.photographer_business\n"
            f"TO {runtime_user};\n"
            f"REVOKE ALL ON TABLE public.flyway_schema_history FROM {runtime_user};\n"
            f"GRANT SELECT ON TABLE public.flyway_schema_history TO {runtime_user};\n")


def compose_document(environment, body, directory, database=None):
    cfg = CONFIG[environment]
    database = database or {"db_host": "db.invalid", "db_port": 26257}
    host, port = database["db_host"], database["db_port"]
    require(isinstance(host, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]{0,252}", host)
            and type(port) is int and 1 <= port <= 65535, "Hibás root DB-végpont policy.")
    directory = str(directory)
    tls_url = f"jdbc:postgresql://{host}:{port}/{cfg['db']}?sslmode=verify-full&sslrootcert={CA_TARGET}"
    ca = {"type": "bind", "source": CA, "target": CA_TARGET, "read_only": True,
          "bind": {"create_host_path": False}}

    def service(name, networks, memory, tmpfs, cpus):
        return {"image": CADDY if name == "caddy" else image_reference(name, body), "pull_policy": "never",
                "user": "65534:65534" if name == "caddy" else "10001:10001",
                "networks": {n: {} for n in networks}, "read_only": True, "cap_drop": ["ALL"],
                "security_opt": ["no-new-privileges:true"], "tmpfs": [f"/tmp:rw,noexec,nosuid,nodev,size={tmpfs}m"],
                "logging": {"driver": "json-file", "options": {"max-size": "5m", "max-file": "2"}},
                "mem_limit": memory, "cpus": cpus, "pids_limit": 128, "restart": "unless-stopped"}

    backend = service("backend", ["application"], "768m", 64, 1.5)
    backend.update({"environment": {"SPRING_PROFILES_ACTIVE": "cockroachdb", "DB_HOST": host,
                    "DB_PORT": str(port), "DB_NAME": cfg["db"], "DB_USERNAME": cfg["user"], "DB_SSL_ROOT_CERT": CA_TARGET,
                    "BTPHOTO_TRUSTED_GATEWAY": "caddy", "BTPHOTO_AVATAR_ROOT": "/srv/btphoto/avatars"},
                    "env_file": [{"path": directory + "/.env.backend", "format": "raw"}],
                    "volumes": [copy.deepcopy(ca), {"type": "bind", "source": cfg["avatars"],
                    "target": "/srv/btphoto/avatars", "read_only": False, "bind": {"create_host_path": False}}],
                    "depends_on": {"migrations": {"condition": "service_completed_successfully"}},
                    "healthcheck": {"test": ["CMD", "java", "-cp", "/app/healthcheck", "HealthCheck",
                                             "http://127.0.0.1:8080/api/health"],
                                    "interval": "10s", "timeout": "5s", "start_period": "30s", "retries": 12}})
    migrations = service("migrations", ["application"], "384m", 32, 1.0)
    migrations.update({"restart": "no", "command": ["migrate"], "volumes": [copy.deepcopy(ca),
                       {"type": "bind", "source": directory + "/callbacks", "target": "/flyway/callbacks",
                        "read_only": True, "bind": {"create_host_path": False}}],
                       "environment": {"FLYWAY_URL": tls_url, "FLYWAY_USER": cfg["migrator"],
                                       "FLYWAY_LOCATIONS": "filesystem:/flyway/sql,filesystem:/flyway/callbacks", "FLYWAY_CONNECT_RETRIES": "10"},
                       "env_file": [{"path": directory + "/.env.migrations", "format": "raw"}]})
    frontend = service("frontend", ["web"], "96m", 16, 0.5)
    caddy = service("caddy", ["web", "application", "ingress"], "96m", 16, 0.5)
    for item, endpoint in ((frontend, "/health"), (caddy, "/_gateway/health")):
        item["cap_add"] = ["NET_BIND_SERVICE"]
        item["environment"] = {"XDG_CONFIG_HOME": "/tmp/caddy-config", "XDG_DATA_HOME": "/tmp/caddy-data"}
        item["healthcheck"] = {"test": ["CMD-SHELL", f"wget -q --spider http://127.0.0.1:8080{endpoint} || exit 1"],
                               "interval": "5s", "timeout": "3s", "start_period": "5s", "retries": 12}
    caddy.update({"ports": [f"127.0.0.1:{cfg['port']}:8080"],
                  "volumes": [{"type": "bind", "source": directory + "/Caddyfile", "target": "/etc/caddy/Caddyfile",
                               "read_only": True, "bind": {"create_host_path": False}}],
                  "depends_on": {s: {"condition": "service_healthy"} for s in ("backend", "frontend")}})
    caddy["networks"]["ingress"] = {"ipv4_address": cfg["gateway"], "aliases": [environment + "-gateway"]}
    return {"name": cfg["project"], "services": {"migrations": migrations, "backend": backend,
            "frontend": frontend, "caddy": caddy}, "networks": {"web": {"internal": True}, "application": {},
            "ingress": {"external": True, "name": "btphoto-ingress-" + environment}}}


def normalize_caps(values):
    require(isinstance(values, list), "Hibás capability-reprezentáció.")
    normalized = []
    for value in values:
        require(isinstance(value, str) and re.fullmatch(r"[A-Za-z_]+", value), "Hibás capability.")
        name = value.upper().removeprefix("CAP_")
        require(re.fullmatch(r"[A-Z]+(?:_[A-Z]+)*", name), "Üres/hibás capability-név.")
        normalized.append(name)
    require(len(set(normalized)) == len(normalized), "Duplikált capability.")
    return set(normalized)


def verify_container(container, service, expected, environment):
    cfg = CONFIG[environment]
    host = container["HostConfig"]
    state = container["State"]
    require(container["Config"]["Image"] == expected["image"], "Eltérő runtime image.")
    require(container["Config"]["User"] == expected["user"], "Eltérő runtime user.")
    require(host.get("ReadonlyRootfs") is True and host.get("Privileged") is False, "Hibás runtime root-védelem.")
    require(normalize_caps(host.get("CapDrop") or []) == {"ALL"}, "Hiányzó cap_drop ALL.")
    require(normalize_caps(host.get("CapAdd") or []) == set(expected.get("cap_add", [])), "Eltérő capability-készlet.")
    require(host.get("SecurityOpt") in (["no-new-privileges"], ["no-new-privileges:true"]),
            "Eltérő security-opt vagy hiányzó no-new-privileges.")
    require((host.get("RestartPolicy") or {}).get("Name") == expected["restart"], "Eltérő restart policy.")
    # A Binds/Mounts API-reprezentáció Engine/Compose-függő; alább a tényleges Mounts az engedélylista alapja.
    require(not host.get("Devices") and host.get("NetworkMode") != "host"
            and host.get("PidMode", "") == "" and not host.get("VolumesFrom"), "Tiltott runtime host-hozzáférés.")
    mem = int(expected["mem_limit"][:-1]) * 1024 * 1024
    require(host.get("Memory") == mem and host.get("PidsLimit") == 128
            and host.get("NanoCpus") == int(expected["cpus"] * 1_000_000_000), "Hibás erőforráskeret.")
    require(host.get("LogConfig") == {"Type": "json-file", "Config": {"max-size": "5m", "max-file": "2"}},
            "Eltérő naplózási keret.")
    actual_mounts = [m for m in container.get("Mounts", []) if m["Type"] != "tmpfs"]
    mounts = expected.get("volumes", [])
    require(len(actual_mounts) == len(mounts), "Váratlan mount.")
    for mount in mounts:
        matches = [m for m in actual_mounts if m["Destination"] == mount["target"]]
        require(len(matches) == 1 and matches[0]["Type"] == "bind" and matches[0]["Source"] == mount["source"]
                and matches[0]["RW"] is not mount["read_only"], "Hibás bind mount.")
    tmpfs = host.get("Tmpfs") or {}
    require(set(tmpfs) == {"/tmp"}, "Hibás tmpfs-cél.")
    options = set(tmpfs["/tmp"].split(","))
    size = expected["tmpfs"][0].split("size=", 1)[1][:-1]
    require({"rw", "noexec", "nosuid", "nodev"} <= options
            and any(x in options for x in (f"size={size}m", f"size={size}MiB", f"size={int(size)*1048576}")),
            "Hibás tmpfs-opció/méret.")
    networks = {"btphoto-ingress-" + environment if n == "ingress" else cfg["project"] + "_" + n
                for n in expected["networks"]}
    require(set(container["NetworkSettings"]["Networks"]) == networks, "Váratlan runtime hálózat.")
    ports = host.get("PortBindings") or {}
    require(ports == ({"8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": str(cfg["port"])}]}
                      if service == "caddy" else {}), "Váratlan publikált port.")
    if service == "migrations":
        require(state["Status"] == "exited" and state["ExitCode"] == 0, "Sikertelen migráció.")
    else:
        require(state["Status"] == "running" and (state.get("Health") or {}).get("Status") == "healthy",
                "Nem egészséges runtime szolgáltatás.")


def verify_nfs_mount(path, command):
    # Automount mellett ugyanahhoz a célhoz autofs és nfs4 sor is tartozhat.
    filesystem = command(["findmnt", "-n", "-T", str(path), "-t", "nfs,nfs4", "--first-only", "-o", "FSTYPE"]).strip()
    require(filesystem in (b"nfs", b"nfs4"), "Az avatar tároló nem NFS.")


def private_path(path, file_mode=None):
    path = Path(path)
    for part in (path, *path.parents):
        info = part.lstat()
        require(not stat.S_ISLNK(info.st_mode) and info.st_uid == 0 and info.st_mode & 0o022 == 0,
                "Nem megbízható root útvonal.")
    if file_mode is not None:
        require(path.is_file() and stat.S_IMODE(path.stat().st_mode) == file_mode, "Hibás root fájlmód.")


def atomic_write(path, data, mode=0o600):
    path = Path(path)
    private_path(path.parent)
    require(not path.is_symlink(), "Symlink célfájl.")
    temporary = path.parent / (".pending-" + uuid.uuid4().hex)
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(descriptor, "wb") as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def raw_env(values):
    require(all(re.fullmatch(r"[A-Z_]+", k) and isinstance(v, str) and not any(c in v for c in "\r\n\0")
                for k, v in values.items()), "Nem írható raw env.")
    return "".join(k + "=" + v + "\n" for k, v in sorted(values.items())).encode()


def rollback_compatible(previous, candidate_schema, body, policy):
    if not previous:
        return
    require(previous.get("account_contract") == "tenant-v1", "Legacy admin-szerepű rollbackcél tiltott.")
    if previous["schema"] != candidate_schema:
        pair = {"from": body["sha"], "to": previous["sha"]}
        require(pair in policy.get("rollback_pairs", []), "A sémaváltozás rollback-kompatibilitása nincs jóváhagyva.")


def verify_promotion(body, staging):
    require(staging and staging.get("sha") == body["sha"] and staging.get("digests") == body["digests"]
            and staging.get("account_contract") == "tenant-v1", "Hiányzó/eltérő staging receipt.")


class Engine:
    def __init__(self, body, policy, authorize=lambda: None, staging_policy=None):
        self.body = body
        self.environment = body["environment"]
        self.cfg = CONFIG[self.environment]
        self.policy = policy
        self.authorize = authorize
        self.staging_policy = staging_policy
        self.previous = None
        self.rollback_started = False
        self.directory = ROOT / self.environment / "releases" / (body["sha"] + "-" + uuid.uuid4().hex)
        self.state_dir = STATE / self.environment
        self.schema = None

    def command(self, arguments, timeout=240):
        try:
            result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
                                    check=False, env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "HOME": "/root",
                                                      "LANG": "C.UTF-8"})
        except subprocess.TimeoutExpired:
            raise DeploymentError("A szerverművelet túllépte az időkeretet.", 124) from None
        except Exception:
            raise DeploymentError("A szerverművelet nem hajtható végre.") from None
        if result.returncode != 0:
            status = result.returncode if result.returncode > 0 else 128 - result.returncode
            raise DeploymentError("A szerverművelet sikertelen; root diagnosztika szükséges.", status)
        return result.stdout

    def compose(self, directory, *args):
        return self.command(["docker", "compose", "--project-name", self.cfg["project"],
                             "--project-directory", str(directory), "--env-file", "/dev/null",
                             "-f", str(Path(directory) / "compose.json"), *args])

    def read_state(self, environment):
        path = STATE / environment / "current.json"
        if not path.exists():
            return None
        private_path(path, 0o600)
        value = json.loads(path.read_bytes(), object_pairs_hook=strict_object)
        directory = Path(value["directory"])
        require(directory.parent == ROOT / environment / "releases", "Hibás korábbi release-útvonal.")
        private_path(directory)
        require(SHA.fullmatch(value.get("sha", "")) and SCHEMA.fullmatch(value.get("schema", "")), "Hibás receipt.")
        require(set(value.get("digests", {})) == set(COMPONENTS)
                and all(DIGEST.fullmatch(d) for d in value["digests"].values()), "Hibás receipt digest.")
        return value

    def containers(self):
        ids = self.command(["docker", "ps", "--all", "--quiet", "--filter",
                            "label=com.docker.compose.project=" + self.cfg["project"]]).decode().split()
        if not ids:
            return []
        require(len(ids) == 4, "Ismeretlen/hiányos Compose stack; automatikus átvétel tiltott.")
        return json.loads(self.command(["docker", "inspect", *ids]))

    def verify_runtime(self, directory, body):
        document = compose_document(self.environment, body, directory, self.policy)
        containers = self.containers()
        require(len(containers) == 4, "Hiányos futó stack.")
        by_service = {}
        for container in containers:
            labels = container["Config"]["Labels"]
            service = labels.get("com.docker.compose.service")
            require(labels.get("com.docker.compose.project") == self.cfg["project"]
                    and service in SERVICES and service not in by_service, "Ismeretlen konténeridentitás.")
            by_service[service] = container
        require(set(by_service) == set(SERVICES), "Hiányos szolgáltatáskészlet.")
        for service in SERVICES:
            verify_container(by_service[service], service, document["services"][service], self.environment)

    def preflight(self):
        require(self.policy.get("enabled") is True, "A környezet CD-je még nincs engedélyezve.")
        for path in (ROOT / self.environment / "releases", self.state_dir):
            private_path(path)
        private_path(Path(CA), 0o644)
        require(Path(self.cfg["avatars"]).is_dir(), "Hiányzó avatar könyvtár.")
        avatar_path = Path(self.cfg["avatars"])
        require(avatar_path.resolve() == avatar_path, "Az avatar mount útvonala symlinket tartalmaz.")
        verify_nfs_mount(avatar_path, self.command)
        network = json.loads(self.command(["docker", "network", "inspect", "btphoto-ingress-" + self.environment]))[0]
        require(network.get("Driver") == "bridge" and network.get("Internal") is True
                and [x.get("Subnet") for x in network["IPAM"]["Config"]] == [self.cfg["subnet"]],
                "Hibás edge hálózat.")
        self.previous = self.read_state(self.environment)
        containers = self.containers()
        if containers:
            require(self.previous is not None, "A futó stack nem CD-kezelt; külön, ellenőrzött átvétel szükséges.")
            self.verify_runtime(self.previous["directory"], self.previous)
        else:
            require(self.previous is None, "A korábbi stack nem fut; kézi állapotellenőrzés szükséges.")
            try:
                with socket.socket() as listener:
                    listener.bind(("127.0.0.1", self.cfg["port"]))
            except OSError:
                raise DeploymentError("A célportot ismeretlen folyamat foglalja.") from None
        if self.environment == "production":
            self.verify_staging()
        free = os.statvfs(ROOT)
        require(free.f_bavail * free.f_frsize >= 5 * 1024**3, "Nincs 5 GiB szabad hely.")
        replay = self.state_dir / f"request-{self.body['run_id']}-{self.body['run_attempt']}"
        require(not replay.exists(), "Ez a telepítési kérés már fel lett használva.")

    def verify_staging(self):
        receipt = self.read_state("staging")
        verify_promotion(self.body, receipt)
        require(self.staging_policy and self.staging_policy.get("enabled") is True, "A staging policy nem aktív.")
        probe = Engine({**self.body, "environment": "staging"}, self.staging_policy)
        probe.verify_runtime(receipt["directory"], receipt)
        probe.smoke()

    def prepare(self):
        schemas = set()
        for component in COMPONENTS:
            image = image_reference(component, self.body)
            self.command(["docker", "pull", image], timeout=600)
            config = json.loads(self.command(["docker", "image", "inspect", image]))[0]["Config"]
            labels = config.get("Labels") or {}
            require(labels.get("org.opencontainers.image.revision") == self.body["sha"]
                    and labels.get("org.opencontainers.image.source") == SOURCE, "Eltérő OCI eredet.")
            schema = labels.get("hu.btphoto.schema-sha256", "")
            require(isinstance(schema, str) and SCHEMA.fullmatch(schema), "Hiányzó séma-ujjlenyomat.")
            schemas.add(schema)
            if component == "backend":
                require(labels.get("hu.btphoto.account-contract") == "tenant-v1", "Hibás tenant-contract.")
        require(len(schemas) == 1, "Eltérő image séma-ujjlenyomat.")
        self.schema = schemas.pop()
        rollback_compatible(self.previous, self.schema, self.body, self.policy)
        self.command(["docker", "pull", CADDY], timeout=600)
        self.directory.mkdir(mode=0o700)
        document = compose_document(self.environment, self.body, self.directory, self.policy)
        atomic_write(self.directory / "compose.json", canonical(document))
        atomic_write(self.directory / "Caddyfile", gateway_config(self.environment).encode(), 0o644)
        # A nem root migrációs konténernek a callback könyvtárát is be kell tudnia járni.
        (self.directory / "callbacks").mkdir(mode=0o755)
        atomic_write(self.directory / "callbacks" / "afterMigrate.sql", migration_callback(self.cfg["user"]).encode(), 0o644)
        credentials = self.body["credentials"]
        atomic_write(self.directory / ".env.backend", raw_env({k: v for k, v in credentials.items() if k != "MIGRATIONS_PASSWORD"}))
        atomic_write(self.directory / ".env.migrations", raw_env({"FLYWAY_PASSWORD": credentials["MIGRATIONS_PASSWORD"]}))
        self.compose(self.directory, "config", "--quiet")

    def smoke(self):
        for endpoint in ("/_gateway/health", "/api/health", "/"):
            value = self.command(["curl", "--fail", "--silent", "--max-time", "10",
                                  f"http://127.0.0.1:{self.cfg['port']}{endpoint}"])
            if endpoint == "/_gateway/health":
                require(value.strip() == b"UP", "Hibás gateway smoke válasz.")
            elif endpoint == "/api/health":
                require(json.loads(value).get("status") == "UP", "Hibás backend smoke válasz.")
            else:
                require(b"<html" in value.lower(), "Hibás frontend smoke válasz.")

    def diagnostics(self):
        # Nyers inspect/env nem kerül a naplóba. Legfeljebb 200 sor szolgáltatásonként.
        secrets = [v for k, v in self.body["credentials"].items() if v and k.endswith(("PASSWORD", "SECRET"))]
        lines = ["release=" + self.body["sha"] + " utc=" + str(int(time.time()))]
        for service in SERVICES:
            try:
                output = self.compose(self.directory, "logs", "--no-color", "--tail", "200", service).decode(errors="replace")
                for secret in secrets:
                    output = output.replace(secret, "[REDACTED]")
                output = re.sub(r"(?i)(password|secret|token|authorization)\s*[:=]\s*\S+", r"\1=[REDACTED]", output)
                lines.extend(line[:4096] for line in output.splitlines()[-200:])
            except Exception:
                lines.append(service + ": diagnosztika nem elérhető")
        atomic_write(self.directory / "rollback.log", "\n".join(lines).encode())

    def rollback(self):
        if self.rollback_started:
            return False
        self.rollback_started = True
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        success = True
        try:
            self.diagnostics()
        except Exception:
            pass
        try:
            self.compose(self.directory, "down", "--remove-orphans")
        except Exception:
            success = False
        if self.previous:
            try:
                self.compose(self.previous["directory"], "up", "--detach", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "180")
                self.verify_runtime(self.previous["directory"], self.previous)
                self.smoke()
                atomic_write(self.state_dir / "current.json", canonical(self.previous))
            except Exception:
                success = False
        else:
            try:
                current = self.state_dir / "current.json"
                if current.exists():
                    os.replace(current, self.directory / "failed-receipt.json")
            except Exception:
                success = False
        print("[BTPhoto CD] ROLLBACK " + ("SIKERES" if success else "SIKERTELEN; kézi ellenőrzés szükséges"), flush=True)
        return success

    def deploy(self):
        self.preflight()
        self.prepare()
        self.authorize()
        atomic_write(self.state_dir / f"request-{self.body['run_id']}-{self.body['run_attempt']}", b"accepted\n")
        if self.environment == "production":
            self.verify_staging()
        if self.previous:
            self.verify_runtime(self.previous["directory"], self.previous)
        try:
            if self.previous:
                self.compose(self.previous["directory"], "down", "--remove-orphans")
            self.compose(self.directory, "up", "--detach", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "180")
            self.verify_runtime(self.directory, self.body)
            self.smoke()
            receipt = {k: copy.deepcopy(self.body[k]) for k in ("sha", "digests", "branch", "run_id", "run_attempt")}
            receipt.update({"directory": str(self.directory), "schema": self.schema, "account_contract": "tenant-v1",
                            "verified_at": int(time.time())})
            atomic_write(self.state_dir / "current.json", canonical(receipt))
        except BaseException:
            self.rollback()
            raise
        print("[BTPhoto CD] A kontrollált telepítés sikeres: " + self.environment + " " + self.body["sha"], flush=True)


def main():
    require(len(sys.argv) == 1 and os.geteuid() == 0, "Csak a telepített, argumentum nélküli root belépési pont használható.")
    import resource
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    os.umask(0o077)
    private_path(POLICY, 0o600)
    policies = json.loads(POLICY.read_bytes(), object_pairs_hook=strict_object)
    def input_timeout(*_):
        raise DeploymentError("A CD-kérés olvasása túllépte az időkeretet.")
    signal.signal(signal.SIGALRM, input_timeout)
    signal.alarm(15)
    data = sys.stdin.buffer.read(131073)
    signal.alarm(0)
    require(len(data) <= 131072, "Túl nagy CD-kérés.")
    envelope = json.loads(data, object_pairs_hook=strict_object)
    require(set(envelope) == {"body", "signature", "github_token"}, "Hibás CD-boríték.")
    body = envelope["body"]
    validate_request(body)
    policy = policies[body["environment"]]
    require(policy.get("enabled") is True, "A CD még nincs engedélyezve.")
    key_file = Path("/etc/btphoto-cd/" + body["environment"] + ".request-key")
    private_path(key_file, 0o600)
    verify_signature(body, envelope["signature"], key_file.read_text().strip())
    api = GitHub(envelope["github_token"])
    verify_origin(body, api, policy)
    for root in (ROOT, STATE):
        private_path(root)
    import fcntl
    descriptor = os.open("/run/lock/btphoto-controlled-deploy.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "a") as lock:
        info = os.fstat(lock.fileno())
        require(info.st_uid == 0 and stat.S_ISREG(info.st_mode) and info.st_mode & 0o022 == 0, "Hibás lock tulajdonos/mód.")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise DeploymentError("Másik telepítés folyamatban van.") from None
        def interrupted(number, *_):
            raise DeploymentError("A telepítést jelzés szakította meg.", 128 + number)
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
        Engine(body, policy, lambda: verify_origin(body, api, policy), policies["staging"]).deploy()


if __name__ == "__main__":
    try:
        main()
    except DeploymentError as error:
        print("[BTPhoto CD] HIBA: " + str(error), file=sys.stderr)
        sys.exit(error.status)
    except BaseException:
        # Kivétel vagy HTTP-/subprocess-kimenet secretet tartalmazhat; traceback nem adható ki.
        print("[BTPhoto CD] HIBA: megszakadt művelet; root ellenőrzés szükséges.", file=sys.stderr)
        sys.exit(1)
