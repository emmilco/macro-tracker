"""FastAPI backend for macro-tracker (single-user, Cloudflare-Access-gated).

Mirrors the dbUtils surface from the original Supabase client. No auth on
the backend itself — the public endpoint sits behind Cloudflare Access,
and the daemon binds only to 127.0.0.1.

Run:
    uvicorn backend.server:app --host 127.0.0.1 --port 7100

Layout:
    /            -> serves built React app (dist/)
    /api/...     -> JSON endpoints
"""
from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).parent.parent.resolve()
DB_PATH = Path(__file__).parent / "data" / "macro.db"
DIST_DIR = ROOT / "dist"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def new_id() -> str:
    return str(uuid.uuid4())


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


# ---------- request / response shapes ----------


class FoodIn(BaseModel):
    name: str
    portion_size: str
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)


class FoodPatch(BaseModel):
    name: Optional[str] = None
    portion_size: Optional[str] = None
    protein: Optional[float] = Field(default=None, ge=0)
    carbs: Optional[float] = Field(default=None, ge=0)
    fat: Optional[float] = Field(default=None, ge=0)
    frequency: Optional[int] = Field(default=None, ge=0)


class DailyEntryIn(BaseModel):
    date: str
    day_type: Literal["workout", "rest"]


class DayTypePatch(BaseModel):
    day_type: Literal["workout", "rest"]


class FoodEntryIn(BaseModel):
    daily_entry_id: str
    food_id: str
    multiplier: float = Field(gt=0)
    food_name: str
    food_portion_size: str
    food_protein: float = Field(ge=0)
    food_carbs: float = Field(ge=0)
    food_fat: float = Field(ge=0)


class MultiplierPatch(BaseModel):
    multiplier: float = Field(gt=0)


class SettingsIn(BaseModel):
    workout_protein: int = Field(gt=0)
    workout_carbs: int = Field(gt=0)
    workout_fat: int = Field(gt=0)
    rest_protein: int = Field(gt=0)
    rest_carbs: int = Field(gt=0)
    rest_fat: int = Field(gt=0)


# ---------- API ----------

app = FastAPI(title="macro-tracker")


