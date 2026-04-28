---
name: cua-moodle-odoo-taskgen
description: Design and generate diverse, hard CUA evaluation tasks targeting Moodle 4.5 LMS and Odoo 18 ERP sandboxes. Covers task design heuristics, web-app-specific difficulty drivers, per-task DB customization, and a catalog of task ideas organized by business domains (Accounting, Financial Services, Marketing/Sales, Professional Assistant, Education). Use when creating new Moodle or Odoo CUA tasks, extending the synthesis pipeline, or ideating hard tasks that exploit web-app GUI complexity.
argument-hint: [domain] [moodle|odoo] or a vague idea
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# CUA Task Generation for Moodle & Odoo Sandboxes

## 1. Context: What Exists Today

The CUA eval pipeline (`synthesis_pipeline_cua/`) generates tasks for **desktop apps** (LibreOffice, Thunar, XFCE, GIMP, Chrome). These tasks live in `computer-use/tasks/` and follow the Harbor task format:

```
tasks/<name>/
  task.toml           # metadata + template selection
  instruction.md      # what the agent sees
  environment/
    services.sh       # starts the web app
    setup.sh          # opens Chrome to the right page
    data/             # optional desktop files
  tests/
    verify.py         # SQL queries, prints 0.0 or 1.0
    golden.json       # optional expected values
```

Two E2B sandbox templates are available:
- **`cua-eval-odoo`** -- Odoo 18 ERP with ~1,100 records (CRM, Sales, HR, Accounting, Email Marketing)
- **`cua-eval-moodle`** -- Moodle 4.5 LMS with ~800+ records (Courses, Students, Grades, Calendar, Forums)

Neither has been used in any existing task pool (pool_40, mix_40, initial_10). All current tasks target LibreOffice/XFCE/Thunar/Chrome desktop workflows.

### Domain-to-app mapping

We target 7 business domains. Each maps to one sandbox:

| # | Domain | App | Fit | Notes |
|---|--------|-----|-----|-------|
| 1 | **Accounting** | Odoo | Native | `account` module: invoices, vendor bills, payments, journal entries |
| 2 | **Financial Services** | Odoo | Native | CRM pipeline as deal flow, sale orders as contracts, invoicing |
| 3 | **Marketing/Sales** | Odoo | Native | `crm` + `mass_mailing` + `sale_management`: leads, campaigns, orders |
| 4 | **Law** | Odoo | Not yet | Would need `project` module added (Community, free) to frame projects as legal cases. No native contract mgmt, document mgmt, or conflict-of-interest features. |
| 5 | **Health** | Odoo | Not yet | Would need `stock`+`purchase` modules added (Community, free). Limited to pharmacy inventory/supply chain -- no patient records, clinical workflows, or prescriptions. |
| 6 | **Professional Assistant** | Odoo | Good | `calendar` + `mail` + `hr` + contacts: scheduling, activity mgmt, org lookup |
| 7 | **Education** | Moodle | Native | Courses, enrollments, gradebook, quizzes, calendar, forums |

---

## 2. Task Design Heuristics

### 2.1 Difficulty target: hard

All tasks should be designed to be **hard** -- targeting failure at xhigh reasoning. We can always make tasks easier later by reducing check counts or simplifying requirements, but it's much harder to make easy tasks harder after the fact.

Design for 7-12 verification checks per task, 60-120 steps to solve, and at least one cross-module or multi-step workflow. The "90% correct, miss 1 detail" failure pattern is ideal -- the task is clearly within the agent's capability horizon, but the all-or-nothing scoring means a single missed detail causes failure.

### 2.2 All-or-nothing scoring with 7-12 checks

`reward = 1.0 if checks_passed == total_checks else 0.0`. No partial credit. Each check is independent and tests one observable outcome.

### 2.3 GUI-only mandate

Every instruction must include natural phrasing equivalent to "do not open a terminal or write scripts." For web apps this is critical -- Odoo has XML-RPC/JSON-RPC APIs and `odoo shell`; Moodle has CLI admin tools and REST APIs. The agent will exploit these if not blocked.

### 2.4 Outcome checks, not process checks

Verify WHAT the agent produced, not HOW. "Does the course exist with these settings?" not "Did the agent click Site Administration > Courses > Add?"

### 2.5 Instruction = colleague's email

Conversational tone. No numbered steps, no menu paths, no trap hints. State the desired end-state and let the agent figure out the workflow.

### 2.6 Verifier calibration

