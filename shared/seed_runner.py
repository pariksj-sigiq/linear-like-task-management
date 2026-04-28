"""Shared seed runner utilities for SaaS clone environments.

Provides wait_for_health(), call_tool(), and verify_seed() — used by every
clone's seed container to populate the database through the tool server API.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import requests


def wait_for_health(
    url: str,
    *,
    timeout_s: int = 300,
    interval_s: int = 2,
) -> None:
    """Block until the tool server health endpoint returns 200."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                print(f"[seed] Tool server healthy: {url}")
                return
        except requests.ConnectionError:
            pass
        time.sleep(interval_s)
    print(f"[seed] ERROR: Tool server not healthy after {timeout_s}s: {url}")
    sys.exit(1)


def call_tool(
    tool_server_url: str,
    tool_name: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """Call a tool via POST /step and return the observation."""
    resp = requests.post(
        f"{tool_server_url}/step",
        json={"action": {"tool_name": tool_name, "parameters": parameters}},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    obs = result.get("observation", {})
    if obs.get("is_error"):
        print(f"[seed] WARNING: {tool_name} returned error: {obs.get('text')}")
    return result


def load_json(path: str | Path) -> list[dict[str, Any]]:
    """Load a JSON fixture file."""
    with open(path) as f:
        return json.load(f)


def verify_seed(tool_server_url: str, expected_tools: list[str] | None = None) -> None:
    """Basic post-seed verification: check health and tool availability."""
    resp = requests.get(f"{tool_server_url}/health", timeout=5)
    assert resp.status_code == 200, f"Health check failed: {resp.status_code}"

    resp = requests.get(f"{tool_server_url}/tools", timeout=5)
    assert resp.status_code == 200, f"Tools endpoint failed: {resp.status_code}"
    tools = resp.json().get("tools", [])
    tool_names = {t["name"] for t in tools}
    print(f"[seed] Verified {len(tools)} tools available: {sorted(tool_names)}")

    if expected_tools:
        missing = set(expected_tools) - tool_names
        if missing:
            print(f"[seed] WARNING: Expected tools not found: {missing}")

    resp = requests.get(f"{tool_server_url}/snapshot", timeout=10)
    if resp.status_code == 200:
        snapshot = resp.json()
        print(f"[seed] Snapshot: {snapshot.get('human_readable', 'ok')}")
    else:
        print("[seed] WARNING: /snapshot not available")

    print("[seed] Seed verification complete.")
