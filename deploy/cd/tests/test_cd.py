"""Izolált fixture-ek; nem kapcsolódnak szerverhez, GitHubhoz vagy adatbázishoz."""

import copy
import hashlib
import hmac
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

MODULE = Path(__file__).resolve().parents[1] / "btphoto_cd.py"
SPEC = importlib.util.spec_from_file_location("btphoto_cd", MODULE)
cd = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cd)


def request(environment="staging", branch="staging"):
    return {"version": 1, "environment": environment, "sha": "a" * 40, "branch": branch,
            "quality_run_id": 10, "run_id": 20, "run_attempt": 1, "issued_at": 1000,
            "digests": {c: "sha256:" + "b" * 64 for c in cd.COMPONENTS},
            "credentials": {"DB_PASSWORD": "ci-dummy-runtime", "MIGRATIONS_PASSWORD": "ci-dummy-migration",
                            "BTPHOTO_REGISTRATION_ENABLED": "false", "BTPHOTO_RECAPTCHA_SITE_KEY": "",
                            "BTPHOTO_RECAPTCHA_SECRET": "", "BTPHOTO_RECAPTCHA_HOSTNAMES": ""}}


def container_fixture(environment, name):
    expected = cd.compose_document(environment, request(environment), "/release")["services"][name]
    cfg = cd.CONFIG[environment]
    value = {"Config": {"User": expected["user"], "Image": expected["image"]},
             "HostConfig": {"ReadonlyRootfs": True, "Privileged": False, "CapDrop": ["ALL"],
                            "CapAdd": ["CAP_" + c for c in expected.get("cap_add", [])],
                            "SecurityOpt": ["no-new-privileges:true"], "Tmpfs": {"/tmp": expected["tmpfs"][0].split(":", 1)[1]},
                            "RestartPolicy": {"Name": expected["restart"]},
                            "LogConfig": {"Type": "json-file", "Config": {"max-size": "5m", "max-file": "2"}},
                            "Memory": int(expected["mem_limit"][:-1]) * 1048576,
                            "PidsLimit": 128, "NanoCpus": int(expected["cpus"] * 1_000_000_000),
                            "PortBindings": {"8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": str(cfg["port"])}]}
                            if name == "caddy" else {}},
             "State": {"Status": "exited" if name == "migrations" else "running", "ExitCode": 0,
                       "Health": {"Status": "healthy"}},
             "Mounts": [{"Type": "bind", "Source": m["source"], "Destination": m["target"], "RW": not m["read_only"]}
                        for m in expected.get("volumes", [])],
             "NetworkSettings": {"Networks": {"btphoto-ingress-" + environment if n == "ingress" else cfg["project"] + "_" + n: {}
                                              for n in expected["networks"]}}}
    return expected, value


class RequestTests(unittest.TestCase):
    def test_valid_environments(self):
        cd.validate_request(request(), now=1000)
        cd.validate_request(request("production", "main"), now=1000)

    def test_invalid_protocol_values(self):
        cases = [("sha", "latest"), ("sha", "A" * 40), ("branch", "feature/x"), ("environment", "../production"),
                 ("run_id", True), ("issued_at", 1), ("digests", {}), ("version", 2)]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                body = request()
                body[key] = value
                with self.assertRaises(cd.DeploymentError):
                    cd.validate_request(body, now=1000)

    def test_production_rejects_staging_branch(self):
        with self.assertRaises(cd.DeploymentError):
            cd.validate_request(request("production"), now=1000)

    def test_credential_injection_rejected(self):
        for value in ("first\nDB_HOST=evil", "first\rsecond", "a\0b"):
            body = request()
            body["credentials"]["DB_PASSWORD"] = value
            with self.assertRaises(cd.DeploymentError):
                cd.validate_request(body, now=1000)

    def test_captcha_is_environment_bound(self):
        body = request()
        body["credentials"].update(BTPHOTO_REGISTRATION_ENABLED="true", BTPHOTO_RECAPTCHA_SITE_KEY="dummy",
                                   BTPHOTO_RECAPTCHA_SECRET="dummy", BTPHOTO_RECAPTCHA_HOSTNAMES="btphoto.hu")
        with self.assertRaises(cd.DeploymentError):
            cd.validate_request(body, now=1000)
        body["credentials"]["BTPHOTO_RECAPTCHA_HOSTNAMES"] = "staging.btphoto.hu"
        cd.validate_request(body, now=1000)

    def test_signature_and_tampering(self):
        body = request()
        key = "c" * 64
        signature = hmac.new(bytes.fromhex(key), cd.canonical(body), hashlib.sha256).hexdigest()
        cd.verify_signature(body, signature, key)
        body["environment"] = "production"
        with self.assertRaises(cd.DeploymentError):
            cd.verify_signature(body, signature, key)
        with self.assertRaises(cd.DeploymentError):
            cd.verify_signature(request(), signature, "d" * 64)

    def test_duplicate_json_and_env_fields(self):
        with self.assertRaises(cd.DeploymentError):
            json.loads('{"sha":1,"sha":2}', object_pairs_hook=cd.strict_object)
        with self.assertRaises(cd.DeploymentError):
            cd.raw_env({"PASSWORD\nOTHER": "dummy"})

    def test_raw_env_preserves_metacharacters(self):
        value = 'ci-dummy-${NOT_EXPANDED}-"quote"-\'quote\'-\\-#=x'
        self.assertEqual(cd.raw_env({"DB_PASSWORD": value}), ("DB_PASSWORD=" + value + "\n").encode())


