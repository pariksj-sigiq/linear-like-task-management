#!/usr/bin/env python3
"""Apply the golden end-state for linear-T13 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = 'linear-T13'
CALLS: list[tuple[str, dict[str, Any]]] = [('update_issue', {'identifier': 'LIN-160', 'status_name': 'In Review'}), ('create_issue_relation', {'source_identifier': 'LIN-160', 'target_identifier': 'LIN-087', 'relation_type': 'related'}), ('add_comment', {'issue_identifier': 'LIN-160', 'body': 'Board correction complete and dependency linked.'})]


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
    observations = []
    for tool_name, parameters in CALLS:
        observations.append(call_tool(tool_name, parameters).get("structured_content"))
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": len(observations)}))


if __name__ == "__main__":
    main()
