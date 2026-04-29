#!/usr/bin/env python3
"""Verify final database state for linear-T07."""

from __future__ import annotations

import json
import os
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp")
TASK_ID = 'linear-T07'
CHECKS: list[tuple[str, str]] = [('view_exists_for_alex', "SELECT EXISTS (SELECT 1 FROM saved_views v JOIN users u ON u.id = v.owner_id WHERE v.name = 'Mine: High Tooling Risk' AND u.username = 'alex.rivera')"), ('view_is_personal', "SELECT EXISTS (SELECT 1 FROM saved_views WHERE name = 'Mine: High Tooling Risk' AND scope = 'personal')"), ('view_filters_platform', "SELECT EXISTS (SELECT 1 FROM saved_views WHERE name = 'Mine: High Tooling Risk' AND filters_json::text ILIKE '%PLAT%')"), ('view_filters_api_security', "SELECT EXISTS (SELECT 1 FROM saved_views WHERE name = 'Mine: High Tooling Risk' AND filters_json::text ILIKE '%API%' AND filters_json::text ILIKE '%Security%')"), ('view_display_grouped_by_status', "SELECT EXISTS (SELECT 1 FROM saved_views WHERE name = 'Mine: High Tooling Risk' AND display_json::text ILIKE '%status%')")]


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
