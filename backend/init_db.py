"""Initialize sqlite from Supabase SQL exports.

Reads PostgreSQL `INSERT INTO ... VALUES (...), (...);` files exported
from the Supabase dashboard, filters to a single user_id (the multi-user
schema is collapsed since this app is now single-user behind Cloudflare
Access), drops the user_id column, and inserts into a local sqlite db.

Usage:
    python3 backend/init_db.py [--reset]

Looks for *.sql exports in DEFAULT_EXPORT_DIR; override with EXPORT_DIR
env var. Database written to backend/data/macro.db.
"""
from __future__ import annotations

import os
import re
import sqlite3
import sys
from pathlib import Path

ELLIOT_USER_ID = "1d787da9-044e-4333-82fc-7a5273231c22"
DEFAULT_EXPORT_DIR = Path.home() / "Downloads" / "macro-tracker-export"
DB_PATH = Path(__file__).parent / "data" / "macro.db"

# Column lists per table, in source-export order. user_id is the LAST column
# in every table; we drop it during migration.
TABLE_COLUMNS = {
    "foods": [
        "id", "name", "portion_size", "protein", "carbs", "fat",
        "frequency", "created_at", "updated_at",  # user_id dropped
    ],
    "daily_entries": [
        "id", "date", "day_type", "created_at", "updated_at",  # user_id dropped
    ],
    "food_entries": [
        "id", "daily_entry_id", "food_id", "multiplier",
        "food_name", "food_portion_size",
        "food_protein", "food_carbs", "food_fat",
        "created_at", "updated_at",  # food_entries has no user_id
    ],
    "user_settings": [
        "id",
        "workout_protein", "workout_carbs", "workout_fat",
        "rest_protein", "rest_carbs", "rest_fat",
        "created_at", "updated_at",  # user_id dropped
    ],
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    portion_size TEXT NOT NULL,
    protein REAL NOT NULL CHECK (protein >= 0),
    carbs REAL NOT NULL CHECK (carbs >= 0),
    fat REAL NOT NULL CHECK (fat >= 0),
    frequency INTEGER NOT NULL DEFAULT 0 CHECK (frequency >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    day_type TEXT NOT NULL CHECK (day_type IN ('workout', 'rest')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_entries (
    id TEXT PRIMARY KEY,
    daily_entry_id TEXT NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
    food_id TEXT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    multiplier REAL NOT NULL DEFAULT 1.0 CHECK (multiplier > 0),
    food_name TEXT NOT NULL,
    food_portion_size TEXT NOT NULL,
    food_protein REAL NOT NULL,
    food_carbs REAL NOT NULL,
    food_fat REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    workout_protein INTEGER NOT NULL CHECK (workout_protein > 0),
    workout_carbs INTEGER NOT NULL CHECK (workout_carbs > 0),
    workout_fat INTEGER NOT NULL CHECK (workout_fat > 0),
    rest_protein INTEGER NOT NULL CHECK (rest_protein > 0),
    rest_carbs INTEGER NOT NULL CHECK (rest_carbs > 0),
    rest_fat INTEGER NOT NULL CHECK (rest_fat > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_foods_frequency ON foods(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
CREATE INDEX IF NOT EXISTS idx_food_entries_daily_entry_id ON food_entries(daily_entry_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_id ON food_entries(food_id);
"""


def parse_value_tuples(sql_text: str) -> list[list[str]]:
    """Extract VALUES tuples from a PostgreSQL INSERT statement and return
    each tuple as a list of raw value tokens (still in their on-disk
    representation: 'quoted strings', NULL, numbers)."""
    m = re.search(r"VALUES\s*", sql_text, re.IGNORECASE)
    if not m:
        return []
    rest = sql_text[m.end():]

    tuples: list[str] = []
    depth = 0
    in_quote = False
    start = -1
    i = 0
    while i < len(rest):
        c = rest[i]
        if in_quote:
            if c == "'":
                if i + 1 < len(rest) and rest[i + 1] == "'":
                    i += 2
                    continue
                in_quote = False
        else:
            if c == "'":
                in_quote = True
            elif c == "(":
                if depth == 0:
                    start = i
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0 and start >= 0:
                    tuples.append(rest[start:i + 1])
                    start = -1
        i += 1

    parsed: list[list[str]] = []
    for t in tuples:
        inner = t[1:-1]
        values: list[str] = []
        depth = 0
        in_quote = False
        start = 0
        i = 0
        while i < len(inner):
            c = inner[i]
            if in_quote:
                if c == "'":
                    if i + 1 < len(inner) and inner[i + 1] == "'":
                        i += 2
                        continue
                    in_quote = False
            else:
                if c == "'":
                    in_quote = True
                elif c == "(":
                    depth += 1
                elif c == ")":
                    depth -= 1
                elif c == "," and depth == 0:
                    values.append(inner[start:i].strip())
                    start = i + 1
            i += 1
        values.append(inner[start:].strip())
        parsed.append(values)
    return parsed


def coerce(token: str) -> object:
    """Convert a PostgreSQL value token to a Python value suitable for
    sqlite3 parameterized insertion."""
    t = token.strip()
    if t.upper() == "NULL":
        return None
    if t.startswith("'") and t.endswith("'"):
        return t[1:-1].replace("''", "'")
    try:
        if "." in t:
            return float(t)
        return int(t)
    except ValueError:
        return t


def import_table(conn: sqlite3.Connection, table: str, sql_path: Path) -> int:
    sql_text = sql_path.read_text()
    raw_tuples = parse_value_tuples(sql_text)
    target_cols = TABLE_COLUMNS[table]

    # Source columns include user_id at the end for tables that have it.
    # food_entries has no user_id, so source = target.
    has_user_id = table != "food_entries"

    rows_to_insert: list[tuple] = []
    daily_entry_ids: set[str] = set()  # for food_entries filtering

    if table == "food_entries":
        # Build the set of valid daily_entry_ids from already-imported rows
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM daily_entries")
        daily_entry_ids = {row[0] for row in cursor.fetchall()}

    for raw in raw_tuples:
        values = [coerce(t) for t in raw]
        if has_user_id:
            user_id = values[-1]
            if user_id != ELLIOT_USER_ID:
                continue
            values = values[:-1]
        if table == "food_entries":
            daily_entry_id = values[1]
            if daily_entry_id not in daily_entry_ids:
                continue
        if len(values) != len(target_cols):
            print(
                f"  skip: column count mismatch ({len(values)} vs {len(target_cols)}): "
                f"{values[:3]}...",
                file=sys.stderr,
            )
            continue
        rows_to_insert.append(tuple(values))

    if not rows_to_insert:
        return 0

    placeholders = ", ".join("?" for _ in target_cols)
    cols_sql = ", ".join(target_cols)
    conn.executemany(
        f"INSERT OR REPLACE INTO {table} ({cols_sql}) VALUES ({placeholders})",
        rows_to_insert,
    )
    return len(rows_to_insert)


def main() -> None:
    reset = "--reset" in sys.argv
    export_dir = Path(os.environ.get("EXPORT_DIR", DEFAULT_EXPORT_DIR))
    if not export_dir.exists():
        sys.exit(f"export dir not found: {export_dir}")

    DB_PATH.parent.mkdir(exist_ok=True)
    if reset and DB_PATH.exists():
        DB_PATH.unlink()
        print(f"removed existing {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    print(f"schema initialized in {DB_PATH}")

    # Order matters: parents before children for foreign key constraints.
    # food_entries depends on both daily_entries and foods.
    for table in ("foods", "daily_entries", "user_settings", "food_entries"):
        sql_path = export_dir / f"{table}_rows.sql"
        if not sql_path.exists():
            print(f"skip {table}: {sql_path} not found")
            continue
        n = import_table(conn, table, sql_path)
        print(f"  imported {n:>4} rows into {table}")
    conn.commit()
    conn.close()
    print("done.")


if __name__ == "__main__":
    main()
