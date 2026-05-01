#!/usr/bin/env python3
"""Apply the golden end-state for linear-T16 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T16"


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(
        f"{TOOL_SERVER_URL}/step",
        json={"action": {"tool_name": tool_name, "parameters": parameters}},
        timeout=30,
    )
    response.raise_for_status()
    observation = response.json().get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation.get("structured_content") or {}


def main() -> None:
    projects = call_tool("search_projects", {"query": "Backend Tool Server Coverage", "limit": 10})["projects"]
    project = next(row for row in projects if row["id"] == "prj-api-hardening")
    call_tool(
        "create_milestone",
        {
            "project_id": project["id"],
            "name": "Snapshot contract demo freeze",
            "description": "Freeze the snapshot contract before the demo smoke pass.",
            "target_date": "2026-05-20",
            "status": "in_progress",
            "sort_order": 4,
        },
    )
    call_tool("update_project", {"id": project["id"], "priority": "high", "health": "at_risk"})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 3}))


if __name__ == "__main__":
    main()
