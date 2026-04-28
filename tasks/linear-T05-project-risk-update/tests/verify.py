#!/usr/bin/env python3
"""Verify final database state for linear-T05."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T05'
CHECKS: list[tuple[str, str]] = [('project_health_at_risk', "SELECT EXISTS (SELECT 1 FROM projects WHERE id = 'prj-api-hardening' AND health = 'at_risk')"), ('project_status_active', "SELECT EXISTS (SELECT 1 FROM projects WHERE id = 'prj-api-hardening' AND status = 'active')"), ('update_health_at_risk', "SELECT EXISTS (SELECT 1 FROM project_updates WHERE project_id = 'prj-api-hardening' AND health = 'at_risk')"), ('update_mentions_oauth', "SELECT EXISTS (SELECT 1 FROM project_updates WHERE project_id = 'prj-api-hardening' AND body ILIKE '%OAuth callback%')"), ('update_mentions_rollback_and_maya', "SELECT EXISTS (SELECT 1 FROM project_updates WHERE project_id = 'prj-api-hardening' AND body ILIKE '%rollback plan%' AND body ILIKE '%Maya%')")]


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
