"""Az egyszeri sql01 provisionáló secret- és felülírásvédelmi fixture-jei."""

from contextlib import redirect_stdout
import importlib.util
import io
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock, patch


DIRECTORY = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("sql01_provision", DIRECTORY / "provision-staging-sql01.py")
sql01 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sql01)


class Sql01Tests(unittest.TestCase):
    def test_standalone_sql_matches_repository_source(self):
        original = (DIRECTORY / "provision-staging.sql").read_text(encoding="utf-8")
        original = "\n".join(line for line in original.splitlines() if not line.startswith("--"))
        self.assertEqual(" ".join(original.split()), " ".join(sql01.PROVISION_SQL.split()))

    def test_password_validation_and_fixed_users(self):
        result = sql01.password_sql("A" * 40, "B" * 40)
        self.assertIn("CREATE USER btphoto_staging_app", result)
        self.assertNotIn("ALTER USER", result)
        for first, second in (("short", "B" * 40), ("A" * 40, "A" * 40), ("';DROP DATABASE btphoto;" * 4, "B" * 40)):
            with self.assertRaises(sql01.ProvisionError):
                sql01.password_sql(first, second)

    @patch.object(sql01.subprocess, "run")
    def test_password_only_in_stdin_not_argv_or_environment(self, run):
        run.return_value = Mock(returncode=0, stdout=b"username\nroot\n")
        secret = "dummy-secret-only-for-fixture"
        sql01.command(secret, read_only=False)
        arguments, options = run.call_args
        self.assertNotIn(secret, repr(arguments))
        self.assertNotIn(secret, repr(options["env"]))
        self.assertEqual(options["input"], secret.encode())
        self.assertIn("sslmode=verify-full", " ".join(arguments[0]))
        self.assertIn("--set=echo=false", arguments[0])
        self.assertFalse(options["check"])
        sql01.command("SELECT current_user;")
        self.assertIn("--read-only", run.call_args.args[0])

    @patch.object(sql01.subprocess, "run")
    def test_error_does_not_expose_sql_or_secret(self, run):
        run.return_value = Mock(returncode=1, stdout=b"secret", stderr=b"secret")
        with self.assertRaises(sql01.ProvisionError) as caught:
            sql01.command("secret")
        self.assertNotIn("secret", str(caught.exception))

    @patch.object(sql01, "command")
    def test_inventory_validates_identity_and_format(self, command):
        command.side_effect = [[{"current_user": "root"}], [{"database_name": "btphoto", "owner": "root"}], [{"username": "root"}]]
        self.assertEqual(sql01.inventory(), ({"btphoto": "root"}, {"root"}))
        command.side_effect = [[{"current_user": "btphoto_app"}]]
        with self.assertRaises(sql01.ProvisionError):
            sql01.inventory()

    @patch.object(sql01, "execute")
    def test_dry_run_does_not_connect(self, execute):
        with patch.object(sql01.sys, "argv", ["provision-staging-sql01.py"]), redirect_stdout(io.StringIO()):
            sql01.main()
        execute.assert_not_called()

    @patch.object(sql01, "inventory", return_value=({"btphoto_staging": "root"}, {"root"}))
    def test_existing_objects_rejected_before_secret_prompt(self, inventory):
        with patch.object(sql01.sys, "platform", "linux"), patch.object(sql01.os, "geteuid", return_value=0, create=True), \
                patch.dict("sys.modules", {"resource": Mock()}), patch.object(sql01.getpass, "getpass") as prompt:
            with self.assertRaises(sql01.ProvisionError):
                sql01.execute()
            prompt.assert_not_called()

    def test_success_confirm_and_mismatch_paths(self):
        empty = ({"btphoto": "root"}, {"root"})
        full = ({"btphoto_staging": "btphoto_staging_migrator"}, sql01.USERS | {"root"})
        for confirm, second, expected_writes in (("STAGING", "A" * 40, 1), ("NO", "A" * 40, 0), ("STAGING", "wrong", 0)):
            with self.subTest(confirm=confirm, second=second), patch.object(sql01.sys, "platform", "linux"), \
                    patch.object(sql01.os, "geteuid", return_value=0, create=True), patch.dict("sys.modules", {"resource": Mock()}), \
                    patch.object(sql01, "inventory", side_effect=[empty, full]), patch.object(sql01, "command") as command, \
                    patch.object(sql01.getpass, "getpass", side_effect=["A" * 40, second, "B" * 40, "B" * 40]), \
                    patch("builtins.input", return_value=confirm), redirect_stdout(io.StringIO()) as output:
                if expected_writes:
                    sql01.execute()
                else:
                    with self.assertRaises(sql01.ProvisionError):
                        sql01.execute()
                self.assertEqual(command.call_count, expected_writes)
                self.assertNotIn("A" * 40, output.getvalue())
                self.assertNotIn("B" * 40, output.getvalue())


if __name__ == "__main__":
    unittest.main()
