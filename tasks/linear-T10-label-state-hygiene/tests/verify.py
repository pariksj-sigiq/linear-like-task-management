#!/usr/bin/env python3
"""Verify final database state for linear-T10."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T10'
CHECKS: list[tuple[str, str]] = [('regression_label_exists', "SELECT EXISTS (SELECT 1 FROM labels l JOIN teams t ON t.id = l.team_id WHERE t.key = 'PLAT' AND l.name = 'Regression' AND upper(l.color) = '#EF4444' AND l.is_archived = false)"), ('ready_for_qa_state_exists', "SELECT EXISTS (SELECT 1 FROM workflow_states s JOIN teams t ON t.id = s.team_id WHERE t.key = 'PLAT' AND s.name = 'Ready for QA')"), ('lin180_has_regression', "SELECT EXISTS (SELECT 1 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.identifier = 'LIN-180' AND l.name = 'Regression')"), ('lin181_has_regression', "SELECT EXISTS (SELECT 1 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.identifier = 'LIN-181' AND l.name = 'Regression')"), ('lin182_not_regression', "SELECT NOT EXISTS (SELECT 1 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.identifier = 'LIN-182' AND l.name = 'Regression')")]


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
