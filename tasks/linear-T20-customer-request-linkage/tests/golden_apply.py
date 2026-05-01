#!/usr/bin/env python3
"""Apply the golden end-state for linear-T20 through the tool server."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
TASK_ID = "linear-T20"


def call_tool(tool_name: str, parameters: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(f"{TOOL_SERVER_URL}/step", json={"action": {"tool_name": tool_name, "parameters": parameters}}, timeout=30)
    response.raise_for_status()
    observation = response.json().get("observation", {})
    if observation.get("is_error"):
        print(json.dumps({"task_id": TASK_ID, "ok": False, "tool": tool_name, "error": observation.get("text")}))
        sys.exit(1)
    return observation.get("structured_content") or {}


def main() -> None:
    customers = call_tool("search_customers", {"query": "Collinear Review", "limit": 5})["customers"]
    customer = next(row for row in customers if row["name"] == "Collinear Review")
    request = call_tool(
        "create_customer_request",
        {
            "customer_id": customer["id"],
            "issue_id": "iss_lin_087",
            "requester_name": "Casey Stone",
            "body": "Needs rollback proof before assessment signoff.",
            "source": "manual",
            "important": True,
        },
    )
    call_tool("mark_customer_request_important", {"id": request["id"]})
    print(json.dumps({"task_id": TASK_ID, "ok": True, "calls": 3}))


if __name__ == "__main__":
    main()
