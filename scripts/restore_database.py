"""Restore a private SQLite backup into a NEW local database file only."""
import argparse
from pathlib import Path
import sqlite3

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backup", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()
    source = args.backup.resolve(strict=True)
    destination = args.destination.resolve()
    if destination.exists() or destination == source:
        raise SystemExit("Refusing to replace an existing file. Choose a new destination path.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as backup:
        if backup.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("Backup integrity check failed; no restore performed.")
        # Exclusive creation prevents even an accidental overwrite.
        with destination.open("xb"):
            pass
        with sqlite3.connect(destination) as restored:
            backup.backup(restored)
            result = restored.execute("PRAGMA integrity_check").fetchone()[0]
            if result != "ok":
                raise SystemExit("Restored file failed integrity validation; keep the original backup.")
    print(f"Verified restore created: {destination}")
    print("Select it with HYPERION_DATABASE_PATH before starting the backend.")

if __name__ == "__main__":
    main()
