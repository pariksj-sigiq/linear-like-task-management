"""Shared test helpers for SaaS clone tool servers.

Provides fixtures and assertion utilities for unit tests and Playwright e2e tests.
"""

from __future__ import annotations

import time
from typing import Any

import requests


class ToolServerClient:
    """HTTP client for testing a tool server."""

    def __init__(self, base_url: str = "http://localhost:8030"):
        self.base_url = base_url

    def health(self) -> dict[str, str]:
        resp = requests.get(f"{self.base_url}/health", timeout=5)
        resp.raise_for_status()
        return resp.json()

    def tools(self) -> list[dict[str, Any]]:
        resp = requests.get(f"{self.base_url}/tools", timeout=5)
        resp.raise_for_status()
        return resp.json()["tools"]

    def step(self, tool_name: str, parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        resp = requests.post(
            f"{self.base_url}/step",
            json={"action": {"tool_name": tool_name, "parameters": parameters or {}}},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def reset(self) -> dict[str, Any]:
        resp = requests.post(f"{self.base_url}/reset", timeout=30)
        resp.raise_for_status()
        return resp.json()

    def snapshot(self) -> dict[str, Any]:
        resp = requests.get(f"{self.base_url}/snapshot", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def wait_for_ready(self, timeout_s: int = 60) -> None:
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            try:
                self.health()
                return
            except (requests.ConnectionError, requests.HTTPError):
                time.sleep(1)
        raise TimeoutError(f"Tool server not ready after {timeout_s}s")


def assert_tool_success(result: dict[str, Any]) -> dict[str, Any]:
    """Assert a /step response is not an error and return the observation."""
    obs = result["observation"]
    assert not obs["is_error"], f"Tool returned error: {obs.get('text')}"
    return obs


def assert_tool_error(result: dict[str, Any]) -> dict[str, Any]:
    """Assert a /step response IS an error and return the observation."""
    obs = result["observation"]
    assert obs["is_error"], f"Expected error but got success: {obs.get('text')}"
    return obs
