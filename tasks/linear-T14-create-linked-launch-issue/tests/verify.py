#!/usr/bin/env python3
"""Verify final database state for linear-T14."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T14'
CHECKS: list[tuple[str, str]] = [('new_child_exists', "SELECT EXISTS (SELECT 1 FROM issues child JOIN issues parent ON parent.id = child.parent_id WHERE child.title = 'Launch checklist for docs handoff' AND parent.identifier = 'LIN-170')"), ('assigned_to_priya', "SELECT EXISTS (SELECT 1 FROM issues i JOIN users u ON u.id = i.assignee_id WHERE i.title = 'Launch checklist for docs handoff' AND u.username = 'priya.shah')"), ('in_launch_project', "SELECT EXISTS (SELECT 1 FROM issues WHERE title = 'Launch checklist for docs handoff' AND project_id = 'prj-launch-readiness')"), ('has_launch_and_docs_labels', "SELECT COUNT(DISTINCT l.name) = 2 FROM issues i JOIN issue_labels il ON il.issue_id = i.id JOIN labels l ON l.id = il.label_id WHERE i.title = 'Launch checklist for docs handoff' AND l.name IN ('Launch','Docs')"), ('related_to_lin171', "SELECT EXISTS (SELECT 1 FROM issue_relations r JOIN issues s ON s.id = r.source_issue_id JOIN issues t ON t.id = r.target_issue_id WHERE s.title = 'Launch checklist for docs handoff' AND t.identifier = 'LIN-171' AND r.relation_type = 'related')")]


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
