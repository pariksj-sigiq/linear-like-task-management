#!/usr/bin/env python3
"""Apply the golden end-state for linear-T17 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T17"


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(f"{TOOL_SERVER_URL}/step", json={"action": {"tool_name": tool_name, "parameters": parameters}}, timeout=30)
    response.raise_for_status()
    observation = response.json().get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation.get("structured_content") or {}


def main() -> None:
    call_tool(
        "create_project_status",
        {"workspace_id": "wks_tasks", "name": "Demo Review", "category": "active", "color": "#8B5CF6", "position": 65},
    )
    label = call_tool("create_label", {"team_id": "tm_plat", "name": "Demo Review", "color": "#8B5CF6"})
    call_tool("add_project_label", {"project_id": "prj-launch-readiness", "label_id": label["id"]})
    call_tool("update_project", {"id": "prj-launch-readiness", "state": "demo_review"})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 4}))


if __name__ == "__main__":
    main()
