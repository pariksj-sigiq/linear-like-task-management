---
name: cua-moodle-odoo-accounting
description: Domain-specific learnings for generating and evaluating CUA accounting tasks on Odoo 18 ERP. Covers verified difficulty drivers, SQL verification patterns, common agent failure modes, and setup.sh pitfalls discovered through eval rounds.
argument-hint: [task idea or question]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# CUA Accounting Domain Skill (Odoo 18)

## 0z. HARD RULE — every task MUST use Option A or Option C for ground truth

**Every verifier in this task pool MUST use one of these two ground-truth strategies. Tasks that use neither will be rejected and rewritten.**

### The three unacceptable patterns

1. **Pattern E — Hardcoded expected values for DERIVED quantities.** Any hardcoded float that represents a sum, average, total, or other computed number is forbidden. These drift silently when Odoo's tax defaults, seed data, or rounding behavior changes, producing false failures. (Example of the bug class: `expected = 5 * 799.0` when biz_demo applies 15% VAT → actual is $4594.25, verifier expects $3995 → spurious fail.)
2. **Pattern D alone — Existence/state checks with silent SQL errors.** Checking `count(*) > 0` or `state = 'posted'` against a table is fine, but ONLY if the query cannot silently error. Any query that touches a JSONB column (`product_template.name`, `mail_message_subtype.name`, `account_tax.name`, etc.) or a removed column (`exclude_from_invoice_tab`) MUST be rewritten. Silent errors return empty strings that Python parses as "no match", producing spurious fails.
3. **Pattern B — Claude-as-oracle.** Do not call an LLM to compute expected values during verification. Too slow, too expensive, non-deterministic.

### The two acceptable patterns (A is preferred)

**Option A — `tests/golden_apply.py` (PREFERRED — use this whenever possible)**

A Python script that uses `odoo shell` to programmatically perform the expected agent actions via the ORM. This produces the "golden" end state that the verifier MUST accept. Because it goes through Odoo's own business logic, every computed field (`amount_total`, `amount_tax`, `payment_state`, etc.) is guaranteed consistent with what the agent would produce via the GUI.

Required deliverables for Option A:
- `tests/golden_apply.py` — piped to `odoo shell` inside the sandbox. Posts invoices, creates notes, schedules activities, whatever the task requires.
- Smoke test runs in BOTH directions:
  - **Negative**: unmodified sandbox → `verify.py` returns `0.0`
  - **Positive**: apply `golden_apply.py` → `verify.py` returns `1.0`

If the positive-direction smoke test does not return 1.0, the verifier has a bug — fix before shipping.

**Option C — Dynamic DB-sourced expected values**

For every "expected" value in the verifier, the expected is computed from a live `sql()` query at verification time instead of hardcoded. Helper functions like `get_vendor_stats(partner_id)` that return `{total, count, max, second_max, avg, earliest_date}` from SQL are encouraged.

Example (from A23 after fix):
```python
# BAD — Pattern E
original_expected = 25500.0  # pre-tax sum of lines, breaks when tax applied

# GOOD — Pattern C
orig_amount = float(sql("""
    SELECT amount_total FROM account_move
    WHERE move_type='in_invoice'
      AND partner_id=(SELECT id FROM res_partner WHERE name ILIKE '%GlobalTravel%' LIMIT 1)
      AND state='cancel' LIMIT 1
"""))
```

Option C alone is acceptable when the task doesn't need a "golden end state" reference — e.g., verifying sums of existing records, not the agent's computed values. But Option A is still preferred because it catches verifier bugs that Option C cannot (e.g., typos in check names, wrong tolerance, silent SQL errors on boilerplate queries).

### When hardcoded IS allowed (not Pattern E)

Hardcoded values are acceptable ONLY when they represent **task-definitional** inputs:
- New prices the agent is instructed to set (A17: "set Starter to $129" → `expected = 129` is correct)
- New product names the agent is instructed to create (A08: "create Quantum Dynamics partner" → `name='Quantum Dynamics'` is correct)
- Specific PO numbers from an instruction CSV (A31: agent must type "PO-2026-0451")
- Instruction-specified quantities (A01: "line should have qty 5" → `expected_qty = 5` is correct)

The rule of thumb: **if the number is stated in the instruction, hardcoding is fine. If the number is derived (sum, avg, tax-inclusive total, line count from DB), hardcoding is Pattern E and must be rewritten as Option C.**

### Enforcement in the smoke test

`smoke_test_odoo.py` MUST eventually check:
1. Negative direction — unchanged sandbox → `reward == 0.0` (already implemented)
2. Positive direction — `tests/golden_apply.py` exists and applying it → `reward == 1.0` (NEW — not yet implemented)
3. Structured JSON output parses correctly (NEW)

Until the smoke test enforces 2 and 3, task authors must run these checks manually before shipping.

### Round-1 retrospective

- 40 tasks generated
- 0 used Option A
- ~10 used Option C (partially)
- ~20 used Pattern D (existence checks)
- ~10 used Pattern E (hardcoded derived values)
- **10 produced false-fail results** due to bugs in D or E patterns (verifier crashes or wrong math)

After migration to A+C, zero-false-fail is the goal. Measured by: every task's positive-direction smoke test must return 1.0.

---

## 0a. Ground-truth verification protocol (READ FIRST — most round-1 classifications were wrong)

Eval round 1 initially reported 10 "genuine failures" and 4 "too easy" passes. After auditing, the counts were: **2 confirmed genuine failures**, ~4 tasks bugs, ~4 likely task bugs, rest too easy. **Most `reward=0.0` results turned out to be verifier bugs, not agent failures.**

Before accepting any `reward=0.0` as a genuine failure, run this protocol:

### Step 1: Smoke test the verifier in both directions (not just "returns 0 on empty sandbox")

The current `smoke_test_odoo.py` only checks that `verify.py` returns `0.0` on an unmodified sandbox. This catches "verifier trivially passes" but NOT "verifier trivially fails due to crash". You need **both directions**:

- **Negative direction** (current smoke test): unmodified sandbox → `reward == 0.0`. Catches a verifier that accepts the no-op case.
- **Positive direction** (NEW — required): programmatically apply the "correct" state via `odoo shell`, then run `verify.py` → must return `reward == 1.0`. Catches a verifier that silently rejects correct behavior (the JSONB crash, `exclude_from_invoice_tab`, `amount_total` vs `amount_untaxed`, and name-mismatch bugs would all have been caught by this).

Template for the positive direction:

```bash
# In the sandbox, apply the "golden" state via odoo shell, then run verify.py
sudo -u odoo /usr/bin/odoo shell -c /etc/odoo/odoo.conf -d biz_demo --no-http <<'PYEOF'
# Apply the expected end state programmatically (post invoices, create notes, etc.)
env['account.move'].search([('move_type','=','out_invoice'),('partner_id.name','ilike','Nexus')]).action_post()
env['mail.message'].create({
    'model': 'account.move',
    'res_id': <id>,
    'body': 'Posted as part of Q1 batch close.',
    'subtype_id': env.ref('mail.mt_note').id,  # internal Note subtype
    'message_type': 'comment',
})
env.cr.commit()
PYEOF
# Now run the verifier and expect 1.0
python3 /home/user/verify.py
# If this prints anything other than 1.0, the verifier has a bug.
```

Future task creators should include a `tests/golden_apply.py` (or embed this in a smoke test) that programmatically applies the expected end state and verifies the verifier accepts it.

### Step 2: Cross-check verifier SQL against the JSONB column list

Before accepting a verifier, grep for any `ILIKE` / `=` on these known JSONB columns (failing query silently errors out, returning empty):

- `product_template.name`
- `mail_message_subtype.name`
- `account_tax.name`
- `account_journal.name`
- `account_account.name`
- `account_payment_term.name`
- `account_analytic_account.name`
- `res_partner_category.name`
- `crm_tag.name`
- `crm_stage.name`
- `crm_team.name`
- `hr_department.name`
- `hr_job.name`
- `mail_activity_type.name`

Replace with `name::text ILIKE` (cast to text) or use a boolean column (`crm_stage.is_won`, `mail_message_subtype.internal`).

**Removed or renamed columns in Odoo 18** — any verifier referencing these will crash silently:

