"""A letiltott CD-telepítő pozitív és negatív próbái; rendszerútvonalat nem módosítanak."""

from contextlib import ExitStack, redirect_stdout
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch


SOURCE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cd_installer", SOURCE / "install-cd.py")
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


class InstallTests(unittest.TestCase):
    def bundle(self, parent):
        directory = Path(parent) / "bundle"
        with redirect_stdout(io.StringIO()):
            installer.prepare(directory)
        expected = hashlib.sha256((directory / "manifest.json").read_bytes()).hexdigest()
        return directory, expected

    def test_bundle_validates_without_system_write(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory, expected = self.bundle(temporary)
            before = {p.name: p.read_bytes() for p in directory.iterdir()}
            payload = installer.load_bundle(directory, expected)
            self.assertEqual(set(payload), set(installer.FILES))
            self.assertNotIn(b"\r", payload["btphoto-cd"])
            self.assertEqual(before, {p.name: p.read_bytes() for p in directory.iterdir()})

    def test_tampered_manifest_payload_and_unexpected_file_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory, expected = self.bundle(temporary)
            with self.assertRaises(installer.InstallError):
                installer.load_bundle(directory, "0" * 64)
            engine = directory / "btphoto_cd.py"
            engine.write_bytes(engine.read_bytes() + b"\n# modositas\n")
            with self.assertRaises(installer.InstallError):
                installer.load_bundle(directory, expected)
            manifest = json.loads((directory / "manifest.json").read_bytes())
            manifest["../outside"] = "a" * 64
            data = json.dumps(manifest).encode()
            (directory / "manifest.json").write_bytes(data)
            with self.assertRaises(installer.InstallError):
                installer.load_bundle(directory, hashlib.sha256(data).hexdigest())

    def test_enabled_policy_and_invalid_python_rejected(self):
        payload = {name: installer.regular_bytes(SOURCE / name) for name in installer.FILES}
        payload["btphoto-cd"] = payload["btphoto-cd"].replace(b"\r\n", b"\n")
        policy = json.loads(payload["policy.example.json"])
        policy["staging"]["enabled"] = True
        with self.assertRaises(installer.InstallError):
            installer.check_payload({**payload, "policy.example.json": json.dumps(policy).encode()})
        with self.assertRaises(SyntaxError):
            installer.check_payload({**payload, "btphoto_cd.py": b"def invalid:\n"})

    def test_duplicate_json_keys_and_existing_bundle_rejected(self):
        with self.assertRaises(installer.InstallError):
            installer.strict_object([("name", 1), ("name", 2)])
        with tempfile.TemporaryDirectory() as temporary:
            directory, _ = self.bundle(temporary)
            with self.assertRaises(FileExistsError):
                installer.prepare(directory)

    def test_non_linux_or_non_root_rejected_before_write(self):
        for platform, uid in (("win32", 0), ("linux", 1000)):
            with self.subTest(platform=platform, uid=uid), \
                    patch.object(installer.sys, "platform", platform), \
                    patch.object(installer.os, "geteuid", return_value=uid, create=True), \
                    patch.object(installer, "check_targets") as check:
                with self.assertRaises(installer.InstallError):
                    installer.install({})
                check.assert_not_called()

    def test_existing_target_rejected_without_change(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "already-present"
            target.mkdir()
            with patch.object(installer, "LIBRARY", target), patch.object(installer, "trusted_directory"):
                with self.assertRaises(installer.InstallError):
                    installer.check_targets()
            self.assertEqual(list(target.iterdir()), [])

    @unittest.skipUnless(os.name == "posix", "POSIX fájlmód/atomi írás Linuxon ellenőrizhető")
    def test_symlink_payload_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory, expected = self.bundle(temporary)
            payload = directory / "btphoto_cd.py"
            payload.unlink()
            payload.symlink_to(SOURCE / "btphoto_cd.py")
            with self.assertRaises(installer.InstallError):
                installer.load_bundle(directory, expected)

    @unittest.skipUnless(os.name == "posix", "Izolált POSIX fájlrendszerfixture; root telepítés nem történik")
    def test_full_layout_atomic_no_overwrite_and_secret_free_output(self):
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as stack:
            base = Path(temporary)
            directory, expected = self.bundle(base)
            payload = installer.load_bundle(directory, expected)
            for attribute, relative in (("LIBRARY", "lib/cd"), ("WRAPPER", "sbin/cd"),
                                        ("CONFIGURATION", "etc/cd"), ("RELEASES", "opt/cd"), ("STATE", "var/cd")):
                path = base / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                stack.enter_context(patch.object(installer, attribute, path))
            # Kizárólag a tulajdonosellenőrzést szimuláljuk, a fájlírás/fsync/hardlink valódi.
            stack.enter_context(patch.object(installer, "trusted_directory"))
            stack.enter_context(patch.object(installer.os, "geteuid", return_value=0))
            stack.enter_context(patch.object(installer.os, "chown"))
            stack.enter_context(patch.object(installer.os, "fchown"))
            previous_umask = os.umask(0o077)
            stack.callback(os.umask, previous_umask)
            output = io.StringIO()
            with redirect_stdout(output):
                installer.install(payload)
            policy = json.loads((installer.CONFIGURATION / "policy.json").read_bytes())
            self.assertTrue(all(item["enabled"] is False for item in policy.values()))
            keys = [(installer.CONFIGURATION / (name + ".request-key")).read_text().strip()
                    for name in ("staging", "production")]
            self.assertNotEqual(keys[0], keys[1])
            for key in keys:
                self.assertRegex(key, r"^[0-9a-f]{64}$")
                self.assertNotIn(key, output.getvalue())
            for path, mode in ((installer.WRAPPER, 0o755), (installer.LIBRARY / "btphoto_cd.py", 0o644),
                               (installer.CONFIGURATION / "policy.json", 0o600),
                               (installer.CONFIGURATION / "staging.request-key", 0o600)):
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), mode)
            original = installer.WRAPPER.read_bytes()
            with self.assertRaises(FileExistsError):
                installer.create_file(installer.WRAPPER, b"replacement", 0o755)
            self.assertEqual(installer.WRAPPER.read_bytes(), original)
            self.assertEqual(list(base.rglob(".install-*")), [])
            with self.assertRaises(installer.InstallError):
                installer.check_targets()


if __name__ == "__main__":
    unittest.main()
