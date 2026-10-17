"""A rendezett migrációnevek és fájlbájtok determinisztikus ujjlenyomata."""

import hashlib
from pathlib import Path


def schema_digest(directory):
    digest = hashlib.sha256()
    files = sorted(Path(directory).glob("V*__*.sql"))
    if not files:
        raise ValueError("Nincs verziózott migráció.")
    for path in files:
        for value in (path.name.encode("utf-8"), path.read_bytes()):
            digest.update(len(value).to_bytes(8, "big"))
            digest.update(value)
    return digest.hexdigest()


if __name__ == "__main__":
    print("digest=" + schema_digest(Path(__file__).resolve().parents[2] / "database" / "migrations"))
