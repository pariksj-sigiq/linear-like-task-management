#!/usr/bin/env python3
"""Apply the golden end-state for linear-T23 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T23"


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
        "update_user_preferences",
        {"user_id": "usr_alex", "theme": "Dark", "compact_issue_rows": True, "sidebar_counts": False},
    )
    call_tool(
        "create_api_key",
        {
            "name": "Demo smoke evaluator",
            "workspace_id": "wks_tasks",
            "created_by": "usr_alex",
            "scopes": ["read", "write"],
            "agent_name": "CUA smoke",
        },
    )
    call_tool("record_setting_action", {"page_key": "api", "action": "created-demo-smoke-key", "actor_id": "usr_alex"})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 3}))


if __name__ == "__main__":
    main()