- Fuzzy text matching (substring, normalized containment)
- 5% numeric tolerance for computed values
- Whitespace/case tolerance
- Handle both "record exists" and "record has correct values" as separate checks
- Graceful fallback to 0.0 on missing records (don't crash)

### 2.7 Step-budget feasibility

Tasks should be solvable in 60-100 steps by a perfect agent, with a 150-200 step cap. Web app tasks tend to require more steps than desktop tasks due to page loads, form submissions, and navigation depth.

---

## 3. Per-Task Database Customization

Every task ships its own `setup.sh`. For tasks needing custom DB state, put SQL inserts in that task's `setup.sh` before the Chrome launch. For tasks that don't, use the generic boilerplate (wait for app, open Chrome). There's no separate mechanism.

### Execution order

The orchestrator runs files in this sequence:
1. `services.sh` -- starts the database + web server (MariaDB/Apache for Moodle, Postgres/Odoo for Odoo)
2. `setup.sh` -- runs arbitrary commands (including SQL), then opens Chrome
3. Agent starts interacting

Since the database is running by the time `setup.sh` executes, SQL statements in `setup.sh` can INSERT, UPDATE, or DELETE records before the agent sees anything. The web app serves the modified data immediately.

### Moodle per-task DB edits (in setup.sh)

```bash
#!/bin/bash
# Wait for MariaDB to be ready (started by services.sh)
for i in $(seq 1 30); do
    mysql -u moodleuser -pMoodlePass1! moodle -e "SELECT 1" &>/dev/null && break
    sleep 1
done

# Add a new student specific to this task
mysql -u moodleuser -pMoodlePass1! moodle -e "
INSERT INTO mdl_user (auth, confirmed, username, password, firstname, lastname, email, mnethostid)
VALUES ('manual', 1, 'newstudent1', '\\\$2y\\\$10\\\$dummy', 'Jane', 'Doe', 'jane@example.com', 1);
"

# Create a new assignment in an existing course
mysql -u moodleuser -pMoodlePass1! moodle -e "
INSERT INTO mdl_assign (course, name, intro, introformat, duedate, grade)
VALUES ((SELECT id FROM mdl_course WHERE shortname='CS101'), 'Special Project', 'Task-specific assignment', 1, UNIX_TIMESTAMP('2026-05-01'), 100);
"

# Then open Chrome as usual
export DISPLAY=:0
setsid nohup google-chrome --no-first-run "http://localhost/moodle" &>/dev/null &
sleep 3
exit 0
```

### Odoo per-task DB edits (in setup.sh)

```bash
#!/bin/bash
# Wait for Postgres to be ready
for i in $(seq 1 30); do
    sudo -u odoo psql -d biz_demo -c "SELECT 1" &>/dev/null && break
    sleep 1
done

# Add a task-specific lead
sudo -u odoo psql -d biz_demo -c "
INSERT INTO crm_lead (name, expected_revenue, team_id, user_id, type, active, stage_id)
VALUES ('Acme Corp - Special Deal', 250000,
  (SELECT id FROM crm_team WHERE name='North America'),
  (SELECT id FROM res_users WHERE login='admin'),
  'opportunity', true,
  (SELECT id FROM crm_stage WHERE name='New'));
"

# Add a task-specific vendor bill
sudo -u odoo psql -d biz_demo -c "
INSERT INTO account_move (move_type, partner_id, state, date)
VALUES ('in_invoice',
  (SELECT id FROM res_partner WHERE name ILIKE '%AWS%' LIMIT 1),
  'draft', '2026-04-01');
"

# Then open Chrome
export DISPLAY=:0
setsid nohup google-chrome --no-first-run "http://localhost:8069/web" &>/dev/null &
sleep 3
exit 0
```

### When to use per-task DB edits

- **Task requires specific data the agent must find/modify** -- e.g., "find the overdue invoice from Acme and post it." Seed the specific invoice so you know the verifier can check for it.
- **Task tests data-dependent reasoning** -- e.g., "which sales team has the highest revenue?" Insert data that makes the answer unambiguous.
- **Task needs entities that don't exist in base seed** -- e.g., a draft quotation with specific products, a student with a specific grade pattern.

### Caveats

- **Odoo computed fields**: Raw SQL inserts skip Odoo's ORM, so computed/stored fields (e.g., `amount_total` on `sale.order`) won't be populated. For records that need computed fields, either: (a) insert only into simple tables (crm_lead, res_partner), or (b) use Odoo's `odoo shell` command to create records via ORM in setup.sh (slower but correct).
- **Moodle caches**: After DB edits, Moodle may cache stale data. Call `php /var/www/html/moodle/admin/cli/purge_caches.php` in setup.sh if needed.
- **Keep edits minimal**: Don't rebuild half the database. The base seed has ~1,100 (Odoo) / ~800 (Moodle) records. Per-task edits should add 1-10 records for the specific scenario.

---

## 4. Web-App-Specific Difficulty Drivers

Web apps like Moodle and Odoo introduce difficulty categories that desktop apps don't:

### 4.1 Deep menu navigation (maps to Taxonomy Category C)
- Odoo: Settings are buried 3-4 levels deep. The sidebar + breadcrumb + app switcher navigation model is complex.
- Moodle: Site Administration has 100+ settings pages organized in a tree. Activity settings have "Show more..." sections that hide critical fields.

### 4.2 Form wizard complexity (maps to Category C)
- Odoo: Creating a sales order requires filling a header form, then adding line items in an embedded list, then confirming. Each line item opens a sub-form.
- Moodle: Creating a quiz involves: create the quiz activity, then add questions, each question type has its own form with 10+ fields, some in collapsed sections.

### 4.3 Dynamic page content (maps to Category G -- async/flipbook)
- Both apps use AJAX-heavy UIs. Odoo is a SPA (OWL framework) -- DOM mutates without full page reloads.
- Dropdowns in both apps load options dynamically (Odoo's Many2one fields do server-side search-as-you-type).

### 4.4 Stateful multi-step workflows (maps to Category J -- goal coherence)
- Odoo: Lead > Opportunity > Quotation > Sale Order > Invoice > Payment is a 6-step workflow.
- Moodle: Assignment > Submission > Grade > Feedback > Release is a multi-step flow.

### 4.5 Bulk operations with validation (maps to Category D)
- Odoo: Importing contacts via CSV, bulk-confirming quotations, mass-mailing.
- Moodle: Uploading grades via CSV, bulk-enrolling students, importing quiz questions.

### 4.6 Cross-module data flow (novel for web apps)
- Odoo: A CRM lead converts to a sale order which generates an invoice. Verification requires checking 3+ tables.
- Moodle: Course enrollment triggers group membership which affects gradebook visibility.

---

## 5. Data Landscapes

### 5.1 Moodle (MariaDB)

| Entity | Count | Key fields for verification |
|--------|-------|---------------------------|
| Categories | 6 | CS, Math, Business, Data Science, Engineering, Humanities |
| Courses | 16 | shortname (CS101..HUM201), fullname, format=topics, named sections |
| Teachers | 12 | teacher1-teacher12, editingteacher role |
| Students | 60 | student1-student60, 15-25 per course |
| Cohorts | 4 | Fall 2025, Spring 2026, Graduate, Exchange |
| Groups | 16 | One "Study Group" per course |
| Assignments | 2-3/course | Homework, Lab Report, Project |
| Forums | 1-2/course | General Discussion, Q&A |
| Calendar events | 121 | Lectures, office hours, deadlines |
| Grades | ~60% coverage | Scores 40-100% of max |

Credentials: `admin`/`Admin123!`, `teacher1-12`/`Teacher123!`, `student1-60`/`Student123!`

Verification: `mysql -u moodleuser -pMoodlePass1! moodle -tANe "<query>"`

Key tables: `mdl_course`, `mdl_course_categories`, `mdl_assign`, `mdl_user`, `mdl_user_enrolments`, `mdl_role_assignments`, `mdl_groups`, `mdl_cohort`, `mdl_grade_grades`, `mdl_grade_items`, `mdl_event`, `mdl_course_modules`, `mdl_quiz`, `mdl_forum`.

### 5.2 Odoo (PostgreSQL)

| Entity | Count | Key fields for verification |
|--------|-------|---------------------------|
| Company | 1 | "Luminex Solutions Inc." |
| Partner companies | 45 | 10 industries, 12 countries |
| Contacts | 138 | 2-4 per company, varied job titles |
| Sales teams | 3 | North America, EMEA, Inbound |
| CRM leads | 90 | 30% New, 15% Qualified, 15% Proposition, 20% Won, 20% Lost |
| Products (sell) | 15 | SaaS subscriptions, add-ons, consulting |
| Sale orders | ~41 | ~70% confirmed (state=sale), rest draft |
| Mailing lists | 4 | Newsletter, Product Updates, Enterprise, Events |
| Email campaigns | 12 | 7 sent, 5 draft |
| Mailing traces | ~300 | Open/click/bounce/reply stats |
| Calendar events | 35 | Demo calls, reviews, onboarding |
| Employees | 25 | 7 departments, 16 job positions |
| Customer invoices | 45 | Draft + posted |
| Vendor bills | 30 | From 10 named suppliers |

Credentials: `admin`/`admin` at `localhost:8069`

Verification: `sudo -u odoo psql -d biz_demo -tAc "<query>"`

Key tables: `res_partner`, `crm_lead`, `crm_team`, `sale_order`, `sale_order_line`, `product_product`, `mailing_mailing`, `mailing_trace`, `calendar_event`, `hr_employee`, `hr_department`, `account_move`, `account_move_line`, `mail_activity`.

---

## 6. Task Catalogs by Domain

All tasks target **hard** difficulty: 7-12 checks, 60-120 steps, designed to fail at xhigh. We can simplify later by reducing check counts or narrowing scope.

### Domain 1: Accounting (Odoo)

**A01: Invoice posting and payment reconciliation**
- Find 3 specific draft customer invoices (seeded per-task), post (validate) all of them
- Register a partial payment on the highest-value invoice
- Add internal notes on each explaining the posting reason
- Verify: 3 invoices in "posted" state, 1 partial payment record, 3 internal notes with content

**A02: Vendor bill audit and annotation**
- Navigate vendor bills, filter by a specific supplier (e.g., AWS)
- Sum all bills from this vendor and find the bill with the highest total
- Add an internal comment noting the total spend and flagging the largest bill
- Navigate to a second vendor, repeat the process
- Verify: comments on correct partner records, amounts within 5% of DB values, correct bills identified

**A03: Cross-module revenue reconciliation**
- Navigate CRM to find total expected revenue of Won deals
- Navigate Sales to find total confirmed order value
- Navigate Invoicing to find total posted invoice amount
- Create a text file on Desktop comparing the three numbers
- Verify: file exists on Desktop, 3 numbers present and within 5% of actual DB values

**A04: Month-end invoice batch**
- Find all draft customer invoices dated in March 2026
- Post each one, verifying the amounts match before confirming
- Create a calendar event "March Close Complete" for tomorrow at 9am
- Verify: all March drafts now posted, no non-March drafts affected, calendar event exists

**A05: Vendor payment scheduling**
- Review all vendor bills from the top 3 suppliers by bill count
- Create a follow-up activity on each vendor's latest bill: "Schedule payment"
- Create a single calendar event "Vendor Payment Run" for next Friday
- Verify: activities on correct bills, calendar event with correct date, correct vendor identification

### Domain 2: Financial Services (Odoo)

**F01: Deal pipeline management**
- Find all leads in "Proposition" stage with expected revenue > $50K
- Advance the highest-value lead to Won
- Create a quotation for that lead with 3 product lines from the catalog
- Schedule "Contract review" activities on remaining Proposition leads
- Verify: correct lead Won, sale order with 3 lines linked to correct partner, activities on remaining leads

**F02: Client onboarding workflow**
- Create a new partner company "Meridian Capital Group" with industry, country, and 2 contacts
- Create a lead for the company worth $200K, assign to EMEA team
- Create a quotation with Enterprise Plan + API Access + Onboarding Package
- Confirm the quotation
- Verify: partner exists with contacts, lead linked, sale order confirmed with 3 lines, correct amounts

**F03: Portfolio review and CRM cleanup**
- Find all leads in "New" stage older than 30 days (by create_date)
- Move them to Lost with reason "No response"
- Tag remaining active leads worth >$100K with "Enterprise" tag
- Verify: correct leads moved to Lost with reason, correct leads tagged, count matches DB

**F04: Quarter-end deal summary**
- Navigate CRM pipeline, identify the sales team with the most Won deals
- Navigate to that team's confirmed sale orders
- Sum total order value and create an activity on the team: "Q1 summary: $X total"
- Verify: correct team identified, activity on correct team record, amount within 5%

### Domain 3: Marketing/Sales (Odoo)

**S01: Campaign creation and list segmentation**
- Create a new mailing list "Q2 Product Launch Prospects"
- Add contacts from companies in the Technology industry
- Create a draft email campaign targeting this list with subject "Introducing Our New Platform"
- Verify: list exists, correct contacts added, campaign linked to list, subject correct

**S02: Campaign performance analysis and follow-up**
- Find the sent campaign with the highest open rate
- Create a follow-up draft campaign targeting the same list with a new subject
- Add contacts who opened the original campaign to a new list "Engaged Prospects"
- Verify: correct campaign identified, new campaign created, new list with correct contacts

**S03: Lead scoring and segmentation**
- Navigate CRM leads, filter by expected revenue > $50K
- Tag all matching leads with "Enterprise" tag
- Move any untagged high-value leads (>$100K) to "Qualified" stage
- Create mailing list "High Value Prospects" and add lead contacts
- Verify: correct leads tagged, stage changes on >$100K leads, mailing list with correct contacts

**S04: Multi-channel outreach setup**
- Create 2 draft campaigns targeting different lists with different subjects (A/B test framing)
- Create a calendar event "Campaign Launch Review" for next Monday at 10am
- Add a CRM activity on 3 specific leads: "Follow up after campaign launch"
- Verify: 2 campaigns with different subjects/lists, calendar event, 3 activities on correct leads

### Domain 4: Professional Assistant (Odoo)

**P01: Calendar conflict resolution and scheduling**
- Review admin's calendar for next week
- Identify any overlapping events (seeded per-task with intentional conflicts)
- Reschedule the lower-priority event to the next available slot
- Add a note on the rescheduled event explaining the change
- Verify: no remaining conflicts, rescheduled event at correct time, note present

**P02: Activity triage and follow-up**
- Find all overdue activities across CRM, Sales, and Calendar
- Reschedule each overdue activity to this week with updated summaries
- Create a summary note on admin's next calendar event: "Cleared X overdue items"
- Verify: no remaining overdue activities, correct reschedule dates, summary note accurate

**P03: Meeting prep and contact coordination**
- Find a specific upcoming calendar event (seeded per-task)
- Look up all attendees in the contact directory
- For each attendee from a company with active CRM leads, add the lead status to the event description
- Verify: event description contains correct lead info for correct attendees

**P04: HR directory update and org coordination**
- An employee has transferred departments (instruction specifies who and where)
- Update their department, job title, and work email in HR
- Cancel any calendar events they were attending in their old department
- Create a "Welcome meeting" with the new department head
- Verify: employee record updated, old events cancelled, new event with correct attendee

**P05: Executive briefing assembly**
- Compile data from 3 modules: top 3 CRM deals by value, next week's calendar events, overdue activities
- Create a text file on Desktop "weekly_briefing.txt" summarizing all findings
- Verify: file exists, contains correct deal names/values (5% tolerance), correct event count, correct overdue count

### Domain 5: Education (Moodle)

**E01: Full course setup**
- Create course "Advanced NLP" (CS501) in CS category
- Add 8 named topic sections, 3 assignments (increasing points: 50, 100, 150), 1 forum
- Enroll teacher3 and students 50-60
- Create a study group with half the enrolled students
- Verify: course exists, 8 sections named, 3 assignments with correct points, forum exists, enrollments correct, group with ~5 members

**E02: Quiz creation with multiple question types**
- In MATH301, create a quiz "Midterm Exam"
- Add 3 multiple-choice questions (4 options each, one correct)
- Set time limit 60 minutes, 1 attempt allowed, shuffle questions
- Verify: quiz exists, 3 questions linked, settings correct, question types match

**E03: Gradebook management and grade overrides**
- Navigate CS101 gradebook, find all students scoring below 50% on any assignment
- Override their grades to 50% minimum
- Set assignment weights: Homework 30%, Midterm 30%, Final 40%
- Verify: overrides applied to correct students only, weights configured, aggregation method set

**E04: Cohort-based bulk enrollment**
- Create a new cohort "Summer 2026 Intensive"
- Add students 40-55 to the cohort
- Enroll the cohort into BUS101 and BUS201
- Create a study group in each course with the new students
- Verify: cohort exists with 16 members, enrollments in both courses, 2 groups created

**E05: Course completion and conditional access**
- In DS101, configure completion tracking: all assignments submitted + 60% overall grade
- Make Assignment 2 available only after Assignment 1 is completed
- Create 3 "Office Hours" calendar events for the course teacher on consecutive weeks
- Verify: completion criteria in DB, availability conditions, 3 calendar events with correct times

**E06: End-of-semester workflow**
- In CS101: finalize all grades (ensure all students have grades for all assignments)
- Set course visibility to hidden
- Export gradebook as CSV to Desktop
- Post an announcement in the course forum: "Final grades posted"
- Verify: all grade records present, course hidden, CSV file on Desktop with correct structure, forum post exists

**E07: Multi-course calendar coordination**
- Check for scheduling conflicts between CS101 and MATH101 lecture events
- Create a "Makeup Session" event for any conflicting slot
- Post notices in both course forums about the schedule change
- Verify: makeup event at correct time, forum posts in both courses, no remaining unaddressed conflicts

---

## 7. Verification Patterns

### Moodle (MariaDB)

```python
#!/usr/bin/env python3
import subprocess, sys

def sql(q):
    return subprocess.run(
        ["mysql", "-u", "moodleuser", "-pMoodlePass1!", "moodle", "-tANe", q],
        capture_output=True, text=True
    ).stdout.strip()

checks_passed = 0
total_checks = N

# Check record existence
if sql("SELECT COUNT(*) FROM mdl_course WHERE shortname = 'CS501'") == "1":
    checks_passed += 1

# Check field value (fuzzy)
result = sql("SELECT fullname FROM mdl_course WHERE shortname = 'CS501'")
if result and "NLP" in result:
    checks_passed += 1

# Check enrollment count
count = sql("""
    SELECT COUNT(*) FROM mdl_user_enrolments ue
    JOIN mdl_enrol e ON ue.enrolid = e.id
    JOIN mdl_course c ON e.courseid = c.id
    WHERE c.shortname = 'CS501'
""")
if count and int(count) >= 10:
    checks_passed += 1

# Check grade with tolerance
grade = sql("SELECT finalgrade FROM mdl_grade_grades WHERE ...")
if grade:
    try:
        if abs(float(grade) - 85.0) / 85.0 < 0.05:
            checks_passed += 1
    except ValueError:
        pass

print(f"{1.0 if checks_passed == total_checks else 0.0:.1f}")
```

### Odoo (PostgreSQL)

```python
#!/usr/bin/env python3
import subprocess, sys

def sql(q):
    return subprocess.run(
        ["sudo", "-u", "odoo", "psql", "-d", "biz_demo", "-tAc", q],
        capture_output=True, text=True
    ).stdout.strip()

checks_passed = 0
total_checks = N

# Check record existence (case-insensitive)
if sql("SELECT count(*) FROM crm_lead WHERE name ILIKE '%Acme Corp%'") != "0":
    checks_passed += 1

# Check numeric with tolerance
rev = sql("SELECT expected_revenue FROM crm_lead WHERE name ILIKE '%Acme Corp%'")
if rev:
    try:
        if abs(float(rev) - 150000) / 150000 < 0.05:
            checks_passed += 1
    except ValueError:
        pass

# Check Many2one join
team = sql("""
    SELECT ct.name FROM crm_lead cl
    JOIN crm_team ct ON cl.team_id = ct.id
    WHERE cl.name ILIKE '%Acme Corp%'
""")
if team and "North America" in team:
    checks_passed += 1

# Check workflow state
if sql("SELECT state FROM sale_order WHERE id = 42") == "sale":
    checks_passed += 1

# Check activity exists
if sql("SELECT count(*) FROM mail_activity WHERE res_model = 'crm.lead' AND summary ILIKE '%demo%'") != "0":
    checks_passed += 1

print(f"{1.0 if checks_passed == total_checks else 0.0:.1f}")
```

---

## 8. Services and Setup Templates

### Moodle task boilerplate

**task.toml:**
```toml
version = "1.0"
[metadata]
name = "cua-moodle-XX"
category = "education"
tags = ["cua", "moodle", "gui-only"]
difficulty_explanation = "..."

[environment]
template = "cua-eval-moodle"
allow_internet = false

[verifier]
timeout_sec = 30
```

**services.sh:** `sudo /usr/local/bin/start-moodle.sh`

**setup.sh (pre-authenticated):**
```bash
#!/bin/bash
export DISPLAY=:0
for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost/moodle/login/index.php && break; sleep 1; done
TOKEN=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
  'http://localhost/moodle/login/index.php' | grep logintoken | grep -o 'value="[^"]*"' | head -1 | cut -d'"' -f2)
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
  -d "username=admin&password=Admin123!&logintoken=$TOKEN" \
  'http://localhost/moodle/login/index.php'
# Per-task DB edits go here (optional)
setsid nohup google-chrome --no-first-run "http://localhost/moodle" &>/dev/null &
sleep 3
exit 0
```

### Odoo task boilerplate

**task.toml:**
```toml
version = "1.0"
[metadata]
name = "cua-odoo-XX"
category = "accounting"  # or financial_services, marketing_sales, law, health, professional_assistant
tags = ["cua", "odoo", "gui-only"]
difficulty_explanation = "..."

[environment]
template = "cua-eval-odoo"
allow_internet = false

[verifier]
timeout_sec = 30
```

**services.sh:** `sudo /usr/local/bin/start-odoo.sh`

**setup.sh:**
```bash
#!/bin/bash
export DISPLAY=:0
for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:8069/web/login && break; sleep 1; done
# Per-task DB edits go here (optional)
setsid nohup google-chrome --no-first-run "http://localhost:8069/web" &>/dev/null &
sleep 3
exit 0
```

---

## 9. Trap Patterns Specific to Web Apps

**T1: Dynamic dropdown confusion** -- Agent types in a Many2one field but doesn't wait for the dropdown or selects the wrong match. Odoo: "Pro" matches "Professional Plan", "Product Updates", "Project Management".

**T2: Save vs discard** -- Agent fills fields but navigates away without saving. Moodle: "Save and return to course" vs "Save and display".

**T3: Stale page state** -- After creating a record, list view doesn't refresh. Agent makes decisions based on stale data.

**T4: Nested form confusion** -- Odoo inline editing (sale order lines): click embedded list, fill fields, save parent. Missing any step loses line items.

**T5: Pagination** -- Odoo shows 80 records/page. Target on page 2 requires scrolling. Moodle gradebook paginates at 100 students.

**T6: Filter persistence** -- Both apps persist filter state in URL. Agent applies filter, navigates away, filter persists and hides records.

**T7: Confirmation dialogs** -- Odoo "Are you sure?" on destructive actions. Moodle confirmation pages for deletions and bulk ops.

---

## 10. Task Generation Workflow

Each session focuses on **one domain** (e.g., Accounting, Education). The workflow has two phases: batch creation, then iterative eval. Concurrency is limited by harbor eval infrastructure.

### Concurrency constraints

| Activity | Max concurrent | Notes |
|----------|---------------|-------|
| Task creation + sandbox inspection | ~20 | Subagents creating files + launching E2B sandboxes to verify setup.sh works |
| Eval runs (xhigh agent trials) | 3-4 | Harbor eval bottleneck -- each run is expensive and long (~5-10 min) |

### Phase 1: Batch creation (high concurrency)

Launch up to ~20 subagents in parallel. Each subagent:

1. **Picks a task idea** from the domain's catalog in Section 6 (or generates a new one following the heuristics in Section 2)
2. **Creates the task directory** with all files:
   - `task.toml` (from boilerplate in Section 8, with domain-specific category)
   - `instruction.md` (conversational, GUI-only mandate, no numbered steps)
   - `environment/services.sh` (starts Moodle or Odoo)
   - `environment/setup.sh` (per-task DB edits if needed + Chrome launch)
   - `environment/data/` (any CSV/files the agent needs on Desktop)
   - `tests/verify.py` (7-12 SQL checks, all-or-nothing scoring)
   - `tests/golden_apply.py` (programmatic reference answer -- see below)
3. **Launches an E2B sandbox** to smoke-test (two directions):
   - Run `services.sh` + `setup.sh` -- does the environment start correctly?
   - **Negative direction**: Run `verify.py` against the unmodified sandbox -- must return `0.0`. (If it returns `1.0` before the agent does anything, the task is broken)
   - **Positive direction**: Run `golden_apply.py` then `verify.py` -- must return `1.0`. (If it returns `0.0` after applying the correct answer, either golden_apply or the verifier has a bug)
4. **Fixes any smoke-test failures** before moving on. Use `smoke_test_golden.py` to run both directions at scale (30 concurrent E2B sandboxes).

Output: N task directories ready for eval, all passing BOTH directions of smoke tests.

### golden_apply.py -- lessons learned (2026-04-13)

Every task MUST ship with `tests/golden_apply.py` -- a script that programmatically applies the correct answer. This is the ONLY way to validate verifier correctness without running the full agent.

**Why it matters**: In the first shipped batch (150 tasks), zero had golden_apply. When we finally built and tested them, only 22/83 (27%) passed the positive-direction smoke test. The failures revealed bugs in BOTH golden_apply scripts AND verifiers that had been silently shipping as "genuine fails."

**What golden_apply does**:
- Creates the exact end-state the agent should produce, via API/SQL/ORM instead of GUI
- For Odoo: piped to `sudo -u odoo /usr/bin/odoo shell -c /etc/odoo/odoo.conf -d biz_demo --no-http`
- For Moodle: `python3` script using `mysql` CLI inserts + `php purge_caches.php`
- For Desktop (health): `python3` script reading seed CSVs and writing output XLSX via openpyxl

**Common golden_apply bugs discovered in first batch**:
1. **Odoo `sudo` from odoo shell**: The `odoo` user can't `sudo mv` files to `/home/user/Desktop`. Fix: write to `/tmp/golden_desktop/` inside the odoo shell, then use a wrapper that runs `sudo cp` + `sudo chown` OUTSIDE the odoo shell. The `/tmp/golden_desktop/` pattern is now standard for all Odoo file-write tasks.
2. **Odoo ORM crashes**: Wrong field names, nonexistent records, missing required fields. Fix: always look up IDs by name with error handling, never hardcode.
3. **Moodle schema complexity**: Direct SQL inserts miss foreign keys, context records, module instances. Moodle's question bank requires 4-table chain (question_bank_entries → question_versions → question → quiz_slots). Fix: read verify.py's exact queries and reverse-engineer what rows it expects.
4. **Moodle `idnumber` column bug**: `mdl_question_bank_entries` does NOT have an `idnumber` column -- golden_apply INSERTs that reference it will silently fail. This affects ALL education golden_apply scripts that create quiz questions. Always check `information_schema.columns` before assuming a column exists.
5. **Odoo 18 mailing subscriptions**: Use `mailing.subscription.create()` not `subscription_list_ids` for adding contacts to mailing lists. The `subscription_list_ids` field is not directly writable in Odoo 18.
6. **Health seed data missing**: golden_apply reads `/home/user/Desktop/*.csv` but setup.sh must copy seed files there first. Fix: ensure smoke test runs setup.sh before golden_apply.
7. **openpyxl not installed**: Both golden_apply and verify.py may need it. Fix: orchestrator now auto-installs before verify; golden_apply should `pip install` in its preamble.

**Iterative fix loop workflow** (refined 2026-04-13):
1. Run `smoke_test_golden.py` with 30 concurrent sandboxes -- tests BOTH negative (0.0 on empty) and positive (1.0 after golden_apply) directions
2. Read per-check PASS/FAIL output from the positive direction
3. **Triage step (CRITICAL)**: ALWAYS determine if failure is golden_apply bug or verifier bug BEFORE fixing. Never guess from verifier numbers alone -- read the structured JSON output and trace which check failed and why.
   - golden_apply bug: wrong state created (missing record, wrong field value, ORM error)
   - verifier bug: wrong check logic (hardcoded distractor count, wrong threshold, bad SQL)
4. Fix the RIGHT file (golden_apply.py OR verify.py), re-run single task
5. Repeat until all tasks pass both directions

**Tracking files**:
- `STATUS.md` is the single source of truth for per-domain task counts (shipped, WIP, target)
- `PROMOTION_TRACKER.md` tracks the WIP-to-shipped promotion pipeline for each task

**Smoke test tool**: `computer-use/smoke_test_golden.py <task_list_file> [max_concurrent]`

### Phase 2: Iterative eval (low concurrency, 3-4 at a time)

Run eval trials in small batches of 3-4 concurrent:

1. **Run 1 xhigh trial per task** using harbor eval / orchestrator.py
2. **Classify each result**:
   - **Pass (1.0)**: Task is too easy. Increase difficulty -- add more checks, require cross-module workflow, add per-task DB state that forces data-dependent reasoning. Re-run.
   - **Fail (0.0) -- genuine model failure**: Read the trajectory. Confirm the agent engaged with the task, attempted the right workflow, but missed specific details. This is the target outcome. Task ships.
   - **Fail (0.0) -- task/env bug**: Verifier checks something the instruction doesn't mention, setup.sh left broken state, SQL query in verify.py is wrong, app didn't start properly. Fix and re-run.
   - **Fail (0.0) -- infra issue**: Rate limit, sandbox timeout, setup crash. Re-run without changes.
3. **Iterate** on non-shipping tasks: fix bugs, adjust difficulty, re-eval. Each iteration evals 3-4 tasks concurrently.


After the first batch of tasks has been through at least one eval round:

1. **Check if `.claude/skills/cua-moodle-odoo-{domain_name}/` exists**. If not, create it.
2. **Seed the skill** with learnings from the first round:
   - Which Odoo/Moodle navigation paths the agent struggles with
   - Which verification SQL patterns worked vs broke
   - Which task structures hit the sweet spot (genuine failure) vs were too easy/buggy
   - Common setup.sh pitfalls for this domain (e.g., Odoo computed fields not populating via raw SQL)
   - Domain-specific trap patterns that emerged
3. **Update the skill after each subsequent eval round** with new findings. The skill becomes the institutional memory for that domain -- future task generation sessions read it first and avoid repeating mistakes.

### Directory layout: wip vs shipped

Tasks under construction live in `moodle-odoo-wip/`, finalized tasks move to `moodle-odoo-shipped/`:

```
computer-use/tasks/
  pool_40/                          # existing desktop tasks (shipped)
  mix_40/                           # existing desktop tasks (shipped)
  moodle-odoo-wip/                              # under construction -- iterate here
    accounting/
      cua-odoo-accounting-01/
      cua-odoo-accounting-02/
      ...
    education/
      cua-moodle-education-01/
      ...
  moodle-odoo-shipped/                          # confirmed genuine failures -- final pool
    accounting/
      cua-odoo-accounting-01/
      ...
    education/
      cua-moodle-education-03/
      ...
```

**Rules:**
- Subagents create tasks in `moodle-odoo-wip/{domain}/`
- All eval iteration happens in `moodle-odoo-wip/` -- files are edited in place
- Once a task is confirmed as a genuine xhigh failure, `mv` it to `moodle-odoo-shipped/{domain}/`
- Tasks that are abandoned (unfixable env bugs, fundamentally too easy) get deleted from `moodle-odoo-wip/`
- `moodle-odoo-shipped/` is the deliverable. Never edit files there without re-running eval.
- The orchestrator / eval scripts don't care about the parent directory -- they take any task path

### Session script (one domain, start to finish)

```
SESSION START -- pick domain (e.g., "accounting")

1. Read skill: .claude/skills/cua-moodle-odoo-taskgen/SKILL.md
   Read domain skill (if exists): .claude/skills/cua-moodle-odoo-accounting/SKILL.md

2. BATCH CREATE (parallel, ~20 subagents)
   For each of N tasks:
     - Subagent creates task dir under computer-use/tasks/moodle-odoo-wip/accounting/cua-odoo-accounting-XX/
     - Subagent smoke-tests in E2B sandbox
     - Subagent fixes any smoke-test failures
   Wait for all subagents to complete.

3. EVAL ROUND 1 (parallel, 3-4 at a time)
   For each task:
     - Run 1 xhigh trial
     - Read trajectory + verifier output
     - Classify: genuine_fail | task_bug | too_easy | infra
   Collect results.

4. CREATE/UPDATE DOMAIN SKILL
   If .claude/skills/cua-moodle-odoo-accounting/ does not exist:
     - Create SKILL.md with findings from round 1
   Else:
     - Append new findings to existing SKILL.md

5. FIX + RE-EVAL (parallel, 3-4 at a time)
   For tasks classified as task_bug or too_easy:
     - Fix the issue (informed by domain skill)
     - Re-run 1 xhigh trial
     - Re-classify
   Repeat until all tasks are either genuine_fail (ship) or abandoned.

6. SHIP
   mv confirmed tasks from moodle-odoo-wip/{domain}/ to moodle-odoo-shipped/{domain}/
   Delete abandoned tasks from moodle-odoo-wip/{domain}/
   Update domain skill with final task inventory.

SESSION END
```

### Subagent responsibilities

**Creation subagent** (Phase 1, up to ~20 concurrent):
- Receives: domain name, task idea (from catalog or generated), skill docs
- Produces: complete task directory, smoke-test results
- Has access to: Bash (for E2B sandbox), Write/Edit (for task files), Read (for skills)

**Eval subagent** (Phase 2, 3-4 concurrent):
- Receives: task directory path, eval results (trajectory, verifier output, screenshots)
- Produces: classification (genuine_fail | task_bug | too_easy | infra) + fix if task_bug
- Has access to: Read (trajectory + verifier output), Edit (fix task files), Bash (re-run eval)


---

## 11. Cross-Domain Learnings (2026-04-13)

### Conversion rates by failure mode (from ~300 eval trials)

| Failure mode | Best domain | Fail rate | Notes |
|---|---|---|---|
| JE line grid creation | Accounting | **~100%** | Agent cannot fill journal entry line items |
| Quiz MCQ creation | Education | **~80%** | Agent can't fill Moodle question forms |
| Gradebook config | Education | **~75%** | Hidden "Show more" fields |
| Desktop cross-doc (150+ rows) | Health | **~60%** | Multi-file reconciliation, computed metrics |
| Multi-lead different actions | Sales | **~43%** | 3-4 leads each with Won/Lost/advance |
| Step budget (8+ sub-goals) | All | **~30%** | Varies by domain |
| tax_exclusive_misread (1% tol) | Accounting | **~60%** | Agent reads Tax Excluded column |
| wrong_chatter_tab | Accounting | **~30%** | Send message vs Log note |

### What does NOT work

| Approach | Domain | Fail rate | Why |
|---|---|---|---|
| Simple Odoo workflows | Sales | **<20%** | Agent handles CRM/Sales extremely well |
| Odoo health tasks | Health | **0%** | Agent handles inventory/billing trivially |
| tax_exclusive_misread in Sales | Sales | **~15%** | Agent reads correct column in Odoo Sales |
| Long pipeline (12+ steps) | Sales | **~20%** | Agent is efficient at sequential workflows |
| gpt-5.4 medium harness for task gen | All | **0%** | Model too weak, hits max_steps reading files |

### Pipeline discipline (learned)

1. **Never idle** — always saturate eval slots (30), gen subagents, audit agents
2. **Ship immediately** on genuine fail, but ONLY after golden_apply + verifier agreement smoke test
3. **Triage before fixing** — always check if failure is golden_apply bug or verifier bug before modifying code
4. **Audit continuously** — 1-2 subagents checking shipped tasks at all times
5. **Restructure to canonical layout** before shipping (see accounting skill section 7)
6. **Capture end-state artifacts** in orchestrator (Desktop files + DB dump)
7. **Track everything in `tasks/STATUS.md`** — single source of truth for counts + state

### Shipping + Drive workflow

**Directory layout:**
- `tasks/moodle-odoo-shipped/` — verified genuine fails with golden_apply validated
- `tasks/moodle-odoo-wip/` — tasks being fixed/evaled/triaged
- `tasks/STATUS.md` — counts and state tracking
- `tasks/moodle-odoo-wip/PROMOTION_TRACKER.md` — WIP → shipped pipeline

**WIP → Shipped promotion flow:**
1. Task eval completes with reward=0.0 (genuine fail, not infra error)
2. Subagent verifies it's a genuine fail (reads verifier output, trajectory)
3. Subagent creates `tests/golden_apply.py`
4. Smoke test: `golden_apply → verify = 1.0` (both directions pass)
5. Move task dir from `moodle-odoo-wip/` to `moodle-odoo-shipped/`
6. Update `tasks/STATUS.md`

**If smoke test fails:** triage first (golden_apply_bug vs verifier_bug), fix the right file, re-smoke.

**If verifier_bug found:** move task BACK to WIP, fix verifier, re-eval the agent from scratch.

**Google Drive sync:**
- Drive folder: `1bUTro89qx93IxF_FnvDPLnwFyf4T0Jhp`
- Auth: OAuth token at `google_drive_token.json` (created via `google_client.json` interactive flow)
- Service account at `google_drive_key.json` can READ but cannot write/delete (no storage quota)
- Sync script: `python3 sync_drive_oauth.py` (from repo root) — deletes old zips, creates per-domain zips, uploads
- Zips contain full task dirs: instruction.md, task.toml, tests/, trajectory/, verifier/, reward.txt, etc.
- **Re-sync after**: promoting tasks to shipped, removing verifier-bug tasks, any shipped dir changes
- **Token refresh**: if token expires, re-run the OAuth flow:
  ```
  cd ~/Documents/vibe-rl-gym && python3 -c "
  from google_auth_oauthlib.flow import InstalledAppFlow
  flow = InstalledAppFlow.from_client_secrets_file('google_client.json', scopes=['https://www.googleapis.com/auth/drive'])
  creds = flow.run_local_server(port=8080)
  import json
  with open('google_drive_token.json', 'w') as f:
      json.dump({'token': creds.token, 'refresh_token': creds.refresh_token, 'client_id': creds.client_id, 'client_secret': creds.client_secret, 'token_uri': creds.token_uri}, f)
  print('Saved google_drive_token.json')
  "
  ```

### Current state (2026-04-13 end of session)

| Domain | Shipped | Golden Validated | Golden Failing | In WIP | Target | Gap |
|---|---|---|---|---|---|---|
| Accounting | 37 | 36 | 1 (N2) | ~10 eval pending + 1 golden fix (56) | 40 | 3 |
| Education | 20 | 15 | 5 (12,23,26,29,30) | ~19 eval pending + 5 golden fix (32,36,38,39,40) | 40 | 20 |
| Sales | 15 | 9 | 6 (03,05,41,48,81,88) | ~13 eval pending | 40 | 25 |
| Health | 18 | 18 | 0 | ~25 eval pending + 4 verifier bugs (41,44,48,49) | 40 | 22 |
| **Total** | **90** | **78** | **12** | **~77** | **160** | **70** |

**Drive zips**: 78 of 90 shipped tasks are in the Drive zips. 12 recently promoted tasks need to be added. Re-run `python3 sync_drive_oauth.py` after fixes land.

---

## Remaining work for next session (READ THIS FIRST)

### Priority 1: Finish golden_apply validation for 12 shipped tasks

These 12 shipped tasks have confirmed golden_apply bugs (NOT verifier bugs — triaged twice). Fix golden_apply, smoke test, repeat until all pass.

**Accounting (1):** N2 — `message_post()` note persistence / file content mismatch
**Education (5):** 12, 23, 26, 29, 30 — `timecreated` column JUST FIXED (sed), needs re-smoke to verify
**Sales (6):** 03, 05, 41, 48, 81, 88 — mixed: missing seed data creation, `product_id_change` removed in Odoo 18, calendar/note persistence

**Action:** Run `smoke_test_golden.py` on these 12 first. The education 5 may now pass (timecreated fix applied). For remaining failures, do another triage → fix → smoke cycle.

### Priority 2: Smoke test + promote 6 WIP golden_apply tasks

6 WIP tasks have golden_apply created but failed smoke test. `timecreated` fix JUST applied.

**Education (5):** 32, 36, 38, 39, 40
**Accounting (1):** 56

**Action:** Smoke test these 6. Any that pass → promote to shipped. Any that fail → triage → fix → smoke.

### Priority 3: Fix 4 WIP health verifier bugs

4 WIP health tasks have VERIFIER bugs (not golden_apply bugs). The verifier searches for an aggregate metric as a literal cell value, but golden_apply only writes per-row detail.

**Tasks:** health-41, 44, 48, 49

**Fix options (pick one per task):**
- Fix verifier: sum the relevant column instead of searching for a single cell match
- Fix golden_apply: write the aggregate total into a summary cell

**Action:** Fix verifier or golden_apply, smoke test, then re-eval with gpt-5.4 (needs OpenAI quota).

### Priority 4: Re-eval ~38 WIP tasks (BLOCKED on OpenAI)

28 tasks hit RateLimitError + 10 never ran in WIP eval round 2. These need clean gpt-5.4 xhigh evals.

**Action:** Wait for OpenAI quota, then `bash eval.sh <task_list> wip_reeval_round3 30 150 xhigh`. For genuine fails: create golden_apply → smoke test → promote to shipped. For too_easy: keep in WIP or harden.

### Priority 5: Re-eval 5 verifier-bug tasks from shipped

These were moved from shipped to WIP because verifier bugs made their original eval untrustworthy. Verifiers are now fixed.

**Tasks:** accounting-08, N3; education-51, 52, 54

**Action:** Re-eval with gpt-5.4. They already have golden_apply + fixed verifiers.

### Priority 6: Generate new tasks to fill 40/domain target

After all WIP tasks are processed, we'll likely still need new tasks:
- **Sales (biggest gap, ~25 needed):** Generate multi-lead tasks (4 leads, Won/Lost/advance/advance = ~43% fail). See sales skill for gotchas.
- **Health (~22 needed):** Generate desktop cross-document tasks (200+ rows, multi-sheet XLSX = ~60% fail). Odoo health confirmed useless.
- **Education (~20 needed):** Generate quiz+gradebook tasks (~75-80% fail). See education skill for gotchas.
- **Accounting (~3 needed):** Nearly at target. Generate JE tasks if needed (~100% fail on grid entry).

### Key gotchas for ALL new task generation

1. Every task MUST ship with `tests/golden_apply.py` — no exceptions
2. Smoke test both directions BEFORE shipping
3. Triage failures (golden_apply vs verifier bug) BEFORE fixing
4. Odoo: `product.display_name` not `product.name`, `mailing.subscription.create()`, `/tmp/golden_desktop/` for file writes, `message_post()` not `mail.message.create()`
5. Moodle: NO `idnumber` or `timecreated` in `mdl_question_bank_entries` INSERT, check `information_schema` for column existence
6. Health: `setup.sh` MUST create seed CSVs, `pip install openpyxl` fallback in golden_apply
7. Track everything in `tasks/STATUS.md`
8. OpenAI gpt-5.4 quota is unreliable — check before launching large eval batches

---

## 11. Google Drive Sync

Shipped task zips are synced to a shared Google Drive folder for delivery.

### Credentials (all in repo root)

| File | Type | Use |
|------|------|-----|
| `google_drive_token.json` | OAuth2 user token | `sync_drive_oauth.py` — can list, upload, AND delete files |
| `google_drive_key.json` | Service account key | `sync_drive_zips.py` / `download_drive_zips.py` — can list and upload but CANNOT delete files it didn't create |
| `google_client.json` | OAuth client config | For refreshing the OAuth token if expired |

### Folder

Drive folder ID: `1bUTro89qx93IxF_FnvDPLnwFyf4T0Jhp`

### Scripts

- **`sync_drive_oauth.py`** (PREFERRED for uploads): Deletes ALL old zips from Drive, creates fresh per-domain zips from `moodle-odoo-shipped/`, uploads them + `visualizer.html`. Uses OAuth token (can delete).
- **`sync_drive_zips.py`**: Same zip+upload logic but uses service account. Cannot delete old zips — only appends new ones. Use when OAuth token is expired.
- **`download_drive_zips.py`**: Downloads all zips from Drive and extracts to `moodle-odoo-shipped/`. Uses service account (read-only scope).

### Zip creation logic

`create_zip()` walks `source_dir.rglob("reward.txt")`, excludes `rollouts/` subdirs, and zips each task dir's parent. **Only tasks with `reward.txt` are included in zips.** Tasks without `reward.txt` (not yet eval'd) are excluded.

### Sync workflow

```bash
# Upload (preferred — clean replace)
python3 sync_drive_oauth.py

# Upload (service account — appends, can't delete)
python3 sync_drive_zips.py

# Download
python3 download_drive_zips.py
```

### Dependencies

```bash
pip install google-auth google-auth-oauthlib google-api-python-client
```
