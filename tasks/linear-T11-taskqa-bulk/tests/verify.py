#!/usr/bin/env python3
"""Verify final database state for linear-T11."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T11'
CHECKS: list[tuple[str, str]] = [('three_targets_high', "SELECT COUNT(*) = 3 FROM issues WHERE identifier IN ('LIN-150','LIN-151','LIN-152') AND priority = 'high'"), ('three_targets_taylor', "SELECT COUNT(*) = 3 FROM issues i JOIN users u ON u.id = i.assignee_id WHERE i.identifier IN ('LIN-150','LIN-151','LIN-152') AND u.username = 'taylor.nguyen'"), ('three_targets_w18', "SELECT COUNT(*) = 3 FROM issues WHERE identifier IN ('LIN-150','LIN-151','LIN-152') AND cycle_id = 'cyc-platform-w18'"), ('targets_not_archived', "SELECT COUNT(*) = 3 FROM issues WHERE identifier IN ('LIN-150','LIN-151','LIN-152') AND is_archived = false"), ('distractor_not_taylor_high', "SELECT NOT EXISTS (SELECT 1 FROM issues i JOIN users u ON u.id = i.assignee_id WHERE i.identifier = 'LIN-153' AND i.priority = 'high' AND u.username = 'taylor.nguyen')")]


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
