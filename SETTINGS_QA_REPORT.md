# Settings QA Report

Date: 2026-04-30
Scope: Linear settings surfaces in `app/frontend/src/pages/SettingsPages.tsx`
Method: Pipeline-aligned build -> audit -> fix loop from `pipeline/build/AUTONOMOUS_WORKFLOW.md` and `pipeline/qa/QA_AUDIT.md`.

## Summary

Health: yellow.

The settings area now has a stronger baseline: key Tier 1 pages are connected to real `/step` tools and Postgres, and Tier 2 pages are no longer dead UI. The remaining risk is fidelity depth: several pages need page-specific Linear layouts rather than generic rows. The API page has gone through the first real-app comparison pass and is the current best template for how each remaining settings page should be handled.

## Phase 0 - Error contract

Frontend API client: `app/frontend/src/api.ts` via `readTool(...)` and `callTool(...)`.

Working contract for settings:
- UI mutations should call `callTool` or `readTool` against `/step`.
- A visible success status should be shown by the page-level `mutate(...)` wrapper.
- Persisted settings-like actions are recorded via `record_setting_action` and loaded via `list_setting_actions`.
- For high-value domain objects, prefer domain tables/tools over generic `settings_actions`.

Risk still to audit: whether all call sites branch on `observation.is_error`. This should be Phase 2/3 work before final packaging.

## Phase 1.5 - Settings reachability map

| Settings surface | UI route | Current backend path | Status | Notes |
|---|---|---|---|---|
| Preferences | `/settings/account/preferences` | `get_user_preferences`, `update_user_preferences` | reachable | Real persisted preferences; changes affect app preferences. |
| Profile | `/settings/account/profile` | `update_user` | reachable | Updates user row used elsewhere. |
| Notifications | `/settings/account/notifications` | `update_user_preferences` | reachable | Preference-backed notification controls. |
| Workspace | `/settings/workspace` | `update_workspace` | reachable | Real workspace row. |
| Teams | `/settings/teams` | `create_workflow_state` | reachable | Adds real workflow states used by issue flows. |
| Members | `/settings/members` | `create_user`, `add_team_member` | reachable | Adds real users and team memberships. |
| Project statuses | `/settings/project-statuses` | `create_project_status`, `list_project_statuses` | reachable | Real project status options. |
| Labels | `/settings/issue-labels`, `/settings/project-labels` | `create_label` | reachable | Real labels; still shared between issue/project pages. |
| Templates | `/settings/issue-templates`, `/settings/project-templates` | `create_template` | reachable | Real templates; needs richer editor later. |
| API | `/settings/api` | `create_api_key`, `list_api_keys`, `record_setting_action` | reachable | Linear-like layout; API key creation persists. OAuth/webhook rows persist via settings action log. |
| AI & Agents | `/settings/ai` | `create_api_key`, `list_api_keys` | reachable | Functional agent-key creation; needs deeper Linear comparison pass. |
| Security & access | `/settings/account/security` | `record_setting_action` | reachable fallback | Functional but generic; needs session/passkey-specific schema if tasks target it. |
| Connected accounts | `/settings/account/connections` | `record_setting_action` | reachable fallback | Clicks persist; no external integration model yet. |
| Agent personalization | `/settings/account/agents` | `record_setting_action` | reachable fallback | Clicks persist; no profile prompt model yet. |
| SLAs | `/settings/sla` | `record_setting_action` | reachable fallback | Functional controls; no SLA domain table yet. |
| Project updates | `/settings/project-updates` | `record_setting_action` | reachable fallback | Functional controls; no update-policy table yet. |
| Integrations | `/settings/integrations` | `record_setting_action` | reachable fallback | Verified safe click changed state. |
| Billing | `/settings/billing` | `record_setting_action` | reachable fallback | Functional controls; no plan/subscription model yet. |
| Other feature pages | initiatives/docs/customers/pulse/asks/emojis | `record_setting_action` | reachable fallback | Clickable and persisted, but Tier 2 fidelity only. |

## Phase 1 - UI walkthrough status

| Page | Real reference | Clone status | Result |
|---|---|---|---|
| Preferences | `spec/screenshots/settings-reference/01-preferences.png` | clone route renders real controls | needs polish pass for exact type/spacing. |
| API | real browser screenshot from Linear `/settings/api` | clone has matching section order and active-key card | pass for structure, continue pixel polish. |
| Integrations | `spec/screenshots/settings-reference/15-integrations.png` | clone has clickable status rows | functional fallback; needs real Linear comparison. |
| Members | `spec/screenshots/settings-reference/17-members.png` | clone creates real users | functional; needs table/card fidelity pass. |
| AI & Agents | `spec/screenshots/settings-reference/14-ai-agents.png` | clone creates agent API keys | functional; needs page-specific Linear comparison. |

## Phase 2 - Optimistic mutation audit

Not completed in this pass. Required next grep:
- `await callTool(` and `await readTool(` callers in settings and shared app components.
- Confirm `is_error` is surfaced and not silently treated as success.

## Phase 3 - Silent failure scan

Not completed in this pass. Required next grep:
- `.catch(() => {})`
- empty `catch` blocks
- fire-and-forget settings mutations.

## Task Impact

Existing settings-related tasks should avoid Tier 2 fallback pages until a page-specific domain model exists. Safe task surfaces today:
- Preferences
- Profile
- Members
- Workspace
- Teams/workflow states
- Project statuses
- Labels/templates
- API key creation
- AI agent key creation

At-risk task surfaces:
- Security/passkeys/sessions
- Billing/plan changes
- OAuth applications and webhooks beyond simple creation rows
- SLA policy configuration
- External integrations that imply real third-party auth

## Recommended fixes

P0:
- Restart backend after schema/tool changes so `settings_actions`, `record_setting_action`, and `list_setting_actions` are live.
- Add a final settings smoke test that clicks a safe Tier 2 control, refreshes, and verifies the persisted state returns.

P1:
- Run real-vs-clone screenshot loop for each settings page using the existing `spec/screenshots/settings-reference` references.
- Replace generic fallback UI with page-specific Linear layouts for Security, Connected accounts, Integrations, Billing, and AI & Agents.
- Add direct Postgres-backed tables if tasks will target OAuth applications, webhooks, billing, SLAs, sessions, or integration installs.

P2:
- Add screenshot index for current clone settings pages under `spec/screenshots/settings-current/`.
- Add a small matrix in `FEATURE_INVENTORY.md` separating fully-real settings from Tier 2 functional placeholders.
