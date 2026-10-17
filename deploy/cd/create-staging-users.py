#!/usr/bin/env python3
"""Egyszeri, interaktív SQL-provisionálás meglévő, védett libpq service alapján."""

import argparse
import getpass
import os
from pathlib import Path
import re
import subprocess
import sys


def user_sql(runtime_password, migration_password):
    # A provisionáló eszköz csak hosszú, jelszókezelőből származó URL-safe secretet fogad.
    for value in (runtime_password, migration_password):
        if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", value):
            raise ValueError("Mindkét DB-jelszó 32–128 URL-safe karakter legyen.")
    if runtime_password == migration_password:
        raise ValueError("A runtime és migrációs jelszó nem lehet azonos.")
    return (f"CREATE USER btphoto_staging_app WITH PASSWORD '{runtime_password}';\n"
            f"CREATE USER btphoto_staging_migrator WITH PASSWORD '{migration_password}';\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--service", required=True, help="Repositoryn kívüli, TLS verify-full libpq service neve")
    parser.add_argument("--execute", action="store_true", help="Az egyszeri SQL-módosítás kifejezett engedélye")
    args = parser.parse_args()
    if not args.execute:
        print("Csak terv: két staging LOGIN user és külön btphoto_staging adatbázis. Módosítás nem történt.")
        return
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", args.service):
        sys.exit("Hibás service név.")
    runtime = getpass.getpass("Staging runtime DB-jelszó (nem jelenik meg): ")
    migration = getpass.getpass("Staging migrációs DB-jelszó (nem jelenik meg): ")
    sql = user_sql(runtime, migration) + Path(__file__).with_name("provision-staging.sql").read_text(encoding="utf-8")
    environment = dict(os.environ, PGSERVICE=args.service, PGSSLMODE="verify-full", PGCONNECT_TIMEOUT="5")
    # Credential kizárólag stdin/libpq védett konfiguráció; nincs SQL/password az argv-ban.
    result = subprocess.run(["psql", "-X", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--quiet",
                             "--dbname", f"service={args.service} sslmode=verify-full connect_timeout=5"],
                            input=sql.encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            env=environment, timeout=120, check=False)
    if result.returncode:
        sys.exit("Provisionálási hiba. Részleges objektumok megmaradhattak; kézi adminellenőrzés szükséges. Nincs automatikus törlés.")
    print("Staging DB/user provisionálás sikeres; Flyway és negatív hozzáférési próbák még szükségesek.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit("A staging provisionálás nem fejeződött be; secretet tartalmazó kivétel nem jeleníthető meg.")
