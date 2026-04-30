"""Contract checks for exposing the clone through an MCP-style adapter."""

from __future__ import annotations

import os
import sys
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