class ContractTests(unittest.TestCase):
    def test_eight_runtime_fixtures(self):
        for environment in cd.CONFIG:
            for service in cd.SERVICES:
                with self.subTest(environment=environment, service=service):
                    expected, container = container_fixture(environment, service)
                    cd.verify_container(container, service, expected, environment)

    def test_runtime_rejects_security_mutations(self):
        mutations = [lambda c: c["HostConfig"].update(Privileged=True),
                     lambda c: c["HostConfig"].update(ReadonlyRootfs=False),
                     lambda c: c["HostConfig"].update(CapAdd=["CAP_SYS_ADMIN"]),
                     lambda c: c["HostConfig"].update(CapDrop=[]),
                     lambda c: c["HostConfig"].update(SecurityOpt=[]),
                     lambda c: c["HostConfig"].update(SecurityOpt=["no-new-privileges:true", "seccomp=unconfined"]),
                     lambda c: c["HostConfig"].update(RestartPolicy={"Name": "always"}),
                     lambda c: c["HostConfig"].update(Memory=0),
                     lambda c: c["HostConfig"].update(LogConfig={"Type": "none", "Config": {}}),
                     lambda c: c["HostConfig"].update(Tmpfs={"/tmp": "rw,size=64m"}),
                     lambda c: c["HostConfig"].update(PortBindings={"8080/tcp": [{"HostIp": "0.0.0.0", "HostPort": "8080"}]}),
                     lambda c: c["Mounts"][1].update(Source="/srv/btphoto/media/avatars"),
                     lambda c: c["Mounts"][0].update(RW=True),
                     lambda c: c["Mounts"].append({"Type": "volume"}),
                     lambda c: c["NetworkSettings"]["Networks"].update({"btphoto_application": {}}),
                     lambda c: c["Config"].update(User="0:0"),
                     lambda c: c["State"].update(Status="exited")]
        for number, mutate in enumerate(mutations):
            with self.subTest(number=number):
                expected, container = container_fixture("staging", "backend")
                mutate(container)
                with self.assertRaises(cd.DeploymentError):
                    cd.verify_container(container, "backend", expected, "staging")

    def test_failed_migration_rejected(self):
        expected, container = container_fixture("staging", "migrations")
        container["State"]["ExitCode"] = 1
        with self.assertRaises(cd.DeploymentError):
            cd.verify_container(container, "migrations", expected, "staging")

    def test_legacy_binds_representation_is_not_an_extra_mount(self):
        expected, container = container_fixture("staging", "backend")
        container["HostConfig"]["Binds"] = [m["source"] + ":" + m["target"] + (":ro" if m["read_only"] else ":rw")
                                            for m in expected["volumes"]]
        cd.verify_container(container, "backend", expected, "staging")

    def test_capability_duplicates_and_format(self):
        for values in (["NET_BIND_SERVICE", "CAP_NET_BIND_SERVICE"], ["CAP_"], [1], ["SYS-ADMIN"]):
            with self.assertRaises(cd.DeploymentError):
                cd.normalize_caps(values)

    def test_promotion_requires_same_sha_and_digests(self):
        body = request("production", "main")
        receipt = {"sha": body["sha"], "digests": body["digests"], "account_contract": "tenant-v1"}
        cd.verify_promotion(body, receipt)
        for key, value in (("sha", "b" * 40), ("digests", {}), ("account_contract", "legacy")):
            with self.assertRaises(cd.DeploymentError):
                cd.verify_promotion(body, {**receipt, key: value})

    def test_schema_and_legacy_rollback_gate(self):
        body = request()
        previous = {"sha": "b" * 40, "schema": "c" * 64, "account_contract": "tenant-v1"}
        cd.rollback_compatible(previous, "c" * 64, body, {})
        with self.assertRaises(cd.DeploymentError):
            cd.rollback_compatible(previous, "d" * 64, body, {})
        cd.rollback_compatible(previous, "d" * 64, body, {"rollback_pairs": [{"from": body["sha"], "to": previous["sha"]}]})
        with self.assertRaises(cd.DeploymentError):
            cd.rollback_compatible({**previous, "account_contract": "legacy"}, "c" * 64, body, {})

    def test_env_mount_and_proxy_contract(self):
        for environment in cd.CONFIG:
            document = cd.compose_document(environment, request(environment), "/release")
            self.assertNotIn("DB_PASSWORD", document["services"]["backend"]["environment"])
            self.assertEqual(document["services"]["backend"]["env_file"][0]["format"], "raw")
            self.assertEqual(document["services"]["migrations"]["networks"], {"application": {}})
            config = cd.gateway_config(environment)
            self.assertIn(cd.CONFIG[environment]["edge"] + "/32", config)
            self.assertNotIn("private_ranges", config)
            self.assertIn("X-BTPhoto-Client-IP {client_ip}", config)


