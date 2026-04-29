#!/usr/bin/env python3
"""Verify final database state for linear-T04."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T04'
CHECKS: list[tuple[str, str]] = [('assigned_to_sam', "SELECT EXISTS (SELECT 1 FROM issues i JOIN users u ON u.id = i.assignee_id WHERE i.identifier = 'LIN-099' AND u.username = 'sam.chen')"), ('status_in_progress', "SELECT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-099' AND s.name = 'In Progress')"), ('has_reviewer_label', "SELECT EXISTS (SELECT 1 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.identifier = 'LIN-099' AND l.name = 'Reviewer')"), ('has_handoff_comment', "SELECT EXISTS (SELECT 1 FROM issues i JOIN comments c ON c.issue_id = i.id WHERE i.identifier = 'LIN-099' AND c.body ILIKE '%Sam owns the reviewer follow-up%')"), ('activity_recorded', "SELECT EXISTS (SELECT 1 FROM issues i JOIN activity_events a ON a.entity_id = i.id WHERE i.identifier = 'LIN-099' AND a.entity_type = 'issue')")]


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
