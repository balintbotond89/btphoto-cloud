"""A provisionáló és sémaeszközök tiszta függvényeinek regressziós próbái."""

import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().parents[1] / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cd = load("cd_tools_core", "btphoto_cd.py")
schema = load("cd_schema", "schema_digest.py")
users = load("cd_users", "create-staging-users.py")


class ToolTests(unittest.TestCase):
    def test_nfs_mount_filters_automount_and_accepts_nfs_versions(self):
        for output in (b"nfs\n", b"nfs4\n"):
            command = Mock(return_value=output)
            cd.verify_nfs_mount("/srv/btphoto/media/staging/avatars", command)
            command.assert_called_once_with([
                "findmnt", "-n", "-T", "/srv/btphoto/media/staging/avatars", "-t", "nfs,nfs4",
                "--first-only", "-o", "FSTYPE"])

    def test_non_nfs_or_unfiltered_mount_result_rejected(self):
        for output in (b"", b"autofs\n", b"ext4\n", b"tmpfs\n", b"autofs\nnfs4\n"):
            with self.subTest(output=output), self.assertRaises(cd.DeploymentError):
                cd.verify_nfs_mount("/dummy", Mock(return_value=output))

    def test_failed_nfs_lookup_does_not_allow_deployment(self):
        command = Mock(side_effect=cd.DeploymentError("findmnt sikertelen"))
        with self.assertRaises(cd.DeploymentError):
            cd.verify_nfs_mount("/dummy", command)

    def test_fixed_staging_roles_only(self):
        sql = users.user_sql("A" * 40, "B" * 40)
        self.assertIn("CREATE USER btphoto_staging_app", sql)
        self.assertIn("CREATE USER btphoto_staging_migrator", sql)
        self.assertNotIn("ALTER USER", sql)
        self.assertNotIn("btphoto_runtime", sql)

    def test_weak_equal_or_sql_injection_password_rejected(self):
        for runtime, migration in (("weak", "B" * 40), ("A" * 40, "A" * 40), ("x';SELECT 1;--" * 4, "B" * 40)):
            with self.assertRaises(ValueError):
                users.user_sql(runtime, migration)

    def test_schema_hash_sensitive_to_names_and_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            first, second = directory / "V1__one.sql", directory / "V2__two.sql"
            first.write_bytes(b"SELECT 1;\n")
            second.write_bytes(b"SELECT 2;\n")
            original = schema.schema_digest(directory)
            self.assertEqual(original, schema.schema_digest(directory))
            second.write_bytes(b"SELECT 3;\n")
            self.assertNotEqual(original, schema.schema_digest(directory))
            second.write_bytes(b"SELECT 2;\n")
            second.rename(directory / "V2__renamed.sql")
            self.assertNotEqual(original, schema.schema_digest(directory))

    def test_empty_schema_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(ValueError):
                schema.schema_digest(temporary)

    @patch.object(cd.subprocess, "run")
    def test_subprocess_exit_and_timeout_preserved(self, run):
        engine = cd.Engine({"environment": "staging", "sha": "a" * 40}, {})
        for actual, expected in ((47, 47), (-15, 143)):
            run.return_value = Mock(returncode=actual)
            with self.assertRaises(cd.DeploymentError) as caught:
                engine.command(["docker", "version"])
            self.assertEqual(caught.exception.status, expected)
        run.side_effect = subprocess.TimeoutExpired("dummy", 1)
        with self.assertRaises(cd.DeploymentError) as caught:
            engine.command(["docker", "version"])
        self.assertEqual(caught.exception.status, 124)

    def test_production_live_staging_probe(self):
        body = {"environment": "production", "sha": "a" * 40, "digests": {c: "sha256:" + "b" * 64 for c in cd.COMPONENTS}}
        receipt = {**body, "directory": "/staging/release", "account_contract": "tenant-v1"}
        engine = cd.Engine(body, {}, staging_policy={"enabled": True})
        engine.read_state = Mock(return_value=receipt)
        with patch.object(cd.Engine, "verify_runtime") as runtime, patch.object(cd.Engine, "smoke") as smoke:
            engine.verify_staging()
            runtime.assert_called_once_with(receipt["directory"], receipt)
            smoke.assert_called_once()
        engine.staging_policy["enabled"] = False
        with self.assertRaises(cd.DeploymentError):
            engine.verify_staging()


if __name__ == "__main__":
    unittest.main()
