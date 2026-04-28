#!/usr/bin/env python3
"""Smoke runner for Linear clone CUA tasks.

By default this runs a negative verify, then golden_apply.py, then a positive
verify for each selected task. Use TASK_SMOKE_RESET_COMMAND to reset and seed
between tasks when the Linear backend exists.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent


def task_dirs(selected: list[str]) -> list[Path]:
    all_dirs = sorted(p for p in ROOT.glob("linear-T*-*") if p.is_dir())
    if not selected:
        return all_dirs
    wanted = {s.lower() for s in selected}
    result = []
    for path in all_dirs:
        name = path.name.lower()
        if any(token in name for token in wanted):
            result.append(path)
    return result


def run_json(command: list[str], cwd: Path) -> tuple[int, dict[str, Any]]:
    proc = subprocess.run(command, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    payload: dict[str, Any] = {"raw_stdout": proc.stdout, "stderr": proc.stderr}
    if lines:
        try:
            payload.update(json.loads(lines[-1]))
        except json.JSONDecodeError:
            payload["parse_error"] = lines[-1]
    return proc.returncode, payload


def maybe_reset() -> None:
    reset_command = os.getenv("TASK_SMOKE_RESET_COMMAND")
    if reset_command:
        subprocess.run(reset_command, shell=True, check=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("tasks", nargs="*", help="Task ids or slug fragments, for example T01 launch-review")
    parser.add_argument("--negative-only", action="store_true")
    parser.add_argument("--positive-only", action="store_true")
    parser.add_argument("--no-reset", action="store_true")
    args = parser.parse_args()

    failures = []
    for task_dir in task_dirs(args.tasks):
        print(f"[smoke] {task_dir.name}")
        if not args.no_reset:
            maybe_reset()

        if not args.positive_only:
            code, payload = run_json([sys.executable, "tests/verify.py"], task_dir)
            reward = float(payload.get("reward", 0.0))
            print(json.dumps({"phase": "negative", "task": task_dir.name, "code": code, "reward": reward}))
            if reward != 0.0:
                failures.append((task_dir.name, "negative", payload))

        if args.negative_only:
            continue

        code, payload = run_json([sys.executable, "tests/golden_apply.py"], task_dir)
        print(json.dumps({"phase": "golden", "task": task_dir.name, "code": code, "ok": payload.get("ok", False)}))
        if code != 0 or not payload.get("ok", False):
            failures.append((task_dir.name, "golden", payload))
            continue

        code, payload = run_json([sys.executable, "tests/verify.py"], task_dir)
        reward = float(payload.get("reward", 0.0))
        print(json.dumps({"phase": "positive", "task": task_dir.name, "code": code, "reward": reward}))
        if reward != 1.0:
            failures.append((task_dir.name, "positive", payload))

    if failures:
        print(json.dumps({"ok": False, "failures": failures}, default=str))
        return 1
    print(json.dumps({"ok": True}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