- `account_move_line.exclude_from_invoice_tab` — **REMOVED**
- `account_account.code` — **REMOVED**. The column is now `account_account.code_store` (per-company mapping). Use `code_store::text ILIKE '%620100%'` or query via ORM through `odoo shell`. Simple direct `WHERE code = '620100'` will fail.

**Model field changes in Odoo 18**:

- `account.payment.term.line.value` — valid values are ONLY `'percent'` or `'fixed'`. The legacy `'balance'` option is GONE. To model a "Net 45" balance line, create: `{'value': 'percent', 'value_amount': 100.0, 'delay_type': 'days_after', 'nb_days': 45}`. Writing `value='balance'` raises `ValueError: Wrong value for account.payment.term.line.value`.

- `account.move.line.display_type` — real product lines have `display_type = 'product'`, NOT `NULL`. The correct filter for "product lines only" is `display_type = 'product'` (which excludes `'line_section'`, `'line_note'`, `'payment_term'`, `'tax'`). Using `display_type IS NULL` silently returns ZERO rows in Odoo 18 — a classic silent-failure bug that masquerades as "agent didn't add line". If you need to include lines the agent might have added without a product, use `display_type NOT IN ('line_section','line_note','payment_term','tax')` instead, or filter by `product_id IS NOT NULL`.

**Float precision gotcha in structured-JSON verifiers**:

Category weights like `0.3 + 0.6 + 0.1` sum to `0.9999999999999999` in IEEE-754, not `1.0`. The pass condition `aggregate >= 1.0` silently rejects a perfect score. Use `aggregate >= 1.0 - 1e-9` instead. Discovered by A10, affects A02, A14, and any verifier with fractional weights.

**odoo shell permission gotcha**:

`odoo shell` runs as system user `odoo`, which CANNOT read `/home/user/Desktop`. For verifiers/golden_apply scripts that need to read a Desktop CSV, parse it in the wrapper process (running as root via `sudo python3`) and embed the parsed rows as a JSON literal in the shell payload. For writing Desktop files, stage in `/tmp` inside the shell, then `sudo mv` + `sudo chown user:user` from the wrapper.

When in doubt, query `information_schema.columns WHERE table_name=X` to confirm the column exists before writing verifier SQL.

### Step 3: Tax consistency — `amount_total` vs `amount_untaxed`

`biz_demo` applies a default **15% sales/purchase tax** to product lines. If the instruction says "total" but the verifier hardcodes the pre-tax expected value, the agent will score 0 even when correct. Options:

- **For task-created records**: Query the actual `amount_total` from the DB dynamically (e.g., the original invoice being reversed in a credit-note task). Don't hardcode expected totals — compute them from the DB.
- **For pre-computed expectations**: If you hardcode, use `amount_untaxed` in the verifier and say "untaxed total" in the instruction.
- **For file-extraction checks**: The agent will read whatever is on screen, usually the tax-inclusive "Total" column. Compare against `amount_total`, not `amount_untaxed`.

### Step 4: Instruction disambiguation audit

Before classifying a failure as "genuine", search the instruction for terms Odoo might interpret multiple ways:

- **"internal note"** — Odoo has BOTH a chatter "Log note" button AND a form tab literally labeled "Internal Notes". Always say "chatter Log note" explicitly.
- **"Net 30" / "Net 45"** — Odoo's default payment term is named "30 Days", not "Net 30". Either pre-seed the exact name or say "the 30-day payment term named '30 Days'".
- **"internal subtype"** — not a user-facing term. Say "Log note in the chatter".
- **"post the invoice"** — agent may select multiple and use bulk actions, or open each one. Usually works either way, but mention it explicitly if bulk is intended.

### Step 5: Minimum evidence required to classify `genuine_fail`

Don't rely on a subagent's prediction from partial trajectory. A classification of `genuine_fail` requires:

1. ✅ `reward.txt` exists in the trial dir (orchestrator completed)
2. ✅ `verifier/stdout.txt` shows `reward = 0.0` with per-check PASS/FAIL breakdown
3. ✅ Verifier SQL audited for JSONB / removed-column / tax bugs (Steps 2–3)
4. ✅ Instruction audited for ambiguity (Step 4)
5. ✅ Re-ran verifier against a golden-apply state and it returned `1.0` (Step 1, positive direction)
6. ✅ Screenshots confirm the agent's actual behavior matches the failing check's narrative (not just guesswork from the trajectory)

If any of 1–5 fails, classify as `task_bug` or `needs_reeval`, not `genuine_fail`.

### Round-1 retrospective (for context)

| Originally | After audit | Reason |
|---|---|---|
| A01 "genuine_fail" | task_bug (fixed) | UNION SQL crashed on JSONB `mail_message_subtype.name = 'Note'` |
| A06 "genuine_fail" | task_bug (fixed) | `amount_total` vs `amount_untaxed` mismatch (15% VAT) |
| A07 "genuine_fail" | task_bug (fixed) | "Net 30" doesn't exist — it's "30 Days" in Odoo defaults |
| A08 "genuine_fail" | task_bug (fixed) | JSONB `product_template.name ILIKE` crash |
| A09 "genuine_fail" | task_bug (fixed) | Instruction ambiguity: "Internal Notes" tab vs chatter Log note |
| A10 "genuine_fail" | **confirmed** | Agent wrote "Verified" on Sterling instead of "MISMATCH" |
| A11 "genuine_fail" | **needs re-eval** | Trial never completed — no reward.txt, subagent predicted from partial traj |
| A13 "genuine_fail" | task_bug (fixed) | `exclude_from_invoice_tab` column does not exist in Odoo 18 |
| A15 "genuine_fail" | task_bug (fixed) | Wrong hardcoded expected total + `exclude_from_invoice_tab` |
| A17 "genuine_fail" | task_bug (fixed) | JSONB `product_template.name ILIKE` crash |
| A20 "genuine_fail" | **confirmed** | Agent read "Tax Excluded" column, 13% off from 10% tolerance |
| A22 "genuine_fail" | task_bug (fixed) | JSONB `account_tax.name ILIKE` crash |
| A23 "genuine_fail" | task_bug (fixed) | Hardcoded pre-tax expected, actual has 15% VAT |

**Final: 2 confirmed genuine failures, 1 needs re-eval, 10 task bugs.** The eval pipeline was producing wildly inflated failure counts because verifier bugs looked identical to agent failures.

---

## 0. Required verifier output format (NEW — use this for all future task generation)

Verifiers must print a single JSON object as the final line of stdout, then also print the legacy `1.0` / `0.0` reward line for backwards compatibility with the orchestrator. The structured output lets downstream tooling do partial-credit analysis, identify which specific checks failed, and distinguish critical from non-critical failures.

### Schema

```json
{
  "reward": 0.0,
  "passed": false,
  "aggregate_score": 0.42,
  "critical_checks_passed": false,
  "critical_failures": ["post_nexus_invoice", "register_partial_payment"],
  "categories": [
    {
      "invoice_lifecycle": {
        "weight": 0.5,
        "score": 0,
        "checks": [
          {
            "name": "post_nexus_invoice",
            "passed": false,
            "critical": true,
            "failure_mode": "form_save_neglect",
            "failure_detail": "Invoice found in draft state; agent navigated away before clicking Save"
          },
          {
            "name": "post_pinnacle_invoice",
            "passed": true,
            "critical": true
          }
        ]
      }
    },
    {
      "annotations": {
        "weight": 0.5,
        "score": 0,
        "checks": [
          {
            "name": "internal_note_nexus",
            "passed": false,
            "critical": false,
            "failure_mode": "wrong_chatter_tab",
            "failure_detail": "Message found but subtype is 'Discussions' (Send message), not internal"
          }
        ]
      }
    }
  ]
}
```

### Field semantics

