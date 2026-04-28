#!/usr/bin/env python3
"""Verify final database state for linear-T01."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T01'
CHECKS: list[tuple[str, str]] = [('target_issues_ready_for_qa', "SELECT COUNT(DISTINCT i.identifier) = 3 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier IN ('LIN-130','LIN-131','LIN-132') AND s.name = 'Ready for QA'"), ('target_issues_have_launch_label', "SELECT COUNT(DISTINCT i.identifier) = 3 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.identifier IN ('LIN-130','LIN-131','LIN-132') AND l.name = 'Launch'"), ('target_issues_have_ready_comment', "SELECT COUNT(DISTINCT i.identifier) = 3 FROM issues i JOIN comments c ON c.issue_id = i.id WHERE i.identifier IN ('LIN-130','LIN-131','LIN-132') AND c.body ILIKE '%ready for QA%'"), ('distractor_issue_not_ready_for_qa', "SELECT NOT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-133' AND s.name = 'Ready for QA')"), ('bulk_activity_recorded', "SELECT EXISTS (SELECT 1 FROM activity_events WHERE action IN ('bulk_update_issues','bulk_apply_labels') AND details::text ILIKE '%LIN-130%')")]


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
