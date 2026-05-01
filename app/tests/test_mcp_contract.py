"""Contract checks for exposing the clone through an MCP-style adapter."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.test_helpers import ToolServerClient
from shared.test_helpers import assert_tool_success

client = ToolServerClient(os.getenv("TOOL_SERVER_URL", "http://localhost:8030"))


def test_tools_registry_is_mcp_tools_list_compatible():
    tools = client.tools()
    names = {tool["name"] for tool in tools}
    required = {
        "search_issues",
        "get_issue",
        "create_issue",
        "update_issue",
        "add_issue_comment",
        "search_projects",
        "create_project",
        "post_project_update",
        "list_notifications",
        "mark_notification_read",
        "snooze_notification",
        "global_search",
    }

    assert required <= names
    for tool in tools:
        assert isinstance(tool["name"], str) and tool["name"]
        assert isinstance(tool["description"], str) and tool["description"]
        assert tool["input_schema"]["type"] == "object"


def test_mcp_tools_call_payload_can_passthrough_to_step_contract():
    payload = {"name": "get_issue", "arguments": {"id": "ENG-1"}}
    result = assert_tool_success(client.step(payload["name"], payload["arguments"]))["structured_content"]

    assert result["issue"]["key"] == "ENG-1"


def test_generated_api_key_authenticates_step_calls():
    created = assert_tool_success(
        client.step(
            "create_api_key",
            {
                "name": f"MCP demo smoke key {int(time.time() * 1000)}",
                "workspace_id": "wks_tasks",
                "created_by": "usr_alex",
                "agent_name": "MCP demo",
                "scopes": ["read", "write"],
            },
        )
    )["structured_content"]
    token = created.get("token")
    assert token

    import requests

    invalid = client.step("get_issue", {"id": "ENG-1"})
    assert_tool_success(invalid)

    response = requests.post(
        f"{client.base_url}/step",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": {"tool_name": "get_issue", "parameters": {"id": "ENG-1"}}},
        timeout=30,
    )
    response.raise_for_status()
    result = assert_tool_success(response.json())["structured_content"]

    assert result["issue"]["key"] == "ENG-1"

    rejected = requests.post(
        f"{client.base_url}/step",
        headers={"Authorization": "Bearer not-a-real-key"},
        json={"action": {"tool_name": "get_issue", "parameters": {"id": "ENG-1"}}},
        timeout=30,
    )
    rejected.raise_for_status()
    assert rejected.json()["observation"]["is_error"] is True
