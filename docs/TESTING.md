# Testing

Runner: `pytest` for unit + e2e. `make test` runs both. Playwright is wrapped by `pytest-playwright`.

Current submitted snapshot: `make test` covers backend unit tests and Playwright UI tests. Recount with `pytest --collect-only` if adding or removing tests.

## Files

| Path | What it covers |
|---|---|
| `app/tests/test_tools.py` | Tool server unit tests: health, `/tools` exposes Linear surface, login, issue CRUD, sub-issues, labels, relations, project progress, cycle metrics, saved views, notifications, global search, snapshot/reset. |
| `app/tests/test_mcp_contract.py` | `/tools` registry is MCP `tools/list` compatible; `tools/call` payloads can passthrough to `/step`. |
| `app/tests/test_workflows_api.py` | Multi-step API workflows: issue lifecycle, project creation + linking, inbox + command palette API surfaces. |
| `app/tests/test_demo_api_parity.py` | Issue-assignment / project / label / cycle / notification reproducibility via API. Exists so UI-demo features can be proven identical through API. |
| `app/tests/e2e/test_linear_clone.py` | Base Playwright suite: login, command palette, issue list+board, comments, sub-issues, quick create, property pickers, My Issues tabs, projects, inbox+settings stubs. |
| `app/tests/e2e/test_assignment_workflows.py` | Quick create persists assignment+project+priority+label; detail picker persists to filters; project creation flow. |
| `app/tests/e2e/test_workflow_suite.py` | Primary routes render without console errors; create→assign→label→filter end-to-end; inbox read API persistence. |

## Running

```bash
make test                # unit + e2e
make test-unit           # just app/tests/test_*.py
make test-e2e            # just app/tests/e2e/

# Run all CUA task smoke checks
TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null' \
  .venv/bin/python tasks/smoke_test.py

# Target a single test:
cd app && .venv/bin/python -m pytest tests/test_tools.py::TestSearch::test_search_issues_returns_seeded_issue_keys -v

# Playwright with headed browser:
cd app && .venv/bin/python -m pytest tests/e2e/test_linear_clone.py --headed
```

E2E tests assume `make up && make seed` completed and app is reachable at `http://localhost:8030`. Run `make seed` between e2e passes for deterministic state.

## Linting

```bash
make lint
# cd app && python -m ruff check .
# cd app/frontend && npm run lint
```

Lint is non-blocking in the Makefile (`|| true`). Run manually when touching code.

## Playwright conventions

- Selectors via `page.get_by_test_id("...")` matching `data-testid` listed in `spec/RESEARCH.md` "Page Layout Specs".
- Prefer role-based queries for headings and buttons; test-ids for rows and pickers.
- Always wait for the observation to land before asserting (`page.wait_for_response(...)` or an explicit visible-state wait). Optimistic UI without await → flake.
- Use `page.evaluate("() => window.fetch('/reset', {method:'POST'}))")` sparingly — prefer `make seed` between test files.

## Contract test (MCP)

`test_mcp_contract.py:17 test_tools_registry_is_mcp_tools_list_compatible` validates:

- Every `TOOL_DEFS` entry has `name`, `description`, `input_schema`.
- `input_schema` is a JSON Schema object.

`test_mcp_tools_call_payload_can_passthrough_to_step_contract` validates an MCP-shaped `tools/call` body works against `/step` without adapter code.

If you add a tool, this test will flag missing metadata.

## Validate

```bash
make validate   # runs scripts/validate.sh
```

Checks layout (vite vs next backend), counts tools in `TOOL_DEFS`, verifies README + spec docs exist. Must pass before delivery.

## Snapshot sanity

```bash
curl -s http://localhost:8030/snapshot | .venv/bin/python -m json.tool | head
```

Returns counts + sample rows. Use when debugging seed or verifier mismatches.

## Gotchas

- `test_tools.py` uses a shared app client fixture. Tests mutate DB. Order matters unless each test cleans up — many rely on seed baseline, so run `make seed` before `make test-unit`.
- Playwright in CI: flaky on first load; the e2e suite runs `make seed` in fixtures (check individual files).
- Don't add tests that `wait_for(timeout=30000)` — if 2s isn't enough, fix the page, not the test.
