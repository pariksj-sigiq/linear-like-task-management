#!/usr/bin/env python3
"""Apply the golden end-state for linear-T21 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T21"


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(f"{TOOL_SERVER_URL}/step", json={"action": {"tool_name": tool_name, "parameters": parameters}}, timeout=30)
    response.raise_for_status()
    observation = response.json().get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation.get("structured_content") or {}


def main() -> None:
    call_tool("snooze_notification", {"id": "notif-alex-001", "snoozed_until": "2026-05-02T09:00:00+00:00"})
    call_tool("mark_notification_read", {"id": "notif-alex-002"})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 2}))


if __name__ == "__main__":
    main()
