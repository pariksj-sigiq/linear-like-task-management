#!/usr/bin/env python3
"""Verify final database state for linear-T16."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T16"
CHECKS: list[tuple[str, str]] = [
    (
        "milestone_created",
        "SELECT EXISTS (SELECT 1 FROM project_milestones WHERE project_id = 'prj-api-hardening' AND name = 'Snapshot contract demo freeze' AND target_date = DATE '2026-05-20' AND status = 'in_progress')",
    ),
    (
        "project_priority_and_health",
        "SELECT EXISTS (SELECT 1 FROM projects WHERE id = 'prj-api-hardening' AND priority = 'high' AND health = 'at_risk')",
    ),
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