- **`reward`** (float, 0.0 or 1.0): The legacy binary reward. `1.0` if `passed == true`, else `0.0`. The orchestrator parses this from stdout as the final numeric line.
- **`passed`** (bool): True iff ALL critical checks passed AND `aggregate_score >= pass_threshold` (default 1.0 for all-or-nothing tasks).
- **`aggregate_score`** (float, 0.0-1.0): Weighted sum of category scores. `sum(category.weight * category.score)`. Useful for graded eval even when binary `reward` is 0.
- **`critical_checks_passed`** (bool): True iff every check with `critical: true` has `passed: true`.
- **`critical_failures`** (list of strings): Names of critical checks that failed. Empty list when `critical_checks_passed == true`.
- **`categories`** (list of single-key objects): Grouping of checks by sub-goal (e.g., `"invoice_lifecycle"`, `"annotations"`, `"file_output"`). Each category has:
  - **`weight`** (float, 0.0-1.0): Contribution to `aggregate_score`. Weights across categories should sum to 1.0.
  - **`score`** (int, 0 or 1): Binary per-category — 1 if all checks in the category passed, else 0. (Alternatively, use a fraction `passed_checks / total_checks` if you want graded category scoring; document the choice in the verifier comment.)
  - **`checks`** (list of objects): Individual verification steps.
- **Per-check fields:**
  - **`name`** (string): Unique identifier, snake_case. Used to reference the check in `critical_failures`.
  - **`passed`** (bool): Whether this check succeeded.
  - **`critical`** (bool): If `true`, failure on this check forces `passed: false` regardless of `aggregate_score`. Reserve for checks that represent the core business outcome.
  - **`failure_mode`** (string, optional): A tag from a known vocabulary (see Section 1 for patterns). Examples: `"wrong_chatter_tab"`, `"form_save_neglect"`, `"skipped_reasoning"`, `"narrow_grid_misclick"`, `"hallucinated_line_item"`, `"deep_menu_failure"`, `"jsonb_verifier_bug"`, `"amount_tax_mismatch"`, `"wrong_column_read"`. Omit when `passed == true`.
  - **`failure_detail`** (string, optional): One-line human-readable explanation of what went wrong. Should reference DB state, not verifier internals. Omit when `passed == true`.

### Minimum verifier skeleton

```python
#!/usr/bin/env python3
import json, subprocess, sys

def sql(q):
    return subprocess.run(
        ["sudo", "-u", "odoo", "psql", "-d", "biz_demo", "-tAc", q],
        capture_output=True, text=True,
    ).stdout.strip()

checks_by_category = {}

def add_check(category, name, passed, critical=False, failure_mode=None, failure_detail=None):
    if category not in checks_by_category:
        checks_by_category[category] = []
    check = {"name": name, "passed": bool(passed), "critical": bool(critical)}
    if not passed:
        if failure_mode:
            check["failure_mode"] = failure_mode
        if failure_detail:
            check["failure_detail"] = failure_detail
    checks_by_category[category].append(check)

# ─── Run your SQL checks, calling add_check(...) for each ───
state = sql("SELECT state FROM account_move WHERE ...")
add_check(
    "invoice_lifecycle",
    "post_nexus_invoice",
    passed=(state == "posted"),
    critical=True,
    failure_mode="form_save_neglect" if state == "draft" else None,
    failure_detail=f"state is '{state}', expected 'posted'" if state != "posted" else None,
)
# ... more checks ...

# ─── Build structured output ───
CATEGORY_WEIGHTS = {
    "invoice_lifecycle": 0.5,
    "annotations": 0.5,
}

categories_out = []
critical_failures = []
aggregate = 0.0
for cat_name, checks in checks_by_category.items():
    all_passed = all(c["passed"] for c in checks)
    score = 1 if all_passed else 0
    weight = CATEGORY_WEIGHTS.get(cat_name, 1.0 / len(checks_by_category))
    aggregate += weight * score
    categories_out.append({cat_name: {"weight": weight, "score": score, "checks": checks}})
    for c in checks:
        if c["critical"] and not c["passed"]:
            critical_failures.append(c["name"])

critical_ok = len(critical_failures) == 0
passed = critical_ok and aggregate >= 1.0  # strict pass = all categories perfect
reward = 1.0 if passed else 0.0

result = {
    "reward": reward,
    "passed": passed,
    "aggregate_score": round(aggregate, 4),
    "critical_checks_passed": critical_ok,
    "critical_failures": critical_failures,
    "categories": categories_out,
}

# Print structured JSON first so it lands in stdout for downstream parsing
print(json.dumps(result))
# Then print the legacy reward line (orchestrator reads the LAST float in stdout)
print(f"{reward:.1f}")
```

### Rules

1. **The legacy `reward` line MUST still be printed** as the last line of stdout. The orchestrator's reward parser reads the last float from stdout, so put the JSON first and the float last.
2. **All critical checks failing → `reward == 0.0`**, regardless of `aggregate_score`. Non-critical checks can fail without zeroing reward only in graded tasks; for the default strict all-or-nothing policy, set every check to `critical: true`.
3. **Category weights must sum to 1.0** (within rounding). Verifier should assert this at startup to catch typos.
4. **`failure_mode` uses the shared vocabulary** from Section 1 (verified genuine failure modes). New failure modes need to be added to the skill before being used in verifiers so cross-task analysis stays consistent.
5. **Per-check `name` must be unique within the verifier** and stable across runs. Downstream tooling uses it as a foreign key.
6. **Do NOT include PII, raw DB rows, or multi-line content in `failure_detail`** — keep it to a single concise line. Put debug prints behind a `DEBUG` flag or in stderr.
7. **For verifiers with existing structured output, do not break backwards compat**: the legacy `passed X/N checks` summary line can stay above the JSON.

### Known `failure_mode` vocabulary (add to this list as new modes are discovered)

