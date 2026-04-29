#!/usr/bin/env python3
"""Verify final database state for linear-T02."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T02'
CHECKS: list[tuple[str, str]] = [('three_named_children_exist', "SELECT COUNT(*) = 3 FROM issues child JOIN issues parent ON parent.id = child.parent_id WHERE parent.identifier = 'LIN-104' AND child.title IN ('Expose /tools coverage summary','Wire /snapshot completeness check','Document tool error contracts')"), ('children_assigned_to_maya', "SELECT COUNT(*) = 3 FROM issues child JOIN issues parent ON parent.id = child.parent_id JOIN users u ON u.id = child.assignee_id WHERE parent.identifier = 'LIN-104' AND child.title IN ('Expose /tools coverage summary','Wire /snapshot completeness check','Document tool error contracts') AND u.username = 'maya.patel'"), ('children_in_backend_coverage', "SELECT COUNT(*) = 3 FROM issues child JOIN issues parent ON parent.id = child.parent_id WHERE parent.identifier = 'LIN-104' AND child.project_id = 'prj-api-hardening' AND child.title IN ('Expose /tools coverage summary','Wire /snapshot completeness check','Document tool error contracts')"), ('children_in_clone_build_w18', "SELECT COUNT(*) = 3 FROM issues child JOIN issues parent ON parent.id = child.parent_id WHERE parent.identifier = 'LIN-104' AND child.cycle_id = 'cyc-platform-w18' AND child.title IN ('Expose /tools coverage summary','Wire /snapshot completeness check','Document tool error contracts')"), ('parent_not_completed', "SELECT EXISTS (SELECT 1 FROM issues i JOIN workflow_states s ON s.id = i.status_id WHERE i.identifier = 'LIN-104' AND s.name <> 'Done')")]


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
