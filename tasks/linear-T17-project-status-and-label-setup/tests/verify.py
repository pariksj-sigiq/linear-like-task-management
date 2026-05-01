#!/usr/bin/env python3
"""Verify final database state for linear-T17."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T17"
CHECKS: list[tuple[str, str]] = [
    ("status_exists", "SELECT EXISTS (SELECT 1 FROM project_statuses WHERE workspace_id = 'wks_tasks' AND name = 'Demo Review' AND category = 'active' AND color = '#8B5CF6')"),
    ("label_applied_to_project", "SELECT EXISTS (SELECT 1 FROM project_labels pl JOIN labels l ON l.id = pl.label_id WHERE pl.project_id = 'prj-launch-readiness' AND l.team_id = 'tm_plat' AND l.name = 'Demo Review' AND l.color = '#8B5CF6')"),
    ("project_moved", "SELECT EXISTS (SELECT 1 FROM projects WHERE id = 'prj-launch-readiness' AND state = 'demo_review')"),
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