| Mode | Meaning | First seen |
|---|---|---|
| `wrong_chatter_tab` | Agent used "Send message" (Discussions subtype) or the "Internal Notes" tab on partner form instead of chatter "Log note" | A01, A09 |
| `form_save_neglect` | Agent edited form fields but navigated away without clicking Save (and in cases where Odoo doesn't auto-save) | A07 (initially suspected; actually saves via pagination in Odoo 18) |
| `skipped_reasoning` | Agent navigated correctly but skipped a required comparison/computation step | A10 |
| ~~`narrow_grid_misclick`~~ | ~~Agent misclicked a narrow column in a data grid~~ — **RETRACTED**. The A13 "evidence" was a verifier crash on `exclude_from_invoice_tab` (column does not exist in Odoo 18). On re-eval with fixed verifier, the agent scored 10/10. No supporting data for this failure mode. | ~~A13~~ (retracted) |
| `hallucinated_line_item` | Agent added product lines that weren't in the source data | A19 |
| ~~`deep_menu_failure`~~ | ~~Agent couldn't navigate a 3+ level menu, URL-guessing loops~~ — **RETRACTED**. On re-eval A11 showed the agent DID find Journal Entries via `/odoo/action-279?debug=1` URL guess at step 71 and began filling the first entry form at step 72. Trial died at step 78 from E2B sandbox timeout, NOT from navigation failure. No supporting data for this mode. | ~~A11~~ (retracted) |
| `wrong_column_read` | Agent read a different column than asked (e.g., "Tax Excluded" instead of "Total") | A20 |
| `jsonb_verifier_bug` | Not an agent failure — verifier SQL crashed on a JSONB `.name` column | A01, A06, A07, A08, A09, A17, A22 |
| `amount_tax_mismatch` | Verifier compared against wrong arithmetic (usually pre-tax vs post-tax) | A03, A06, A15, A23 |
| `instruction_ambiguity` | Task instruction allows a reasonable alternative interpretation that the verifier rejects | A09 ("internal note" → Internal Notes tab vs chatter Log note) |
| `name_mismatch` | Task assumes a specific string (e.g., "Net 30") that differs from Odoo's default ("30 Days") | A07 |
| `lenient_verifier` | Verifier passed but the agent got the answer wrong within tolerance — tolerance too loose to detect | A29 ($16,862 vs $19,391, ~13% off, passed at 15% tolerance) |

---

## 1. Eval Round 1 Findings (2026-04-10)

### Tasks evaluated: A01-A15 (gpt-5.4, xhigh, 150 step budget)

| Task | Reward | Steps | Classification | Key Finding |
|------|--------|-------|---------------|-------------|
| A01 | 0.0 | 38 | genuine_fail | Agent used "Send message" instead of "Log note" |
| A02 | 1.0 | 27 | too_easy | Linear filter+sum+note workflow trivial |
| A03 | 0.0 (6/7) | 45 | task_bug (fixed) | Verifier amount_total vs amount_untaxed mismatch |
| A04 | 1.0 | 33 | too_easy | Date filter + bulk post + event trivial |
| A05 | 1.0 | 47 | too_easy | Top-N sort + activity + event trivial |
| A06 | 0.0 | 34 | genuine_fail | Credit note line editing + wrong price on new invoice |
| A07 | 0.0 | 66 | genuine_fail | Set payment terms but never clicked Save before navigating away |
| A08 | 0.0 | 32 | task_bug (fixed) | JSONB product_template.name broke all product lookups |
| A09 | 0.0 | 38 | genuine_fail | "Internal Notes" tab vs chatter Log note + em-dash encoding |
| A10 | 0.0 | 31 | genuine_fail | Matched vendors by name, skipped amount comparison |
| A11 | 0.0 | 69 | genuine_fail | Couldn't find Journal Entries page, URL-guessing loop |
| A12 | 1.0 | 59 | too_easy | Lenient note check (no internal subtype required) |
| A13 | 0.0 | 67 | genuine_fail | Misclicked narrow Disc.% column in invoice line grid |
| A14 | 1.0 | 55 | too_easy | 3-vendor bill processing straightforward |
| A15 | 0.0 | 66 | task_bug (fixed) | Wrong expected total ($24490 vs $21990) + exclude_from_invoice_tab filter |

### What makes tasks TOO EASY

1. **Single-workflow-type tasks**: Navigate to one view, filter, act on results, create an event. The agent handles these in <50 steps with zero errors.
2. **Reading aggregate data from list views**: The agent can accurately read and sum numbers from Odoo list views. Mental math is not a bottleneck.
3. **Standard Odoo actions**: Posting invoices, creating calendar events, scheduling activities (via "To Do" type) are all within the agent's comfort zone.
4. **Generous verifier tolerances**: 10-15% numeric tolerance + fuzzy text matching makes it easy to pass even with imprecise values.

### Verified genuine failure modes (7 distinct patterns)

1. **"Log note" vs "Send message" discrimination (A01, A09)**: Odoo's chatter has two tabs — "Send message" (external, subtype=Discussions) and "Log note" (internal, subtype=Note). The agent consistently picks "Send message" when asked for "internal notes." Also confuses the "Internal Notes" tab on partner forms (writes to `res.partner.comment` field) with the chatter "Log note" feature. This is the single most reliable failure mode.

2. **Form save neglect (A07)**: Agent fills form fields correctly but navigates away (via breadcrumb/back button) WITHOUT clicking Save. Changes are silently discarded. Odoo does NOT auto-save form edits — the blue Save button must be explicitly clicked. The agent doesn't understand this.

3. **Inline form editing — line deletion (A06)**: Agent tried to delete specific lines from a credit note but only successfully removed 1 of 2 unwanted lines. Odoo's inline list editing (clicking trash icon on specific rows) is error-prone for the agent.

4. **Narrow column targeting in data grids (A13)**: Agent enabled the hidden Disc.% column but couldn't accurately click into the narrow cell. Typed "10" into adjacent columns (Price, Taxes) instead. Small click targets in dense grids are a reliable difficulty driver.

5. **Skipped reasoning / comparison steps (A10)**: Agent navigated correctly and found all vendors but never actually compared CSV amounts to bill amounts. Just matched by vendor name and marked everything as "Verified." The agent shortcuts data-dependent reasoning when the navigation part is done.

6. **Deep menu navigation failure / URL-guessing loops (A11)**: Agent couldn't find Journal Entries (Accounting > Accounting > Journal Entries). Instead of exploring the menu tree, it fabricated Odoo action URLs (`action_move_journal_line`, `action_move_form`, etc.) which all returned "Missing Action." Got stuck in a 40+ step URL-guessing loop without recovering.

7. **Product price not manually set (A06)**: When creating a new invoice line, the agent selected a product but relied on the auto-filled default price ($249.50) instead of overriding it to the instructed $299. Agent doesn't verify or correct auto-populated field values.

### What makes tasks TOO EASY

1. **Single-workflow-type tasks**: Navigate to one view, filter, act on results, create an event. The agent handles these in <50 steps with zero errors.
2. **Reading aggregate data from list views**: The agent can accurately read and sum numbers from Odoo list views. Mental math is not a bottleneck.
3. **Standard Odoo actions**: Posting invoices, creating calendar events, scheduling activities (via "To Do" type) are all within the agent's comfort zone.
4. **Generous verifier tolerances**: 10-15% numeric tolerance + fuzzy text matching makes it easy to pass even with imprecise values.
5. **Lenient note checks**: Verifiers that check `body ILIKE` without requiring internal subtype will pass even when agent uses "Send message" instead of "Log note." Always require internal subtype in note checks.

### Verified difficulty drivers for accounting

- **"Log note" requirement with strict subtype check**: Most reliable single check. Agent fails ~100% of the time.
- **Form Save requirement**: Any task where the agent must edit a form field and save. Agent navigates away without saving.
- **Narrow grid column editing**: Discount %, quantity, or unit price in dense invoice line grids.
- **Inline form editing (add/remove invoice lines)**: Deleting specific lines, adding lines with specific values.
- **Data-dependent reasoning**: Comparing values (CSV vs DB), conditional logic, amount matching.
- **Deep menu navigation (3+ levels)**: Journal Entries, Chart of Accounts, Payment Terms — pages buried in sub-menus.
- **Cross-module navigation**: Visiting 3+ Odoo modules in one task increases cognitive load.
- **Credit note workflow**: Multi-step wizard requiring line-level understanding.
- **Overriding auto-populated field values**: Agent trusts defaults instead of setting instructed values.

### What does NOT work as a difficulty driver

- **Counting/filtering**: The agent handles Odoo's filter/group-by UI well.
- **Date-range selection**: Agent correctly identifies and filters by date ranges.
- **Creating calendar events**: Trivial — the agent navigates to Calendar and fills the form accurately.
- **Simple activity scheduling**: The "To Do" activity type is easy to create.
- **Posting invoices/bills**: Bulk posting via list view selection is trivial.
- **Register Payment wizard**: Agent handles the popup dialog correctly (A01, A09, A14 all succeeded here).

### Task bug patterns to avoid

1. **JSONB product_template.name (A08)**: In Odoo 18, `product_template.name` is JSONB for i18n. `ILIKE` silently returns nothing. Use `aml.name ILIKE` (invoice line description) instead. See Section 3 for details.

2. **amount_total vs amount_untaxed (A03)**: If the instruction says "untaxed amount," the verifier must use `amount_untaxed`, not `amount_total`. Odoo's UI shows both — be explicit in the instruction about which one.

3. **Wrong expected totals (A15)**: Always double-check arithmetic in hardcoded expected values. 10x799 + 1x6000 + 3x1500 + 10x350 = 21,990, not 24,490.

4. **exclude_from_invoice_tab filter (A15)**: Odoo 18's `exclude_from_invoice_tab` field behaves differently than expected. Don't use it in verifier queries — just filter by `product_id IS NOT NULL` to get real product lines.

5. **Em-dashes in instructions (A09)**: Unicode em-dashes (U+2014, —) break xdotool typing. Always use `--` (double ASCII dash) in any text the agent must type.

---

## 2. Odoo Accounting Data Landscape

### Installed modules
`crm`, `sale_management`, `mass_mailing`, `calendar`, `mail`, `hr`, `account` — all via the `seed_data` addon.

### Seed data (baked into template, available in every sandbox)

| Entity | Count | Key details |
|--------|-------|-------------|
| Customer invoices | 45 | All DRAFT, move_type='out_invoice', dates Oct 2025 – Mar 2026 |
| Vendor bills | 30 | All DRAFT, move_type='in_invoice', dates Sep 2025 – Mar 2026 |
| Customer companies | 45 | Named: Nexus Biomedical, Pinnacle Consulting, Cascade Logistics, Apex Digital, Quantum Dynamics, Vertex Technologies, Helix Genomics, Silverleaf Pharma, Sequoia Cloud, Atlas Retail, Ember Manufacturing, Horizon Healthcare, Zenith Aerospace, Meridian Analytics, Summit Energy, Orion Logistics, etc. |
| Vendors | 10 | Amazon Web Services, Google Cloud, Slack Technologies, Datadog Inc., GitHub Inc., OfficeMax Supply Co., Sterling Legal LLP, TalentBridge Recruiting, TechConf Events, GlobalTravel Partners |
| Sell products | 15 | Starter $99, Professional $299, Enterprise $799, API Add-on $49, Analytics $149, SSO Pack $199, Data Migration $4500, Custom Integration $8500, Onboarding Std $2000, Premium $6000, Consulting $200/hr, Training $1500/day, Support $350, Compliance Audit $12000, White-Label $1500 |
| Vendor products | 10 | AWS Hosting $2400, Google Workspace $18, Slack $12.50, Datadog $450, GitHub Enterprise $21, Office Supplies $150, Legal Consulting $350/hr, Recruiting Fee $8000, Conference Sponsorship $5000, Travel $1200 |
| CRM leads | 90 | 30% New, 15% Qualified, 15% Proposition, 20% Won, 20% Lost |
| Sale orders | ~41 | ~70% confirmed (state='sale'), rest draft |

### Top customers by invoice total (from DB)
1. Helix Genomics
2. Silverleaf Pharma
3. Sequoia Cloud
4. Atlas Retail Group
5. Pinnacle Consulting

### Top vendors by bill count
- Amazon Web Services (4), GlobalTravel Partners (4), Google Cloud (4) — tied

### Vendor spend totals (from DB)
- OfficeMax Supply Co.: ~$171K (highest)
- GlobalTravel Partners: ~$54K
- Sterling Legal LLP: ~$64K
- Google Cloud: ~$29.5K
- Amazon Web Services: ~$19.4K
- TalentBridge Recruiting: ~$19.6K
- Datadog Inc.: ~$16.2K
- GitHub Inc.: ~$12K
- TechConf Events: ~$23K
- Slack Technologies: ~$5.4K

---

## 3. Setup.sh Patterns That Work

### Per-task invoice creation via odoo shell (REQUIRED for computed fields)
```bash
sudo -u odoo /usr/bin/odoo shell -c /etc/odoo/odoo.conf -d biz_demo --no-http <<'PYEOF'
Partner = env['res.partner']
Product = env['product.product']
Move = env['account.move']

partner = Partner.search([('name','ilike','Nexus'),('is_company','=',True)], limit=1)
product = Product.search([('name','ilike','Enterprise')], limit=1)

Move.create({
    'move_type': 'out_invoice',
    'partner_id': partner.id,
    'invoice_line_ids': [(0, 0, {
        'product_id': product.id,
        'quantity': 5,
        'price_unit': 799.00,
        'name': product.name,
    })],
})
env.cr.commit()
PYEOF
```

### Partner creation pattern (some names don't exist in seed)
Partners like "Quantum", "Vertex", "Orion" DO NOT exist in the seed. Use get-or-create:
```python
partner = Partner.search([('name','ilike','Quantum'),('is_company','=',True)], limit=1)
if not partner:
    partner = Partner.create({'name': 'Quantum Dynamics', 'is_company': True, 'company_type': 'company'})
```

### Partners confirmed to exist in seed
Nexus Biomedical, Pinnacle Consulting, Cascade Logistics, Apex Digital Solutions, Helix Genomics, Silverleaf Pharma, Sequoia Cloud, Atlas Retail Group, Ember Manufacturing, Horizon Healthcare, Zenith Aerospace, Meridian Analytics, Summit Energy (and ~30 more).

### Caveat: Odoo 18 account.account has NO company_id field
Do NOT filter by `company_id` when searching accounts. Use:
```python
account = env['account.account'].search([('account_type','=','income')], limit=1)
```

### CRITICAL: Odoo 18 JSONB translated columns break verifiers silently

In Odoo 18, MANY commonly-queried columns are stored as **JSONB** (for i18n translation support), NOT plain text. Verified JSONB columns in `biz_demo`:
- `product_template.name`
- `mail_message_subtype.name`
- `account_tax.name`
- `account_journal.name`
- `account_account.name`
- `account_payment_term.name`
- `account_analytic_account.name`
- `res_partner_category.name`
- `crm_tag.name`
- `crm_stage.name`
- `crm_team.name`
- `hr_department.name`
- `hr_job.name`
- `mail_activity_type.name`

**NOT JSONB** (safe to use `ILIKE` directly):
- `res_partner.name` — partner/customer/vendor names are plain varchar
- `product_category.name` — plain varchar
- `crm_stage.is_won` (boolean) — safe, use instead of `name ILIKE`
- `mail_message_subtype.internal` (boolean) — safe, use instead of `name = 'Note'`
- `account_account.code`, `account_journal.code` — plain varchar, prefer these when available

**`WHERE col = 'foo'` on a JSONB column CRASHES with "invalid input syntax for type json"** and the verifier `sql()` helper silently returns empty string. Python then parses empty as 0/None and reports FAIL. **This caused 6+ task_bugs in eval round 1.**

Directly verified in sandbox:
```
ERROR: invalid input syntax for type json
LINE 1: SELECT id FROM mail_message_subtype WHERE name = 'Note'
DETAIL: Token "Note" is invalid.
```

**UNION queries are ALSO broken**: `SELECT id WHERE internal = true UNION SELECT id WHERE name = 'Note'` crashes the entire query if one branch hits JSONB.

#### Correct patterns

```sql
-- For invoice line product matching: use aml.name (plain text description)
SELECT ... FROM account_move_line aml
WHERE aml.name ILIKE '%Training Workshop%'
  AND aml.product_id IS NOT NULL
-- Do NOT join through product_template.name

-- For mail_message_subtype: use the internal boolean column
SELECT id FROM mail_message_subtype WHERE internal = true
-- NEVER use WHERE name = 'Note'

-- For product_template list_price lookups: cast JSONB to text
SELECT list_price FROM product_template WHERE name::text ILIKE '%Starter%'
-- Or use JSONB operator:
SELECT list_price FROM product_template WHERE name->>'en_US' ILIKE '%Starter%'

-- For sale order lines: use sol.name instead of joining product_template
SELECT count(*) FROM sale_order_line sol
WHERE sol.order_id = X AND sol.name ILIKE '%Enterprise%'
```

#### Files fixed in round 1 (template to copy from)
A01, A06, A07, A08, A15, A17, A18, A35, A02, A09, A22, A25, A28 — all had variants of these bugs.

### Infra: em-dashes (U+2014) break xdotool
Never use em-dashes (—) in instruction.md text that the agent must type. `xdotool type` cannot handle multi-byte UTF-8 characters. Use `--` (double-dash) instead.

---

## 4. Verification SQL Patterns

### Internal notes (the key differentiator)
```sql
-- Check for INTERNAL notes (Log note, not Send message)
SELECT count(*) FROM mail_message mm
WHERE mm.model = 'account.move'
  AND mm.res_id = <invoice_id>
  AND mm.message_type IN ('comment', 'notification')
  AND mm.subtype_id IN (
      SELECT id FROM mail_message_subtype WHERE internal = true
      UNION SELECT id FROM mail_message_subtype WHERE name = 'Note'
  )
  AND mm.body ILIKE '%search text%'
```

### Invoice states
```sql
-- Posted invoices
SELECT count(*) FROM account_move WHERE move_type='out_invoice' AND state='posted'

-- Payment state after payment
SELECT payment_state FROM account_move WHERE id = X
-- Values: 'not_paid', 'partial', 'paid', 'in_payment'
```

### Payment records
```sql
SELECT amount FROM account_payment
WHERE partner_id = X AND payment_type = 'inbound'
```

### Activities
```sql
SELECT count(*) FROM mail_activity
WHERE res_model = 'account.move' AND res_id = X
  AND summary ILIKE '%search text%'
```

---

## 5. Task Inventory (40 tasks, fully migrated to A+C)

### Location
`/Users/muyuhe/Documents/vibe-rl-gym/computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-{01..40}/`

### Migration status: 40/40 ✓
Every task has:
- `tests/verify.py` — structured JSON output per Section 0, dynamic ground truth (Option C)
- `tests/golden_apply.py` — programmatic reference state via `odoo shell` (Option A)
- Both-direction smoke tests verified: negative→0.0, positive→1.0
- No JSONB ILIKE on translated columns, no references to removed columns (`exclude_from_invoice_tab`, `account_account.code`)
- ASCII `--` (no em-dashes) in any text the agent must type
- `display_type = 'product'` (not `IS NULL`) for product line filters
- `aggregate >= 1.0 - 1e-9` float-precision guard

### Task categories (~480 total checks across the pool)

- **Invoice lifecycle** (A01, A04, A06, A08, A13, A15, A19, A20, A24, A25, A34, A38)
- **Vendor bill processing** (A02, A05, A07, A09, A12, A14, A21, A23, A27, A31, A33)
- **Cross-module / reporting** (A03, A16, A18, A28, A29, A35, A36, A37, A39, A40)
- **Configuration** (A07 payment terms, A11 journal entries, A22 tax, A26 multi-currency, A30 chart of accounts)
- **Data gathering + file creation** (A03, A10, A16, A18, A29, A36, A37, A39, A40)

### Per-task check count (after level-2 hardening)

| Task | Checks | Task | Checks | Task | Checks | Task | Checks |
|---|---|---|---|---|---|---|---|
| A01 | 8  | A11 | 9  | A21 | 20 | A31 | 12 |
| A02 | 24 | A12 | 14 | A22 | 9  | A32 | 12 |
| A03 | 7  | A13 | 12 | A23 | 10 | A33 | ~9 |
| A04 | 12 | A14 | 17 | A24 | 15 | A34 | 10 |
| A05 | 16 | A15 | 12 | A25 | 16 | A35 | 11 |
| A06 | 9  | A16 | 14 | A26 | 9  | A36 | 11 |
| A07 | 8  | A17 | 9  | A27 | 7  | A37 | 11 |
| A08 | 12 | A18 | 10 | A28 | 9  | A38 | 12 |
| A09 | 8  | A19 | 18 | A29 | 12 | A39 | 7  |
| A10 | 13 | A20 | 11 | A30 | 8  | A40 | 20 |

### What changed from round 1

- **10+ task_bugs discovered and fixed** (JSONB crashes, removed columns, tax math, instruction ambiguity, stray commas in regex parsers, `exclude_from_invoice_tab`, `account_account.code`, structurally unsolvable CSV data in A10, `display_type IS NULL` silent failures)
- **Golden_apply pattern established**: every task has a programmatic reference that applies the correct end state via `odoo shell`
- **Structured JSON verifier output**: all 40 emit `{reward, passed, aggregate_score, critical_checks_passed, critical_failures, categories}` for downstream analysis
- **Shared failure_mode vocabulary**: consistent across tasks (see Section 1)

---

## 6. Current state & next steps (resumable across sessions)

### Where we are (end of 2026-04-12 session, latest checkpoint)

**Strategy shift after rounds 2 & 3 (2026-04-12)** — L3 hardening produced ~30% conversion (too_easy → genuine_fail). For future iterations:

- **Hopeless tasks** that pass at L3 in <60 steps with simple workflows are dropped — patching them is wasted effort.
- **New tasks** are templated against the proven failure modes from the 19+ shipped tasks. The proven mode mix is: ~50% `tax_exclusive_misread` (A20-style), ~30% `skipped_reasoning` / missed-tail-step (A12, A19, A33, A34), ~10% `wrong_chatter_tab` (A27, A32), ~10% `step_budget_exhaustion` (A11, A12), `wrong_record_modified` (A08, A13).
- **L4 hardening** is reserved for round-3 too_easy tasks that nearly hit step budget (>=100 steps with high check counts) — those are genuinely on the edge.
- **Subagent batch size** for new task creation: ~15 in parallel (sandbox cap 20, eval reserves 5). For L4 hardening: ~5 in parallel.
- **Dropped from wip in 04-12 strategy shift**: A01, A02, A03, A06, A10, A17, A23, A28 (all pass at L3 in <60 steps with mechanical workflows).

**Eval round-3 results so far (27 L3-hardened tasks)**:
- ✅ Shipped from round-3: A04, A08, A09, A13, A18, A19 (6 new genuine_fails — pending ship)
- 🟡 Round-3 too_easy and now dropped: A01, A02, A03, A06, A10, A17, A23, A28 (8)
- 🟡 Round-3 too_easy still in pool (kept for L4 candidate evaluation): A05, A07, A14, A15, A21, A22, A26, A36 (8)
- 🟡 Round-3 in flight at strategy shift: A24, A30, A35, A38 (4)

### Where we are (end of 2026-04-11 session, latest checkpoint)

**Phase 1 (batch creation)**: ✅ Complete — 40 tasks originally created in `moodle-odoo-wip/accounting/`

**Phase 2 (eval round 1)**: ⚠️ Polluted by verifier bugs — retracted. See 2026-04-10 retrospective below.

**Phase 2.5 (migration to A+C)**: ✅ Complete at end of 2026-04-10 — all 40 tasks had `golden_apply.py` + structured JSON + dynamic ground truth.

**Phase 2.6 (second static-audit pass, 2026-04-11 session)**: ✅ Complete. All 39 WIP tasks re-audited by 6 parallel subagents against the full 9-class anti-pattern checklist from this skill. Findings:
- Float-precision guard (`aggregate >= 1.0 - 1e-9`) applied to A01/A02/A03/A06/A07/A23 (they were missing the epsilon).
- `CATEGORY_WEIGHTS` sum assertion added to A02.
- A10 instruction tightened to disambiguate "chatter Log note" vs "Internal Notes" tab; scoped to "most recent bill"; clarified "Total column (tax-inclusive)".
- A14 note checks tightened to require vendor short-name **and** action keyword (not keyword alone).
- A16 grand-total tolerance 5% → 3% to catch the `tax_exclusive_misread` trap (same signal A20 catches).
- A24 `golden_apply.py` idempotency filter fixed for Odoo 18 `display_type='product'` (prev only matched `False`/`None`).
- A26 EUR rate check relaxed to accept BOTH 0.9259 canonical and 1.08 display direction with 0.005 abs tolerance (prev would reject a literal "1.08" typed by the agent even though the instruction says that's the target value).
- A36 revenue/cost/largest-cust/largest-vend tolerance 5% → 3% with `tax_exclusive_misread` failure-mode tag.
- A37 JE debit tolerance 10% → 3% (both Q4 and Q1) and file-total tolerance 10% → 3%, both tagged `tax_exclusive_misread`.
- A40 count tolerance ±2 → exact (6 count checks); dollar tolerance 5% → 3% with `tax_exclusive_misread` tag.
- **Zero Bug-class-1-through-9 violations remain.** Every task now has structured JSON + legacy reward float last + category weights summing to 1.0 + failure_mode tagging + golden_apply.py with `env.cr.commit()` + `/tmp→sudo mv→chown` for any Desktop writes.
- 4 commits pushed to `claude/improve-task-verifiers-sMSQF`: `895a4a9`, `9db702d`, `86dec11`, `4d11cb6`.

**Phase 3 (clean eval round 2)**: 🟡 5/40 done (from 2026-04-10), 35 still queued. Current results unchanged from 2026-04-10:

| Task | Reward | Classification | Notes |
|---|---|---|---|
| A01 | 1.0 | too_easy | Clean pass, 25 steps |
| A02 | 1.0 | too_easy | L2-hardened 24 checks, 77 steps. **⚠ setup.sh sub-percent discrimination still not landing** (6 of 7 vendors share identical max/2nd values) — not fixed in 04-11 session, still an open todo |
| A06 | 1.0 | too_easy | Clean pass, 32 steps |
| A14 | 1.0 | too_easy | L2-hardened 17 checks, 83 steps. Further tightened in 04-11 session (vendor-name+keyword) but NOT re-eval'd. |
| **A20** | **0.0** | **genuine_fail** | `tax_exclusive_misread`, reproducible across both rounds |

**Phase 4 (shipping)**: 🟢 1/1 confirmed failures shipped (A20)

**Pipeline**: 🛑 Idle — 0 sandboxes active, no evals running. Next session will run evals locally.

### Confirmed genuine failures (shipped)

**1 task: A20** — `tax_exclusive_misread`. Shipped to:
- `computer-use/tasks/moodle-odoo-shipped/accounting/cua-odoo-accounting-20/` (full task + `rollouts/round2-gpt54-xhigh-fail/` with 51 screenshots, traj.jsonl, verifier output, README.md)
- Zip: `computer-use/tasks/moodle-odoo-shipped/accounting/cua-odoo-accounting-20.zip` (17 MB)

### Pool composition at end of 2026-04-11 session

- **Shipped** (1): A20
- **Wip — migrated + positive-smoke verified + 04-11 second audit-pass clean** (39): A01-A19, A21-A40
- **Round-2 eval'd + passed (too_easy)** (4): A01, A02, A06, A14 — A14 was re-hardened on 04-11 and needs a fresh eval
- **Round-2 NOT yet eval'd** (35): A03, A04, A05, A07, A08, A09, A10, A11, A12, A13, A15, A16, A17, A18, A19, A21, A22, A23, A24, A25, A26, A27, A28, A29, A30, A31, A32, A33, A34, A35, A36, A37, A38, A39, A40

### Next steps for session resumption

**TL;DR**: Pull branch. Sanity-probe E2B reachability. Run clean round-2 evals on 35 remaining tasks at bs=5. Ship any genuine failures. Decide what to do with the too_easy passes (L3 harden, downgrade, or keep).

#### Step 0: Prepare the environment (run locally)

```bash
cd ~/vibe-rl-gym  # or wherever you cloned it
git fetch origin claude/improve-task-verifiers-sMSQF
git checkout claude/improve-task-verifiers-sMSQF
git pull --ff-only

# If venv missing:
uv venv .venv-cua --python python3.11
uv pip install --python .venv-cua/bin/python -r computer-use/requirements.txt python-dotenv

# Make sure .env contains E2B_API_KEY + OPENAI_API_KEY
# (gitignored; chmod 600). If missing, recreate it.
source .env && export E2B_API_KEY OPENAI_API_KEY

# One-shot sanity probe — must return a sandbox_id before launching the queue
.venv-cua/bin/python -c "
import os
from e2b_desktop import Sandbox
sb = Sandbox.create(template='cua-eval-odoo', api_key=os.environ['E2B_API_KEY'], timeout=120)
print('sandbox_id:', sb.sandbox_id)
sb.kill()
"
```

If the probe fails with a template-not-found error, the `cua-eval-odoo` E2B template hasn't been built on the current E2B account — build it once via `python3 computer-use/env/build_odoo.py` (takes a while) before proceeding.

#### Step 1: Investigate the A02 setup.sh issue (still open from 04-10)

Not fixed in the 04-11 session. The "sub-percent discrimination" difficulty driver isn't actually active — 6 of 7 vendors share identical max=$12,345.67 / 2nd=$9,876.54 (~20% gap, not the spec'd 0.40%). Agent still passed legitimately but A02 isn't the difficulty test it claims to be.

```bash
cat computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-02/environment/setup.sh | head -80
# Then smoke-test to see what bills actually exist per vendor
.venv-cua/bin/python computer-use/tasks/moodle-odoo-wip/smoke_test_odoo.py \
  computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-02
```

If setup.sh is using placeholder repeat values, either fix it to generate real sub-percent gaps, or accept A02 as a less-hard variant.

#### Step 2: Launch round-2 evals at bs=5 on the 35 remaining tasks

All 39 WIP tasks are audit-clean as of `4d11cb6`. Start the rolling bs=5 refill:

```bash
cd ~/vibe-rl-gym
source .env && export E2B_API_KEY OPENAI_API_KEY
mkdir -p eval_results/accounting-round2 /tmp/eval_logs

QUEUE=(03 04 05 07 08 09 10 11 12 13 15 16 17 18 19 \
       21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 \
       36 37 38 39 40)

launch_one () {
  local id=$1
  nohup .venv-cua/bin/python computer-use/orchestrator.py \
    --task computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-$id \
    --model gpt-5.4 --reasoning-effort xhigh --max-steps 150 \
    --jobs-dir eval_results --job-name accounting-round2 \
    > /tmp/eval_logs/a$id.log 2>&1 &
  echo "[launched] A$id (pid=$!)"
}
in_flight () { jobs -rp | wc -l | tr -d ' '; }
for id in "${QUEUE[@]}"; do
  while [ "$(in_flight)" -ge 5 ]; do sleep 15; done
  launch_one "$id"
done
wait
echo "all done"
```

Also re-eval **A14** because it was further hardened on 04-11 (prior result is stale).

**Remaining queue (35, launch order suggestion — confirmed failure candidates first, then configuration-heavy, then data-gathering):**
```
batch A (likely genuine failure candidates): A10, A11, A13, A15, A29
batch B (configuration tasks): A22, A26, A30, A07, A34
batch C (vendor workflows):    A05, A09, A12, A21, A23, A24, A27, A33
batch D (invoice lifecycle):   A03, A04, A08, A16, A17, A19, A25, A32, A38
batch E (cross-module/reports): A18, A28, A35, A36, A37, A39, A40, A31
```

Note on 04-11 hardening: A14, A16, A36, A37, A40 all had tolerances tightened to 3% with `tax_exclusive_misread` tagging. These are now more likely to catch the A20-class failure mode. A24 + A26 had golden_apply/verifier bug-fixes — re-run positive-direction smoke tests on them before eval if time allows.

#### Step 3: Classify every round-2 result using structured JSON

For each trial dir under `eval_results/accounting-round2/cua-odoo-accounting-XX__HASH/`:
- Read `verifier/stdout.txt` — parse the structured JSON object (first line) and the legacy reward (last line)
- `reward: 0.0` + `critical_failures: [...]` → **genuine_fail**. The `failure_mode` tag on each failing check comes from the shared vocabulary (Section 1). Trust the verifier — positive-direction smoke tests already confirmed it accepts the correct state.
- `reward: 1.0` → **too_easy**. Record steps/tokens. If far below step budget (e.g. <50 steps), it's saturated; queue for L3 hardening.
- If the verifier JSON parse fails or results look weird → **task_bug**. Investigate and add to Section 0a retrospective.

**DO NOT predict classifications from partial trajectories**. Always wait for the orchestrator to fully complete and write `reward.txt`. Round 1's A11 was wrongly classified because a subagent extrapolated from step 69 mid-run.

#### Step 4: Ship confirmed genuine failures

For every genuine_fail:
```bash
# Move the task to shipped
mv computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-XX \
   computer-use/tasks/moodle-odoo-shipped/accounting/

# Copy the failing rollout with a descriptive name
mkdir -p computer-use/tasks/moodle-odoo-shipped/accounting/cua-odoo-accounting-XX/rollouts
cp -r eval_results/accounting-round2/cua-odoo-accounting-XX__HASH \
      computer-use/tasks/moodle-odoo-shipped/accounting/cua-odoo-accounting-XX/rollouts/round2-gpt54-xhigh-fail

# Write a README.md with: classification, failure mode, what the task asks,
# what the agent got wrong, and what's in the directory vs what's NOT
# (use computer-use/tasks/moodle-odoo-shipped/accounting/cua-odoo-accounting-20/README.md as template)

# Zip it
cd computer-use/tasks/moodle-odoo-shipped/accounting
zip -qr cua-odoo-accounting-XX.zip cua-odoo-accounting-XX
```

The README template (copy from A20) must state that **the E2B sandbox template is NOT in the task directory** — it lives at `computer-use/env/` and must be built once via `python3 build_odoo.py`.

#### Step 5: Decide what to do with too_easy tasks

For each task passing round-2 at 1.0:
- **Option A**: Level-3 harden (more vendors, sub-percent, computed due dates, specific assignees, refund-exclusion traps). Worth trying if the task tests a valuable capability.
- **Option B**: Ship to shipped pool as "easy tier" (for agents weaker than gpt-5.4 xhigh). Rename rollout to `round2-gpt54-xhigh-pass` to signal it's a pass rollout.
- **Option C**: Drop from the pool entirely if the task tests nothing interesting.

A02 and A14 L2 already passed at 1.0 despite 24 and 17 checks. Level-3 hardening will require new difficulty levers beyond what we've tried: GUI column disambiguation (like A20's `wrong_column_read`), multi-step form saves, UI-specific traps, etc.

