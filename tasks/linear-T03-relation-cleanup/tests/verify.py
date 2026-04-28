#!/usr/bin/env python3
"""Verify final database state for linear-T03."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T03'
CHECKS: list[tuple[str, str]] = [('lin087_blocks_lin121', "SELECT EXISTS (SELECT 1 FROM issue_relations r JOIN issues s ON s.id = r.source_issue_id JOIN issues t ON t.id = r.target_issue_id WHERE s.identifier = 'LIN-087' AND t.identifier = 'LIN-121' AND r.relation_type = 'blocks')"), ('lin122_duplicates_lin087', "SELECT EXISTS (SELECT 1 FROM issue_relations r JOIN issues s ON s.id = r.source_issue_id JOIN issues t ON t.id = r.target_issue_id WHERE s.identifier = 'LIN-122' AND t.identifier = 'LIN-087' AND r.relation_type = 'duplicates')"), ('no_reverse_blocker', "SELECT NOT EXISTS (SELECT 1 FROM issue_relations r JOIN issues s ON s.id = r.source_issue_id JOIN issues t ON t.id = r.target_issue_id WHERE s.identifier = 'LIN-121' AND t.identifier = 'LIN-087' AND r.relation_type = 'blocks')"), ('lin121_comment_explains_blocked', "SELECT EXISTS (SELECT 1 FROM comments c JOIN issues i ON i.id = c.issue_id WHERE i.identifier = 'LIN-121' AND c.body ILIKE '%blocked by LIN-087%')"), ('lin122_comment_explains_duplicate', "SELECT EXISTS (SELECT 1 FROM comments c JOIN issues i ON i.id = c.issue_id WHERE i.identifier = 'LIN-122' AND c.body ILIKE '%duplicate of LIN-087%')")]


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
