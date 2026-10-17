"""A tényleges preflight Python-kapujának Compose JSON-regressziói, Docker nélkül."""

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


VALIDATOR = Path(__file__).resolve().parents[2] / "validate-production-config.sh"
CODE = VALIDATOR.read_text(encoding="utf-8").split("<<'PY'\n", 1)[1].split("\nPY\n", 1)[0]
CA = {"type": "bind", "source": "/etc/btphoto/certs/ca.crt",
      "target": "/run/secrets/btphoto/cockroach-ca.crt", "read_only": True}


def fixture(bind):
    return {"services": {
        "migrations": {
            "user": "10001:10001", "read_only": True, "restart": "no", "cap_drop": ["ALL"],
            "security_opt": ["no-new-privileges:true"], "networks": {"application": {}},
            "tmpfs": ["/tmp:rw,noexec,nosuid,nodev,size=32m"], "volumes": [copy.deepcopy(CA)],
            "environment": {"FLYWAY_URL": "jdbc:postgresql://dummy/db?sslmode=verify-full&"
                            "sslrootcert=/run/secrets/btphoto/cockroach-ca.crt",
                            "FLYWAY_LOCATIONS": "filesystem:/flyway/sql"}},
        "backend": {
            "depends_on": {"migrations": {"condition": "service_completed_successfully"}},
            "read_only": True, "cap_drop": ["ALL"],
            "environment": {"BTPHOTO_REGISTRATION_ENABLED": "false", "BTPHOTO_TRUSTED_GATEWAY": "caddy",
                            "BTPHOTO_AVATAR_ROOT": "/srv/btphoto/avatars"},
            "volumes": [copy.deepcopy(CA), {"type": "bind", "source": "/srv/btphoto/media/avatars",
                        "target": "/srv/btphoto/avatars", "bind": bind}]}}}


class PreflightTests(unittest.TestCase):
    def run_validator(self, config, reference_bind):
        reference = {"services": {"bind-contract": {"volumes": [{"bind": reference_bind}]}}}
        with tempfile.TemporaryDirectory() as temporary:
            paths = [Path(temporary) / name for name in ("config.json", "reference.json")]
            for path, value in zip(paths, (config, reference)):
                path.write_text(json.dumps(value), encoding="utf-8")
            return subprocess.run([sys.executable, "-I", "-c", CODE, *map(str, paths)],
                                  capture_output=True, text=True, encoding="utf-8", check=False)

    def test_legacy_omitted_false_is_accepted_with_same_parser_reference(self):
        self.assertEqual(self.run_validator(fixture({}), {}).returncode, 0)

    def test_explicit_false_is_accepted_with_same_parser_reference(self):
        self.assertEqual(self.run_validator(fixture({"create_host_path": False}),
                                           {"create_host_path": False}).returncode, 0)

    def test_modern_omitted_true_is_not_treated_as_legacy_false(self):
        self.assertNotEqual(self.run_validator(fixture({}), {"create_host_path": False}).returncode, 0)

    def test_true_and_non_boolean_flags_are_rejected_in_both_formats(self):
        for reference in ({}, {"create_host_path": False}):
            for value in (True, None, 0, 1, "false", "true", [], {}):
                with self.subTest(reference=reference, value=value):
                    result = self.run_validator(fixture({"create_host_path": value}), reference)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("hostkonyvtarat", result.stderr)

    def test_missing_or_malformed_bind_is_rejected(self):
        for reference in ({}, {"create_host_path": False}):
            for bind in (None, False, "", []):
                with self.subTest(reference=reference, bind=bind):
                    self.assertNotEqual(self.run_validator(fixture(bind), reference).returncode, 0)
            config = fixture({})
            del config["services"]["backend"]["volumes"][1]["bind"]
            self.assertNotEqual(self.run_validator(config, reference).returncode, 0)

    def test_invalid_reference_never_allows_deployment(self):
        for reference in (None, True, [], {"create_host_path": True}, {"create_host_path": 0},
                          {"create_host_path": "false"}, {"unknown": False}):
            with self.subTest(reference=reference):
                self.assertNotEqual(self.run_validator(fixture({}), reference).returncode, 0)

    def test_other_mount_and_runtime_guards_remain_required(self):
        for change in ("wrongsource", "readonly", "extra", "rootfs", "capability"):
            with self.subTest(change=change):
                config = fixture({"create_host_path": False})
                backend = config["services"]["backend"]
                if change == "wrongsource":
                    backend["volumes"][1]["source"] = "/tmp/not-nfs"
                elif change == "readonly":
                    backend["volumes"][1]["read_only"] = True
                elif change == "extra":
                    backend["volumes"].append({"type": "volume", "target": "/extra"})
                elif change == "rootfs":
                    backend["read_only"] = False
                else:
                    backend["cap_add"] = ["CHOWN"]
                self.assertNotEqual(self.run_validator(config, {"create_host_path": False}).returncode, 0)


if __name__ == "__main__":
    unittest.main()