class OriginTests(unittest.TestCase):
    def fixture(self, production=False):
        body = request("production" if production else "staging", "main" if production else "staging")
        repo = {"full_name": cd.REPOSITORY}
        quality = {"path": ".github/workflows/quality-ci.yml", "event": "push", "conclusion": "success",
                   "head_sha": body["sha"], "head_branch": body["branch"], "head_repository": repo}
        run = {"path": cd.WORKFLOW, "event": "workflow_run", "head_branch": "main", "run_attempt": 1,
               "status": "in_progress", "head_repository": repo}
        environment = {"id": 42, "deployment_branch_policy": {"protected_branches": False, "custom_branch_policies": True},
                       "protection_rules": [{"type": "required_reviewers", "reviewers": [{"id": 1}]}]}
        values = {"/actions/runs/10": quality, "/actions/runs/20": run,
                  "/actions/runs/20/approvals": [{"state": "approved", "user": {"type": "User"},
                                                 "environments": [{"id": 42, "name": "production"}]}],
                  "/branches/" + body["branch"]: {"commit": {"sha": body["sha"]}},
                  "/environments/" + body["environment"]: environment,
                  "/environments/" + body["environment"] + "/deployment-branch-policies": {"branch_policies": [{"name": "main", "type": "branch"}]}}
        names = ["Production deployment contract check", "Kiadási manifest"]
        names += [f"Pull request image build ({c})" for c in cd.COMPONENTS]
        names += [f"Publish release image ({c})" for c in cd.COMPONENTS]
        jobs = [{"name": name, "conclusion": "success"} for name in names]
        jobs[1]["steps"] = [{"name": f"Release origin 10 {body['branch']} {body['sha']}", "conclusion": "success"}]
        jobs += [{"name": "Kiadás / Deploy " + body["environment"], "status": "in_progress", "runner_name": "allowed"}]
        api = Mock()
        api.get.side_effect = lambda resource: values[resource]
        api.jobs.return_value = jobs
        return body, values, api

    def test_valid_origin(self):
        for production in (False, True):
            body, _, api = self.fixture(production)
            cd.verify_origin(body, api, {"runner": "allowed"})

    def test_rejects_untrusted_origin_and_missing_gate(self):
        for resource, key, value in (("/actions/runs/10", "event", "pull_request"),
                                     ("/actions/runs/10", "head_sha", "b" * 40),
                                     ("/actions/runs/20", "path", "evil.yml"),
                                     ("/actions/runs/20", "run_attempt", 2)):
            body, values, api = self.fixture()
            values[resource][key] = value
            with self.assertRaises(cd.DeploymentError):
                cd.verify_origin(body, api, {"runner": "allowed"})
        body, _, api = self.fixture()
        api.jobs.return_value.pop(0)
        with self.assertRaises(cd.DeploymentError):
            cd.verify_origin(body, api, {"runner": "allowed"})

    def test_missing_reviewer_and_wrong_runner(self):
        body, values, api = self.fixture(True)
        values["/environments/production"]["protection_rules"] = []
        with self.assertRaises(cd.DeploymentError):
            cd.verify_origin(body, api, {"runner": "allowed"})
        body, _, api = self.fixture()
        with self.assertRaises(cd.DeploymentError):
            cd.verify_origin(body, api, {"runner": "other"})

    def test_production_review_history_not_only_configuration(self):
        for history in ([], [{"state": "approved", "user": {"type": "Bot"}, "environments": [{"id": 42, "name": "production"}]}]):
            body, values, api = self.fixture(True)
            values["/actions/runs/20/approvals"] = history
            with self.assertRaises(cd.DeploymentError):
                cd.verify_origin(body, api, {"runner": "allowed"})

    def test_release_must_bind_exact_upstream_quality_run(self):
        body, _, api = self.fixture()
        api.jobs.return_value[1]["steps"][0]["name"] = "Release origin 999 staging " + body["sha"]
        with self.assertRaises(cd.DeploymentError):
            cd.verify_origin(body, api, {"runner": "allowed"})


