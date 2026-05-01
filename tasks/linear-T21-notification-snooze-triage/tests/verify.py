#!/usr/bin/env python3
"""Verify final database state for linear-T21."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = "linear-T21"
CHECKS: list[tuple[str, str]] = [
    ("non_blocker_snoozed", "SELECT EXISTS (SELECT 1 FROM notifications WHERE id = 'notif-alex-001' AND snoozed_until = TIMESTAMPTZ '2026-05-02T09:00:00+00:00')"),
    ("second_non_blocker_read", "SELECT EXISTS (SELECT 1 FROM notifications WHERE id = 'notif-alex-002' AND read_at IS NOT NULL)"),
    ("blockers_untouched", "SELECT COUNT(*) = 2 FROM notifications WHERE id IN ('notif-alex-blocker-001','notif-alex-blocker-002') AND read_at IS NULL AND snoozed_until IS NULL AND archived_at IS NULL"),
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
