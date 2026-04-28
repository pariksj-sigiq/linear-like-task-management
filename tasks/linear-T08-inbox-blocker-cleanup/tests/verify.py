#!/usr/bin/env python3
"""Verify final database state for linear-T08."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T08'
CHECKS: list[tuple[str, str]] = [('non_blocker_one_archived', "SELECT EXISTS (SELECT 1 FROM inbox_notifications WHERE id = 'notif-alex-001' AND status = 'archived' AND read_at IS NOT NULL AND archived_at IS NOT NULL)"), ('non_blocker_two_archived', "SELECT EXISTS (SELECT 1 FROM inbox_notifications WHERE id = 'notif-alex-002' AND status = 'archived' AND read_at IS NOT NULL AND archived_at IS NOT NULL)"), ('blocker_one_still_unread', "SELECT EXISTS (SELECT 1 FROM inbox_notifications WHERE id = 'notif-alex-blocker-001' AND status = 'unread' AND read_at IS NULL AND archived_at IS NULL)"), ('blocker_two_still_unread', "SELECT EXISTS (SELECT 1 FROM inbox_notifications WHERE id = 'notif-alex-blocker-002' AND status = 'unread' AND read_at IS NULL AND archived_at IS NULL)"), ('alex_owns_all_four', "SELECT COUNT(*) = 4 FROM inbox_notifications n JOIN users u ON u.id = n.user_id WHERE n.id IN ('notif-alex-001','notif-alex-002','notif-alex-blocker-001','notif-alex-blocker-002') AND u.username = 'alex.rivera'")]


def emit(reward: float, checks: dict[str, bool] | None = None, error: str | None = None) -> None:
    payload: dict[str, Any] = {"task_id": TASK_ID, "reward": float(reward), "checks": checks or {}}
    if error:
        payload["error"] = error
    print(json.dumps(payload, sort_keys=True))


def main() -> None:
    try:
        import psycopg2
    except Exception as exc:  # pragma: no cover - environment guard
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
