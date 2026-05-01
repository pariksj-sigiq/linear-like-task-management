#!/usr/bin/env python3
"""Verify final database state for linear-T24."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T24"
CHECKS: list[tuple[str, str]] = [
    ("new_cycle_created", "SELECT EXISTS (SELECT 1 FROM cycles WHERE team_id = 'tm_plat' AND number = 20 AND name = 'Clone Smoke W20' AND start_date = DATE '2026-05-18' AND end_date = DATE '2026-05-31')"),
    ("lin142_moved", "SELECT EXISTS (SELECT 1 FROM issues i JOIN cycles c ON c.id = i.cycle_id WHERE i.identifier = 'LIN-142' AND c.name = 'Clone Smoke W20')"),
    ("w18_closed", "SELECT EXISTS (SELECT 1 FROM cycles WHERE id = 'cyc-platform-w18' AND state = 'completed' AND completed_at IS NOT NULL)"),
    ("deferrables_left_in_w18", "SELECT COUNT(*) = 2 FROM issues WHERE identifier IN ('LIN-140','LIN-141') AND cycle_id = 'cyc-platform-w18'"),
]


def emit(reward: float, checks: dict[str, bool] | None = None, error: str | None = None) -> None:
    payload: dict[str, Any] = {"task_id": TASK_ID, "reward": float(reward), "checks": checks or {}}
    if error:
        payload["error"] = error
    print(json.dumps(payload, sort_keys=True))


def main() -> None:
    try:
        import psycopg2
    except Exception as exc:
        emit(0.0, error=f"psycopg2 unavailable: {exc}")
        return

    results: dict[str, bool] = {}
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                for name, sql in CHECKS:
                    cur.execute(sql)
                    row = cur.fetchone()
                    results[name] = bool(row and row[0])
    except Exception as exc:
        emit(0.0, results, error=str(exc))
        return

    emit(1.0 if results and all(results.values()) else 0.0, results)


if __name__ == "__main__":
    main()