@app.get("/api/foods")
def list_foods() -> list[dict]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM foods ORDER BY frequency DESC, LOWER(name) ASC"
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/foods", status_code=201)
def create_food(food: FoodIn) -> dict:
    new = {
        "id": new_id(),
        **food.model_dump(),
        "frequency": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    with db() as conn:
        conn.execute(
            "INSERT INTO foods (id, name, portion_size, protein, carbs, fat,"
            " frequency, created_at, updated_at) VALUES "
            "(:id, :name, :portion_size, :protein, :carbs, :fat,"
            " :frequency, :created_at, :updated_at)",
            new,
        )
    return new


@app.patch("/api/foods/{food_id}")
def update_food(food_id: str, patch: FoodPatch) -> dict:
    fields = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not fields:
        raise HTTPException(400, "no fields to update")
    fields["updated_at"] = now_iso()
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    with db() as conn:
        cur = conn.execute(
            f"UPDATE foods SET {set_clause} WHERE id = :id",
            {**fields, "id": food_id},
        )
        if cur.rowcount == 0:
            raise HTTPException(404, f"food {food_id} not found")
        row = conn.execute("SELECT * FROM foods WHERE id = ?", (food_id,)).fetchone()
    return dict(row)


@app.delete("/api/foods/{food_id}", status_code=204)
def delete_food(food_id: str) -> None:
    with db() as conn:
        conn.execute("DELETE FROM foods WHERE id = ?", (food_id,))


@app.post("/api/foods/{food_id}/increment-frequency", status_code=204)
def increment_food_frequency(food_id: str) -> None:
    with db() as conn:
        conn.execute(
            "UPDATE foods SET frequency = frequency + 1, updated_at = ? WHERE id = ?",
            (now_iso(), food_id),
        )


@app.get("/api/daily-entries/by-date/{date}")
def get_daily_entry(date: str) -> dict | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM daily_entries WHERE date = ?", (date,)).fetchone()
    return row_to_dict(row)


@app.post("/api/daily-entries", status_code=201)
def create_daily_entry(entry: DailyEntryIn) -> dict:
    new = {
        "id": new_id(),
        "date": entry.date,
        "day_type": entry.day_type,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    with db() as conn:
        try:
            conn.execute(
                "INSERT INTO daily_entries (id, date, day_type, created_at, updated_at)"
                " VALUES (:id, :date, :day_type, :created_at, :updated_at)",
                new,
            )
        except sqlite3.IntegrityError as e:
            raise HTTPException(409, f"daily entry for {entry.date} already exists") from e
    return new


@app.patch("/api/daily-entries/{entry_id}")
def update_daily_entry_type(entry_id: str, patch: DayTypePatch) -> dict:
    with db() as conn:
        cur = conn.execute(
            "UPDATE daily_entries SET day_type = ?, updated_at = ? WHERE id = ?",
            (patch.day_type, now_iso(), entry_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, f"daily entry {entry_id} not found")
        row = conn.execute("SELECT * FROM daily_entries WHERE id = ?", (entry_id,)).fetchone()
    return dict(row)


@app.get("/api/daily-entries/historical")
def historical_daily_entries(exclude: str | None = None) -> list[dict]:
    with db() as conn:
        if exclude:
            rows = conn.execute(
                "SELECT * FROM daily_entries WHERE date != ? ORDER BY date DESC",
                (exclude,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM daily_entries ORDER BY date DESC"
            ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/food-entries")
def list_food_entries(daily_entry_id: str) -> list[dict]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM food_entries WHERE daily_entry_id = ?", (daily_entry_id,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/food-entries", status_code=201)
def create_food_entry(entry: FoodEntryIn) -> dict:
    new = {
        "id": new_id(),
        **entry.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    with db() as conn:
        conn.execute(
            "INSERT INTO food_entries (id, daily_entry_id, food_id, multiplier,"
            " food_name, food_portion_size, food_protein, food_carbs, food_fat,"
            " created_at, updated_at) VALUES "
            "(:id, :daily_entry_id, :food_id, :multiplier,"
            " :food_name, :food_portion_size, :food_protein, :food_carbs, :food_fat,"
            " :created_at, :updated_at)",
            new,
        )
    return new


@app.patch("/api/food-entries/{entry_id}")
def update_food_entry_multiplier(entry_id: str, patch: MultiplierPatch) -> dict:
    with db() as conn:
        cur = conn.execute(
            "UPDATE food_entries SET multiplier = ?, updated_at = ? WHERE id = ?",
            (patch.multiplier, now_iso(), entry_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, f"food entry {entry_id} not found")
        row = conn.execute("SELECT * FROM food_entries WHERE id = ?", (entry_id,)).fetchone()
    return dict(row)


@app.delete("/api/food-entries/{entry_id}", status_code=204)
def delete_food_entry(entry_id: str) -> None:
    with db() as conn:
        conn.execute("DELETE FROM food_entries WHERE id = ?", (entry_id,))


@app.get("/api/settings")
def get_settings() -> dict | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM user_settings LIMIT 1").fetchone()
    return row_to_dict(row)


@app.put("/api/settings")
def update_settings(settings: SettingsIn) -> dict:
    with db() as conn:
        existing = conn.execute("SELECT id FROM user_settings LIMIT 1").fetchone()
        if existing:
            cols = ", ".join(f"{k} = :{k}" for k in settings.model_dump())
            conn.execute(
                f"UPDATE user_settings SET {cols}, updated_at = :updated_at WHERE id = :id",
                {**settings.model_dump(), "id": existing["id"], "updated_at": now_iso()},
            )
            row = conn.execute("SELECT * FROM user_settings WHERE id = ?", (existing["id"],)).fetchone()
        else:
            new = {
                "id": new_id(),
                **settings.model_dump(),
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            conn.execute(
                "INSERT INTO user_settings (id, workout_protein, workout_carbs, workout_fat,"
                " rest_protein, rest_carbs, rest_fat, created_at, updated_at) VALUES "
                "(:id, :workout_protein, :workout_carbs, :workout_fat,"
                " :rest_protein, :rest_carbs, :rest_fat, :created_at, :updated_at)",
                new,
            )
            row = conn.execute("SELECT * FROM user_settings WHERE id = ?", (new["id"],)).fetchone()
    return dict(row)


@app.get("/healthz")
async def healthz() -> dict[str, bool]:
    """Supervisor liveness probe (async: answers from the event loop even
    when the worker pool is busy — see lab-server APP_GUIDE.md)."""
    return {"ok": True}


# ---------- static files (built React app) ----------

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")
else:
    @app.get("/")
    def _placeholder() -> JSONResponse:
        return JSONResponse(
            {"error": "frontend not built", "fix": "cd macro-tracker && npm install && npm run build"},
            status_code=503,
        )