#### Step 6: Update this skill as new findings emerge

- Add new `failure_mode` tags to Section 1's vocabulary as they're discovered
- Extend Section 0a retrospective if new task bugs surface
- Update this Section 6 with current state at each session boundary

### Pipeline discipline (non-negotiable rules)

- **bs=5 rolling eval** — always ≤5 in flight, refill as completions arrive. NEVER launch above 5.
- **Migration/hardening subagents do NOT count** against eval budget — they edit files only, no E2B cost.
- **Never kill sandboxes** unless the user explicitly asks (violated once, causing wasted compute and user rebuke).
- **Always read verifier stdout.txt + structured JSON** for classification. Do NOT extrapolate from partial trajectories.
- **Respect the Option A+C rule** for any newly generated task. Every new or hardened task must have both-direction smoke test green before any eval.

### Eval results directories

- `eval_results/accounting-round1/` — polluted by task bugs (pre-A+C). Retain for retrospective only; do NOT read for classification.
- `eval_results/accounting-round1-reeval/` — partial re-eval of task-bug suspects (A01, A06, A07, A09, A13). All cleared as task_bugs, not genuine.
- `eval_results/accounting-round2/` — **clean eval round** with A+C verifiers. This is the source of truth. Currently contains: A01, A02, A06, A14, A20. 35 more to add.

