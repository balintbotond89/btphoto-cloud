#!/usr/bin/env python3
"""Egyszeri staging SQL-előkészítés az sql01 meglévő root kliens-tanúsítványával."""

import argparse
import csv
import getpass
import io
import os
import re
import subprocess
import sys
import warnings


ADMIN_URL = (
    "postgresql://root@10.20.0.20:26257/defaultdb?sslmode=verify-full"
    "&sslrootcert=/etc/cockroach/certs/ca.crt"
    "&sslcert=/root/.cockroach-certs/client.root.crt"
    "&sslkey=/root/.cockroach-certs/client.root.key"
)
USERS = {"btphoto_staging_app", "btphoto_staging_migrator"}
# A provision-staging.sql önállóan átadható példánya; azonosságát regressziós teszt védi.
PROVISION_SQL = """CREATE DATABASE btphoto_staging OWNER btphoto_staging_migrator;
REVOKE ALL ON DATABASE btphoto_staging FROM public;
GRANT CONNECT ON DATABASE btphoto_staging TO btphoto_staging_app;
USE btphoto_staging;
REVOKE CREATE ON SCHEMA public FROM public;
GRANT ALL ON SCHEMA public TO btphoto_staging_migrator;
GRANT USAGE ON SCHEMA public TO btphoto_staging_app;
ALTER DEFAULT PRIVILEGES FOR ROLE btphoto_staging_migrator IN SCHEMA public
    GRANT SELECT ON TABLES TO btphoto_staging_app;
"""


class ProvisionError(Exception):
    """Kizárólag előre meghatározott, secretmentes hibaüzenet."""


def require(condition, message):
    if not condition:
        raise ProvisionError(message)


def command(sql, read_only=True):
    arguments = ["/usr/local/bin/cockroach", "sql", "--url=" + ADMIN_URL,
                 "--format=csv", "--set=errexit=true", "--set=echo=false"]
    if read_only:
        arguments.append("--read-only")
    result = subprocess.run(arguments, input=sql.encode(), stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=120, check=False,
                            env={"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": "/root", "LANG": "C.UTF-8"})
    require(result.returncode == 0, "SQL-hiba: részleges objektumok megmaradhattak. Ne futtasd újra és ne törölj automatikusan.")
    return list(csv.DictReader(io.StringIO(result.stdout.decode("utf-8"))))


def inventory():
    identity = command("SELECT current_user;")
    require(len(identity) == 1 and identity[0].get("current_user") == "root", "Nem a jóváhagyott root SQL-identitás.")
    databases = command("SHOW DATABASES;")
    users = command("SHOW USERS;")
    require(all("database_name" in row and "owner" in row for row in databases)
            and all("username" in row for row in users), "Váratlan adminlekérdezési formátum.")
    return {row["database_name"]: row["owner"] for row in databases}, {row["username"] for row in users}


def password_sql(runtime, migrator):
    require(all(re.fullmatch(r"[A-Za-z0-9_-]{32,128}", value) for value in (runtime, migrator)),
            "Mindkét jelszó 32–128 karakteres legyen: betűk, számok, aláhúzás vagy kötőjel.")
    require(runtime != migrator, "A két jelszó nem lehet azonos.")
    return (f"CREATE USER btphoto_staging_app WITH PASSWORD '{runtime}';\n"
            f"CREATE USER btphoto_staging_migrator WITH PASSWORD '{migrator}';\n")


def execute():
    require(sys.platform == "linux" and os.geteuid() == 0, "Az sql01 root termináljában futtatható.")
    import resource
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    databases, users = inventory()
    require("btphoto_staging" not in databases and not USERS.intersection(users),
            "Staging adatbázis vagy felhasználó már létezik. Nincs felülírás; kézi felmérés szükséges.")
    warnings.simplefilter("error", getpass.GetPassWarning)
    runtime = getpass.getpass("Staging alkalmazás DB-jelszó: ")
    require(runtime == getpass.getpass("Alkalmazás DB-jelszó ismét: "), "Az alkalmazásjelszó megerősítése eltér.")
    migrator = getpass.getpass("Staging migrációs DB-jelszó: ")
    require(migrator == getpass.getpass("Migrációs DB-jelszó ismét: "), "A migrációs jelszó megerősítése eltér.")
    statements = password_sql(runtime, migrator) + PROVISION_SQL
    require(input("Létrehozás megerősítése (ird be: STAGING): ") == "STAGING", "Létrehozás megszakítva; nem történt írás.")
    command(statements, read_only=False)
    databases, users = inventory()
    require(databases.get("btphoto_staging") == "btphoto_staging_migrator" and USERS <= users,
            "A staging utóellenőrzés sikertelen; kézi felmérés szükséges.")
    print("STAGING SQL ELŐKÉSZÍTÉS SIKERES: btphoto_staging, btphoto_staging_app, btphoto_staging_migrator.")
    print("Üzleti migráció és hozzáférési negatív teszt még nem futott. Jelszó nem került fájlba vagy kimenetre.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Két staging user és adatbázis egyszeri létrehozása")
    if parser.parse_args().execute:
        execute()
    else:
        print("Csak terv: az sql01 meglévő root tanúsítványával két külön staging user és adatbázis készülne.")
        print("Nincs SQL-kapcsolat vagy módosítás. A tényleges futtatás --execute és rejtett jelszóbemenet mellett történik.")


if __name__ == "__main__":
    try:
        main()
    except ProvisionError as error:
        sys.exit(str(error))
    except (Exception, KeyboardInterrupt):
        sys.exit("A staging előkészítés nem fejeződött be; részleges objektumok megmaradhattak. Nincs automatikus törlés/újrapróba.")
