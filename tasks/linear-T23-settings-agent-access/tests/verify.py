#!/usr/bin/env python3
"""Verify final database state for linear-T23."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T23"
CHECKS: list[tuple[str, str]] = [
    ("preferences_updated", "SELECT EXISTS (SELECT 1 FROM user_preferences WHERE user_id = 'usr_alex' AND theme = 'Dark' AND compact_issue_rows IS TRUE AND sidebar_counts IS FALSE)"),
    ("api_key_created", "SELECT EXISTS (SELECT 1 FROM api_keys WHERE workspace_id = 'wks_tasks' AND name = 'Demo smoke evaluator' AND created_by = 'usr_alex' AND agent_name = 'CUA smoke' AND scopes = 'read,write' AND revoked_at IS NULL)"),
    ("setting_action_recorded", "SELECT EXISTS (SELECT 1 FROM settings_actions WHERE page_key = 'api' AND action = 'created-demo-smoke-key' AND actor_id = 'usr_alex')"),
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