### Sandbox count at end of session
**0 active.** Pipeline fully drained. 04-11 session was static-audit only (file edits, no sandboxes created).

### 04-11 session artifacts
- Branch: `claude/improve-task-verifiers-sMSQF` (pushed)
- Commits: `895a4a9` (float-precision + A23), `9db702d` (A10 instruction + A26/A36 tightening), `86dec11` (A14/A16/A24/A26 hardening + A37/A40 touchups), `4d11cb6` (A40 exact-count + tax_exclusive_misread tag), `7519803` (this section 6 update)
- `.env` and `.venv-cua` are both gitignored and machine-local — the next session will need to recreate them on the local machine it runs on.

### Recommendations learned (supersedes round-1 recommendations)

1. **Option A (`golden_apply.py`) is non-negotiable** — every task that makes it to eval must have a positive-direction smoke test. This caught ~10 verifier bugs that would have been reported as "genuine failures".
2. **Option C (dynamic DB queries)** — derived values must come from live SQL at verify time. Hardcoded values only for task-definitional inputs (new prices, specific strings, quantities stated in the instruction).
3. **Structured JSON output** — enables cross-task analysis and failure-mode tagging.
4. **Tight tolerances** — 2-5% is correct; 10-15% masks genuine failures (A29 false-passed at 15% despite 13% misread).
5. **Strict subtype checks** — always require `mail_message_subtype.internal = true` for "internal note" checks. Loose `body ILIKE` without subtype is a lenient-verifier trap.
6. **The agent is more capable than round 1 suggested** — clean evals on hardened tasks (A01, A06 at L1) still pass at 1.0 even with 2% tolerance. Level-3 hardening (more vendors, sub-percent, complex workflows) will be needed to produce meaningful failure signal on gpt-5.4 xhigh.
7. **A20's `tax_exclusive_misread` is the only reproducible failure mode** in the pool — consider it a template for future task design (find GUI column-disambiguation gotchas).

