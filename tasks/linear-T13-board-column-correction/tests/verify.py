#!/usr/bin/env python3
"""Verify final database state for linear-T13."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T13'
CHECKS: list[tuple[str, str]] = [('lin160_in_review', "SELECT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-160' AND s.name = 'In Review')"), ('lin161_still_in_progress', "SELECT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-161' AND s.name = 'In Progress')"), ('lin160_related_lin087', "SELECT EXISTS (SELECT 1 FROM issue_relations r JOIN issues s ON s.id = r.source_issue_id JOIN issues t ON t.id = r.target_issue_id WHERE s.identifier = 'LIN-160' AND t.identifier = 'LIN-087' AND r.relation_type = 'related')"), ('lin160_comment_present', "SELECT EXISTS (SELECT 1 FROM comments c JOIN issues i ON i.id = c.issue_id WHERE i.identifier = 'LIN-160' AND c.body ILIKE '%Board correction%')"), ('lin160_not_done', "SELECT NOT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-160' AND s.name = 'Done')")]


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
