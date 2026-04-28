#!/usr/bin/env python3
"""Verify final database state for linear-T06."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T06'
CHECKS: list[tuple[str, str]] = [('two_targets_in_w19', "SELECT COUNT(*) = 2 FROM issues WHERE identifier IN ('LIN-140','LIN-141') AND cycle_id = 'cyc-platform-w19'"), ('distractor_still_w18', "SELECT EXISTS (SELECT 1 FROM issues WHERE identifier = 'LIN-142' AND cycle_id = 'cyc-platform-w18')"), ('lin140_scope_comment', "SELECT EXISTS (SELECT 1 FROM issues i JOIN comments c ON c.issue_id = i.id WHERE i.identifier = 'LIN-140' AND c.body ILIKE '%scope control%')"), ('lin141_scope_comment', "SELECT EXISTS (SELECT 1 FROM issues i JOIN comments c ON c.issue_id = i.id WHERE i.identifier = 'LIN-141' AND c.body ILIKE '%scope control%')"), ('no_done_status_for_deferred', "SELECT NOT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier IN ('LIN-140','LIN-141') AND s.name = 'Done')")]


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