---

## 7. Shipped task directory structure (canonical layout)

Every shipped task MUST follow this exact layout:

```
<task_name>/
├── instruction.md            ← Prompt given to the agent
├── task.toml                 ← Task metadata (name, category, tags, template)
├── checks_done.md            ← Generated: per-check PASS/FAIL with failure modes
├── tests/
│   └── verify.py             ← Source verifier (DB/filesystem checks, reward 0.0 or 1.0)
├── trajectory/
│   ├── step_0_<timestamp>.png
│   ├── step_1_<timestamp>.png
│   ├── ...
│   └── traj.jsonl            ← One JSON line per step (action, coords, response)
├── result.json               ← Run metadata (agent info, token counts, timing, reward)
├── result.txt                ← One-line summary
├── reward.txt                ← Reward scalar (0.0)
└── verifier/
    ├── stdout.txt            ← [PASS]/[FAIL] lines + structured JSON result
    ├── stderr.txt
    ├── exit_code.txt
    └── result.json           ← Structured JSON extracted from stdout
```

**NOT included** (kept in wip only): `environment/`, `tests/golden_apply.py`, `README.md`, `rollouts/` wrapper, `agent/` subdir.

When shipping: flatten rollout into `trajectory/` + top-level result files + `verifier/`. Generate `checks_done.md` and `verifier/result.json` from verifier stdout.