class RollbackTests(unittest.TestCase):
    def engine(self):
        engine = cd.Engine(request(), {"enabled": True})
        engine.previous = {"directory": "/old", "sha": "b" * 40}
        engine.preflight = Mock()
        engine.prepare = Mock()
        engine.diagnostics = Mock()
        engine.compose = Mock()
        engine.verify_runtime = Mock()
        engine.smoke = Mock()
        return engine

    @patch.object(cd, "atomic_write")
    @patch.object(cd.signal, "signal")
    def test_real_deploy_failure_rollback_once(self, _signal, _write):
        engine = self.engine()
        failure = cd.DeploymentError("eredeti hiba", 47)
        def compose(directory, *args):
            if str(directory) != "/old" and args[0] == "up":
                raise failure
        engine.compose.side_effect = compose
        with self.assertRaisesRegex(cd.DeploymentError, "eredeti hiba") as caught:
            engine.deploy()
        self.assertEqual(caught.exception.status, 47)
        engine.diagnostics.assert_called_once()
        self.assertEqual(sum(str(c.args[0]) != "/old" and c.args[1] == "down" for c in engine.compose.call_args_list), 1)
        self.assertEqual(sum(str(c.args[0]) == "/old" and c.args[1] == "up" for c in engine.compose.call_args_list), 1)
        engine.smoke.assert_called_once()
        self.assertFalse(engine.rollback())
        engine.diagnostics.assert_called_once()

    @patch.object(cd, "atomic_write")
    @patch.object(cd.signal, "signal")
    def test_rollback_error_preserves_original(self, _signal, _write):
        engine = self.engine()
        engine.diagnostics.side_effect = RuntimeError("diagnosztika")
        engine.compose.side_effect = cd.DeploymentError("eredeti hiba")
        with self.assertRaisesRegex(cd.DeploymentError, "eredeti hiba"):
            engine.deploy()
        engine.diagnostics.assert_called_once()
        self.assertTrue(engine.rollback_started)

    def test_preflight_failure_does_not_rollback(self):
        engine = self.engine()
        engine.preflight.side_effect = cd.DeploymentError("preflight")
        with self.assertRaises(cd.DeploymentError):
            engine.deploy()
        engine.compose.assert_not_called()
        engine.diagnostics.assert_not_called()


if __name__ == "__main__":
    unittest.main()
