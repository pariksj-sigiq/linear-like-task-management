# QA Report - Linear Clone

## Status

Health rating: green.

The Linear clone is implemented across backend tools, Postgres schema, deterministic seed data, React UI, unit tests, e2e tests, and CUA task verifiers.

The seeded Linear workspace is themed around the real clone-build plan: backend tool coverage, UI fidelity, task authoring, QA automation, submission packaging, and review handoff work.

## Validation Evidence

| Gate | Result |
|---|---|
| `python3 -m py_compile app/server.py app/schema.py app/models.py app/seed/seed_app.py app/tests/test_tools.py app/tests/e2e/test_linear_clone.py` | pass |
| `npm run build` in `app/frontend` | pass |
| `make up` | pass |
| `make seed` | pass; 118 tools, 116 issues, 9 projects, 12 cycles |
| `make test` | pass; 16 backend tests, 7 Playwright tests |
| `make validate` | pass; tool counter reports 118 tools |
| `tasks/smoke_test.py` with reset/seed between tasks | pass; T01-T15 all `0.0 -> 1.0` |

## UI Coverage

Core verified surfaces:

- Login/logout
- Linear-style sidebar and topbar
- My Issues
- Team issue list and board toggle
- Issue detail, comments, relations, sub-issues
- Quick create modal
- Projects and project detail updates
- Cycles
- Saved views
- Inbox
- Command palette
- Settings, roadmap, initiatives, archive stubs

## Backend Coverage

The tool server exposes 118 tools including native and compatibility aliases. Tier 1 tools cover issues, labels, workflow states, comments, relations, projects, cycles, saved views, inbox, global search, favorites, templates, initiatives, customers, reset, and snapshot.

## Fixed During QA

- Added compatibility aliases for generated task names such as `create_saved_view`, `list_inbox`, `command_palette_action`, `add_issue_comment`, and `add_issue_relation`.
- Added deterministic task fixtures for exact `LIN-*`, `prj-*`, `cyc-*`, and notification IDs.
- Fixed sub-issue creation to infer `team_id` from `parent_identifier`.
- Added SPA fallback serving so deep routes like `/team/eng/all` and `/issue/ENG-1` load correctly.
- Updated `validate.sh` to count tuple-based `TOOL_DEFS` accurately.
- Replaced starter e2e tests with Linear smoke coverage.

## Residual Notes

- The frontend was retuned against the logged-in Linear light-theme My Issues activity surface; remaining proprietary data/content is represented with deterministic seeded clone data.
- Tier 2 surfaces are rendered as navigable stubs with real shell context and seed-backed snapshot data.
- The Docker build prints npm deprecation/audit warnings from dependency versions; these do not block build or tests.

## Settings QA Addendum - 2026-04-30

Health rating for settings: yellow.

This addendum supersedes the earlier note that settings were only Tier 2 stubs. A focused settings pass is now tracked in [`SETTINGS_QA_REPORT.md`](./SETTINGS_QA_REPORT.md).

Current settings state:

- Fully connected settings: Preferences, Profile, Notifications, Workspace, Teams/workflow states, Members, Labels, Templates, Project statuses, API keys, AI agent keys.
- Functional fallback settings: Security, Connected accounts, Agent personalization, SLAs, Project updates, Integrations, Billing, and remaining feature settings now have clickable controls persisted through `settings_actions` via `/step`.
- Current risk: fallback settings are functional but not yet page-specific enough for hard CUA tasks unless their domain tables are promoted from `settings_actions` into first-class schema.
- Required before final handoff: restart/reload the backend so `record_setting_action` and `list_setting_actions` are live, then run a settings smoke test that clicks a safe setting, refreshes, and verifies the value is read back from Postgres.

Recommended next settings loop:

1. Use real Linear screenshots in `spec/screenshots/settings-reference/` as page-by-page references.
2. Capture current clone screenshots under `spec/screenshots/settings-current/`.
3. For each page, compare visible layout and active states, then fix with Vite HMR.
4. For each visible control, verify `click -> /step write -> refresh -> value persists`.
5. Promote any fallback surface used by a task into a domain-specific table/tool/UI before task authoring.