## 8. Shipping workflow (persistent rule)

1. **Ship immediately** when a task gets reward=0.0 — move from wip to `shipped/<domain>/wave<N>/` in canonical layout
2. **Audit continuously** — always have 1-2 audit subagents checking shipped wave tasks for verifier bugs (JSONB, timezone, border-stripping, etc.). If a bug is found, unship immediately (move back to wip)
3. **Zip + upload at 20** — when any domain's current wave reaches 20 confirmed genuine fails, create `<domain>-shipped-v<N>.zip` and upload to Google Drive via `/tmp/gdrive_oauth.py --upload`
4. **Wave tracking**: `wave1/` = already zipped + on Drive. `wave2/` = accumulating to 20. When wave2 hits 20, zip + upload as v2, then new tasks go to `wave3/`
5. **Never idle** — always saturate: eval slots (30), task gen subagents, audit agents. If evals finish, immediately queue more. If too_easy, harden or generate new. If genuine_fail, ship + keep going.

## 9. Current state (2026-04-14 end-of-session update)

> Source of truth: `computer-use/tasks/STATUS.md`

**Shipped: 37/40** — all smoke-validated (golden_apply + verifier agree), trajectory-audited, verifier science-audited. Flat directory structure, no wave subdirs. Drive synced (needs resync after acct-33 removal).

**Cross-domain shipped total: 117** (37 acct, 25 edu, 23 sales, 32 health)

**Eval status**:
- Re-eval of original 68 shipped (`shipped_reeval_r1`): 62/68 done, 46 fail, 16 pass (borderline)
  - 12 of the 68 are acct tasks that overlap with WIP (old easy version shipped, hardened version in WIP)
  - acct-33 removed from shipped (2/3 pass = too easy, hardened in WIP)
- Cat-E eval (`cat_e_eval_r1`): 33/35 done, 5 fail, 28 too easy (accounting hardened tasks)
- 50 newly shipped tasks (`new50_eval_r2`): queued, not started

**WIP: 66 tasks total across all domains**
- 24 hardened acct tasks (need smoke test): acct-01/03/04/05/06/07/09/10/11/13/14/16/18/19/22/23/26/28/29/31/32/35/36/38
- 4 too-easy acct tasks (need hardening): acct-02, 21, 24, 30
- 10 acct tasks with broken golden_apply: 15, 17, 51, 54, 55, 56, 57, 58, 59, N7
- 1 suspicious: acct-N2 (verifier fixed, needs re-eval to confirm)

**Verifier bugs found during golden_apply validation**:
- acct-08: hardcoded distractor line count (verifier expected specific count that changed with seed data)
- N3: amount threshold too tight (verifier rejected correct values within rounding)

**New golden_apply gotchas (discovered this session)**:
- `display_type='product'` on journal entry lines -- JE lines in Odoo 18 use this, not NULL
- Receivable accounts need `partner_id` set on the move line, or reconciliation fails silently
- `message_post()` not `mail.message.create()` -- use ORM method for chatter messages to get proper subtypes
- File writes from odoo shell must go to `/tmp/golden_desktop/` then `sudo cp` + `sudo chown` to Desktop

**Proven failure modes (from 37 shipped)**:
- JE line grid creation: ~100% fail rate (A41-A70 series)
- tax_exclusive_misread: ~60% fail rate with 1% tolerance
- step_budget_exhaustion: ~80% on 8+ sub-goal tasks
- wrong_chatter_tab: ~30% standalone

**Next steps**:
1. Smoke test 24 hardened acct tasks -> if pass, eval -> if fail, ship
2. Harden 4 too-easy acct tasks (02, 21, 24, 30)
3. Fix 10 broken golden_apply acct tasks
4. Resolve acct-N2 suspicious task
5. Resync Drive after changes settle
