#!/usr/bin/env python3
"""Apply the golden end-state for linear-T24 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T24"


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(f"{TOOL_SERVER_URL}/step", json={"action": {"tool_name": tool_name, "parameters": parameters}}, timeout=30)
    response.raise_for_status()
    observation = response.json().get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation.get("structured_content") or {}


def main() -> None:
    cycle = call_tool(
        "create_cycle",
        {"team_id": "tm_plat", "number": 20, "name": "Clone Smoke W20", "start_date": "2026-05-18", "end_date": "2026-05-31", "state": "upcoming"},
    )
    call_tool("set_cycle", {"issue_id": "iss_lin_142", "cycle_id": cycle["id"]})
    call_tool("close_cycle", {"id": "cyc-platform-w18"})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 3}))


if __name__ == "__main__":
    main()
