#!/usr/bin/env python3
"""Apply the golden end-state for linear-T14 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = 'linear-T14'
CREATE_ISSUE_ARGS: dict[str, Any] = {
    'team_key': 'PLAT',
    'title': 'Launch checklist for docs handoff',
    'description': 'Track launch docs handoff checklist.',
    'priority': 'medium',
    'assignee_username': 'priya.shah',
    'status_name': 'Todo',
    'project_id': 'prj-launch-readiness',
    'parent_identifier': 'LIN-170',
    'label_names': ['Launch', 'Docs'],
}


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(
        f"{TOOL_SERVER_URL}/step",
        json={"action": {"tool_name": tool_name, "parameters": parameters}},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    observation = payload.get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation


def main() -> None:
    created = call_tool("create_issue", CREATE_ISSUE_ARGS).get("structured_content") or {}
    created_identifier = created.get("identifier") or created.get("id")
    if not created_identifier:
        print(json.dumps({"task_id": TASK_ID, "ok": False, "error": "create_issue did not return an identifier"}))
        sys.exit(1)
    call_tool(
        "create_issue_relation",
        {
            "source_identifier": created_identifier,
            "target_identifier": "LIN-171",
            "relation_type": "related",
        },
    )
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 2}))


if __name__ == "__main__":
    main()
