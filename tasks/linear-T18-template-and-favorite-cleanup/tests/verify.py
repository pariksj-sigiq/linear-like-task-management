#!/usr/bin/env python3
"""Verify final database state for linear-T18."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T18"
CHECKS: list[tuple[str, str]] = [
    (
        "template_created",
        "SELECT EXISTS (SELECT 1 FROM issue_templates WHERE team_id = 'tm_plat' AND name = 'Demo bug triage' AND created_by = 'usr_alex' AND payload_json ->> 'priority' = 'urgent' AND payload_json ->> 'estimate' = '3' AND payload_json -> 'labels' ? 'Bug' AND payload_json -> 'labels' ? 'API')",
    ),
    (
        "project_favorited",
        "SELECT EXISTS (SELECT 1 FROM favorites WHERE user_id = 'usr_alex' AND kind = 'project' AND entity_id = 'prj-billing-polish' AND sort_order = 0)",
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
