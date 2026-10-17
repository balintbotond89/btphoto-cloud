#!/usr/bin/env python3
"""Ellenőrzött, kikapcsolt CD-motor egyszeri telepítése; nincs deploy vagy sudoers-módosítás."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import sys


FILES = ("btphoto_cd.py", "btphoto-cd", "policy.example.json", "install-cd.py")
LIBRARY = Path("/usr/local/lib/btphoto-cd")
WRAPPER = Path("/usr/local/sbin/btphoto-cd")
CONFIGURATION = Path("/etc/btphoto-cd")
RELEASES = Path("/opt/btphoto-cd")
STATE = Path("/var/lib/btphoto-cd")
HEX = re.compile(r"[0-9a-f]{64}\Z")


class InstallError(Exception):
    """Csak előre meghatározott, titkot nem tartalmazó diagnosztika."""


def require(condition, message):
    if not condition:
        raise InstallError(message)


def regular_bytes(path, limit=524288):
    path = Path(path)
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_size <= limit, "Nem szabályos vagy túl nagy csomagfájl.")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as source:
        opened = os.fstat(source.fileno())
        data = source.read(limit + 1)
        after = os.fstat(source.fileno())
    require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
            == (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns)
            == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
            and len(data) == before.st_size, "A csomagfájl olvasás közben változott.")
    return data


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplikált manifest/policy kulcs.")
        result[key] = value
    return result


def check_payload(payload):
    policy = json.loads(payload["policy.example.json"], object_pairs_hook=strict_object)
    require(isinstance(policy, dict) and set(policy) == {"staging", "production"}, "Hibás környezetlista.")
    for name in policy:
        item = policy[name]
        require(isinstance(item, dict) and item.get("enabled") is False
                and item.get("runner") == "btphoto-deploy-" + name
                and item.get("rollback_pairs") == [], "Csak letiltott, jóváhagyás nélküli kezdőpolicy telepíthető.")
    for name in ("btphoto_cd.py", "install-cd.py"):
        compile(payload[name], "<ellenorzott-cd-forras>", "exec")
    require(payload["btphoto-cd"].startswith(b"#!/bin/sh\n")
            and b"\r" not in payload["btphoto-cd"], "A shell belépési pont LF sortörést igényel.")


def prepare(directory):
    # A csomag nem tartalmaz credentialt; a manifest nem digitális aláírás.
    source = Path(__file__).resolve().parent
    payload = {name: regular_bytes(source / name) for name in FILES}
    payload["btphoto-cd"] = payload["btphoto-cd"].replace(b"\r\n", b"\n")
    check_payload(payload)
    directory = Path(directory)
    directory.mkdir(mode=0o700)
    for name, data in payload.items():
        with (directory / name).open("xb") as output:
            output.write(data)
    manifest = json.dumps({name: hashlib.sha256(data).hexdigest() for name, data in payload.items()},
                          sort_keys=True, indent=2).encode() + b"\n"
    with (directory / "manifest.json").open("xb") as output:
        output.write(manifest)
    print("Manifest SHA-256: " + hashlib.sha256(manifest).hexdigest())
    print("Telepítő SHA-256: " + hashlib.sha256(payload["install-cd.py"]).hexdigest())
    print("Credentialmentes csomag elkészült. Root telepítés és deployment nem történt.")


def load_bundle(directory, expected):
    require(isinstance(expected, str) and HEX.fullmatch(expected), "Teljes, kisbetűs manifest SHA-256 szükséges.")
    directory = Path(directory)
    manifest = regular_bytes(directory / "manifest.json", 8192)
    require(hashlib.sha256(manifest).hexdigest() == expected, "A manifest hash nem egyezik.")
    hashes = json.loads(manifest, object_pairs_hook=strict_object)
    require(isinstance(hashes, dict) and set(hashes) == set(FILES), "Váratlan manifest fájllista.")
    payload = {}
    for name in FILES:
        require(isinstance(hashes[name], str) and HEX.fullmatch(hashes[name]), "Hibás csomaghash.")
        data = regular_bytes(directory / name)
        require(hashlib.sha256(data).hexdigest() == hashes[name], "A csomag tartalma nem egyezik az ellenőrzött manifesttel.")
        payload[name] = data
    check_payload(payload)
    return payload


def trusted_directory(path):
    # Csak root által írható, symlink nélküli szülőlánc fogadható el.
    for item in (path, *path.parents):
        info = item.lstat()
        require(stat.S_ISDIR(info.st_mode) and info.st_uid == 0 and info.st_gid == 0
                and not info.st_mode & 0o022, "Nem megbízható célkönyvtár.")


def layout():
    return (LIBRARY, CONFIGURATION, RELEASES, STATE,
            *(RELEASES / name for name in ("staging", "production")),
            *(RELEASES / name / "releases" for name in ("staging", "production")),
            *(STATE / name for name in ("staging", "production")))


def check_targets():
    directories = layout()
    for path in directories:
        require(not os.path.lexists(path), "A CD célútvonal már létezik; külön felülvizsgált frissítési eljárás szükséges.")
        ancestor = path.parent
        while ancestor in directories:
            ancestor = ancestor.parent
        trusted_directory(ancestor)
    trusted_directory(WRAPPER.parent)
    require(not os.path.lexists(WRAPPER), "A CD belépési pont már létezik; automatikus felülírás nincs.")


def create_file(path, data, mode):
    # A hardlink publikálás atomi és nem ír felül korábbi célt; csak saját átmeneti fájlt törlünk.
    temporary = path.parent / (".install-" + secrets.token_hex(16))
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        with os.fdopen(descriptor, "wb") as output:
            os.fchmod(output.fileno(), mode)
            os.fchown(output.fileno(), 0, 0)
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.link(temporary, path, follow_symlinks=False)
        sync_directory(path.parent)
    finally:
        temporary.unlink()


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def install(payload):
    require(sys.platform == "linux" and os.geteuid() == 0, "A telepítés Linux root munkamenetet igényel.")
    os.umask(0o077)
    check_targets()
    for path in layout():
        path.mkdir(mode=0o700)
        os.chown(path, 0, 0)
        os.chmod(path, 0o700)
        trusted_directory(path)
    create_file(LIBRARY / "btphoto_cd.py", payload["btphoto_cd.py"], 0o644)
    create_file(CONFIGURATION / "policy.json", payload["policy.example.json"], 0o600)
    for name in ("staging", "production"):
        create_file(CONFIGURATION / (name + ".request-key"), (secrets.token_hex(32) + "\n").encode(), 0o600)
    for path in layout():
        sync_directory(path)
        sync_directory(path.parent)
    # A belépési pont csak a teljes motor/config tartós kiírása után válik elérhetővé.
    create_file(WRAPPER, payload["btphoto-cd"], 0o755)
    sync_directory(WRAPPER.parent)
    print("A CD-motor települt; mindkét környezet letiltott. Kéréskulcs nem jelent meg a kimeneten.")
    print("Sudoers, runner, hálózat, SQL, NFS, edge és production stack nem módosult.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--prepare", type=Path, help="Új, nem létező credentialmentes csomagkönyvtár")
    mode.add_argument("--bundle", type=Path, help="Ellenőrzött telepítőcsomag könyvtára")
    parser.add_argument("--manifest-sha256", help="Külön, megbízható csatornán ellenőrzött manifest hash")
    parser.add_argument("--execute", action="store_true", help="Kifejezett, egyszeri root telepítés; nincs CD-engedélyezés")
    args = parser.parse_args()
    if args.prepare:
        require(not args.execute and args.manifest_sha256 is None, "A csomagkészítés nem root telepítés.")
        prepare(args.prepare)
    else:
        payload = load_bundle(args.bundle, args.manifest_sha256)
        if args.execute:
            require(regular_bytes(Path(__file__)) == payload["install-cd.py"], "A futó telepítő nem a jóváhagyott csomagból származik.")
            install(payload)
        else:
            print("Csomag és letiltott kezdőpolicy érvényes. Ellenőrzés történt; rendszerfájl nem módosult.")


if __name__ == "__main__":
    try:
        main()
    except InstallError as error:
        sys.exit("CD telepítő: " + str(error))
    except Exception:
        # Nincs traceback vagy automatikus törlés; részleges telepítést kézzel kell felmérni.
        sys.exit("A CD telepítő nem fejeződött be. Részleges fájlok megmaradhattak; nincs automatikus felülírás/takarítás.")
