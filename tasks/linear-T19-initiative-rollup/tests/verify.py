#!/usr/bin/env python3
"""Verify final database state for linear-T19."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T19"
CHECKS: list[tuple[str, str]] = [
    (
        "initiative_created",
        "SELECT EXISTS (SELECT 1 FROM initiatives WHERE name = 'Demo readiness rollup' AND owner_id = 'usr_alex' AND state = 'active' AND target_date = DATE '2026-08-30')",
    ),
    (
        "linked_exact_project_count",
        "SELECT COUNT(*) = 3 FROM initiative_projects ip JOIN initiatives i ON i.id = ip.initiative_id WHERE i.name = 'Demo readiness rollup'",
    ),
    (
        "linked_required_projects",
        "SELECT COUNT(DISTINCT ip.project_id) = 3 FROM initiative_projects ip JOIN initiatives i ON i.id = ip.initiative_id WHERE i.name = 'Demo readiness rollup' AND ip.project_id IN ('prj-api-hardening','prj-billing-polish','prj-launch-readiness')",
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
