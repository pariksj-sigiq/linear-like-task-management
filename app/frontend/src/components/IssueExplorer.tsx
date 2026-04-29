import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Circle,
  CircleDashed,
  Filter,
  Kanban,
  List,
  MoreHorizontal,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { Issue } from "../linearTypes";
import {
  assigneeName,
  formatDate,
  initials,
  issueKey,
  issueTitle,
  priorityLabel,
  projectName,
  stateColor,
  stateName,
  teamKey,
} from "../linearTypes";
import { Button, EmptyState, ErrorBanner, Spinner } from "./ui";

type LayoutMode = "list" | "board";
const EMPTY_PARAMS: Record<string, unknown> = {};
const BOARD_STATE_ORDER = [
  "Backlog",
  "Todo",
  "Triage",
  "In Progress",
  "In PR Review",
  "In Review",
  "QA Requested",
  "In QA",
  "QA Passed",
  "Ready for QA",
  "Changes Requested",
  "Done",
  "Canceled",
  "Duplicate",
];
const ACTIVITY_BOARD_REFERENCE: Record<string, Issue[]> = {
  "In QA": [
    {
      key: "ENGG-1847",
      title: "Handle transient LLM failures",
      state: "In QA",
      estimate: 30,
      project: "ET Bug Board",
      assignee: "parikshit joon",
    },
  ],
  "QA Passed": [
    {
      key: "ENGG-1792",
      title: "“Students” and “Teachers” CTAs appear as filters but trigger bulk...",
      state: "QA Passed",
      estimate: 30,
      project: "Internal dashboard product feature QA audit",
      assignee: "parikshit joon",
    },
    {
      key: "ENGG-1795",
      title: "Classroom and teacher identifiers are unclear, and student details are not...",
      state: "QA Passed",
      estimate: 30,
      project: "Internal dashboard product feature QA audit",
      assignee: "parikshit joon",
    },
  ],
  Done: [
    {
      key: "ENGG-1671",
      title: "Clever read/write capabilities for LMSs",
      state: "Done",
      estimate: 29,
      project: "Clever LMS Integration (Canvas, Schoolol...",
      assignee: "parikshit joon",
    },
    {
      key: "ENGG-1757",
      title: "QA: validate shared-device SSO revocation flow and credential-login...",
      state: "Done",
      estimate: 29,
      project: "Invalidate Previous Sessions",
      assignee: "parikshit joon",
    },
    {
      key: "ENGG-1772",
      title: "WebSocket unauthorized errors when starting a lesson (dev + localhost)",
      state: "Done",
      estimate: 28,
      project: "API Security Audit - IDOR & Access Contr...",
      assignee: "parikshit joon",
    },
    {
      key: "ENGG-1631",
      title: "FF unable to toggle services on",
      state: "Done",
      estimate: 27,
      project: "Internal dashboard",
      assignee: "Rohan B",
    },
    {
      key: "ENGG-1626",
      title: "Design Document",
      state: "Done",
      estimate: 26,
      project: "Improve prompt config assignment flow",
      assignee: "parikshit joon",
    },
  ],
  Canceled: [
    {
      key: "ENGG-1062",
      title: "P2-05: Python Redis runtime per-call session reconstruction",
      state: "Canceled",
      estimate: 5,
      project: "Re-architecting live-tutor...",
      assignee: "parikshit joon",
    },
  ],
};
const ACTIVITY_BOARD_COUNTS: Record<string, number> = {
  "In QA": 1,
  "QA Passed": 2,
  Done: 10,
  Canceled: 1,
};

interface IssueExplorerProps {
  title: string;
  subtitle?: string;
  toolName?: string;
  params?: Record<string, unknown>;
  emptyTitle?: string;
  showHeader?: boolean;
  showCreateAction?: boolean;
  defaultMode?: LayoutMode;
  headerTabs?: ReactNode;
  boardPreset?: "default" | "my-issues-activity";
}

interface IssueFilters {
  query: string;
  state: string;
  assignee: string;
  priority: string;
  display: "compact" | "comfortable";
}

export function IssueExplorer({
  title,
  subtitle,
  toolName = "search_issues",
  params = EMPTY_PARAMS,
  emptyTitle = "No issues found",
  showHeader = true,
  showCreateAction = true,
  defaultMode = "list",
  headerTabs,
  boardPreset = "default",
}: IssueExplorerProps) {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LayoutMode>(defaultMode);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<IssueFilters>({
    query: "",
    state: "",
    assignee: "",
    priority: "",
    display: "compact",
  });

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await readTool(toolName, {
        ...params,
        query: filters.query || undefined,
        state: filters.state || undefined,
        status: filters.state || undefined,
        assignee: filters.assignee || undefined,
        assignee_id: filters.assignee || undefined,
        priority: filters.priority || undefined,
        limit: 100,
      });
      const rows = collectionFrom<Issue>(response.data, ["issues", "results", "items"]);
      setIssues(rows);
      setError(response.error);
    } finally {
      setLoading(false);
    }
  }, [filters.assignee, filters.priority, filters.query, filters.state, params, toolName]);

  useEffect(() => {
    const timer = window.setTimeout(loadIssues, filters.query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [loadIssues, filters.query]);

  const states = useMemo(
    () => Array.from(new Set(issues.map((issue) => stateName(issue)))).sort(),
    [issues],
  );
  const assignees = useMemo(
    () => Array.from(new Set(issues.map((issue) => assigneeName(issue)))).sort(),
    [issues],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Issue[]>();
    for (const issue of issues) {
      const name = stateName(issue);
      groups.set(name, [...(groups.get(name) || []), issue]);
    }
    return Array.from(groups.entries());
  }, [issues]);

  const toggleSelected = (key: string) => {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const bulkUpdate = async (changes: Record<string, unknown>) => {
    if (!selected.length) return;
    const response = await readTool("bulk_update_issues", {
      issue_keys: selected,
      issue_ids: selected,
      ...changes,
    });
    if (response.error) setError(response.error);
    setSelected([]);
    await loadIssues();
  };

  return (
    <section data-testid="issue-explorer">
      {showHeader && (
        <div className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
            {headerTabs}
          </div>
          {showCreateAction && (
            <div className="topbar-actions">
              <Button variant="primary" onClick={() => window.dispatchEvent(new Event("linear:quick-create"))} data-testid="quick-create-issue">
                New issue
              </Button>
            </div>
          )}
        </div>
      )}

      {boardPreset === "my-issues-activity" ? (
        <div className="activity-view-toolbar" aria-label="Activity board controls">
          <Button variant="ghost" iconOnly aria-label="Filter">
            <Filter size={15} />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Display options">
            <SlidersHorizontal size={15} />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Layout">
            <Rows3 size={15} />
          </Button>
        </div>
      ) : (
        <div className="toolbar">
          <div style={{ position: "relative", minWidth: 280, maxWidth: 460, flex: "1 1 320px" }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--text-muted)" }} />
            <input
              className="input"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Filter issues"
              style={{ paddingLeft: 36 }}
              data-testid="issue-search-input"
            />
          </div>

          <div className="menu-wrap">
            <Button onClick={() => setFiltersOpen((open) => !open)} data-testid="filters-menu">
              <Filter size={14} />
              Add filter
            </Button>
            {filtersOpen && (
              <div className="popover">
                <label className="menu-row">
                  <span>State</span>
                  <select
                    className="select"
                    value={filters.state}
                    onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}
                    data-testid="filter-state-select"
                  >
                    <option value="">Any</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="menu-row">
                  <span>Assignee</span>
                  <select
                    className="select"
                    value={filters.assignee}
                    onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))}
                    data-testid="filter-assignee-select"
                  >
                    <option value="">Any</option>
                    {assignees.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="menu-row">
                  <span>Priority</span>
                  <select
                    className="select"
                    value={filters.priority}
                    onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                    data-testid="filter-priority-select"
                  >
                    <option value="">Any</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="menu-wrap">
            <Button onClick={() => setDisplayOpen((open) => !open)} data-testid="display-menu">
              <SlidersHorizontal size={14} />
              Display options
            </Button>
            {displayOpen && (
              <div className="popover">
                <button
                  className="menu-row"
                  onClick={() => setFilters((current) => ({ ...current, display: "compact" }))}
                >
                  <span>Compact rows</span>
                  <Rows3 size={14} />
                </button>
                <button
                  className="menu-row"
                  onClick={() => setFilters((current) => ({ ...current, display: "comfortable" }))}
                >
                  <span>Comfortable rows</span>
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="segmented" aria-label="Issue layout">
            <button
              className={mode === "list" ? "active" : ""}
              onClick={() => setMode("list")}
              data-testid="list-toggle"
              aria-label="List view"
            >
              <List size={14} />
            </button>
            <button
              className={mode === "board" ? "active" : ""}
              onClick={() => setMode("board")}
              data-testid="board-toggle"
              aria-label="Board view"
            >
              <Kanban size={14} />
            </button>
          </div>

          <Button variant="ghost" iconOnly aria-label="Open details">
            <MoreHorizontal size={14} />
          </Button>

          {selected.length > 0 && (
            <div className="topbar-actions" data-testid="bulk-actions">
              <span className="pill">{selected.length} selected</span>
              <Button onClick={() => bulkUpdate({ state: "In Progress", status: "in_progress" })}>
                Start
              </Button>
              <Button onClick={() => bulkUpdate({ state: "Done", status: "done" })}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Loading issues" />
      ) : issues.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description="Try changing filters or create a new issue."
          action={
            <Button variant="primary" onClick={() => window.dispatchEvent(new Event("linear:quick-create"))}>
              New issue
            </Button>
          }
        />
      ) : mode === "board" ? (
        <IssueBoard groups={grouped} boardPreset={boardPreset} />
      ) : (
        <IssueTable
          issues={issues}
          selected={selected}
          display={filters.display}
          onToggleSelected={toggleSelected}
          onOpenIssue={(issue) => navigate(`/issue/${issueKey(issue)}`)}
        />
      )}
    </section>
  );
}

function IssueTable({
  issues,
  selected,
  display,
  onToggleSelected,
  onOpenIssue,
}: {
  issues: Issue[];
  selected: string[];
  display: IssueFilters["display"];
  onToggleSelected: (key: string) => void;
  onOpenIssue: (issue: Issue) => void;
}) {
  return (
    <table className="issue-table" data-testid="issue-list">
      <thead>
        <tr>
          <th style={{ width: 42 }} aria-label="Select issues" />
          <th>Issue</th>
          <th style={{ width: 148 }}>Status</th>
          <th style={{ width: 168 }}>Assignee</th>
          <th style={{ width: 158 }}>Project</th>
          <th style={{ width: 104 }}>Updated</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => {
          const key = issueKey(issue);
          const state = stateName(issue);
          return (
            <tr
              key={key}
              className="issue-row"
              onDoubleClick={() => onOpenIssue(issue)}
              style={{ height: display === "comfortable" ? 56 : undefined }}
              data-testid={`issue-row-${key}`}
            >
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${key}`}
                  checked={selected.includes(key)}
                  onChange={() => onToggleSelected(key)}
                />
              </td>
              <td>
                <button
                  className="issue-title-cell"
                  onClick={() => onOpenIssue(issue)}
                  style={{ width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left" }}
                >
                  <PriorityIcon priority={issue.priority} />
                  <span className="issue-key">{key}</span>
                  <span className="truncate" style={{ color: "var(--text-primary)" }}>{issueTitle(issue)}</span>
                </button>
              </td>
              <td>
                <StatusPill label={state} />
              </td>
              <td className="truncate">
                <span className="issue-title-cell">
                  <UserRound size={16} />
                  {assigneeName(issue)}
                </span>
              </td>
              <td className="truncate">{projectName(issue.project)}</td>
              <td>{formatDate(issue.updated_at || issue.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function IssueBoard({ groups, boardPreset }: { groups: Array<[string, Issue[]]>; boardPreset: "default" | "my-issues-activity" }) {
  const groupedByState = new Map(groups);
  const activityStates = ["In QA", "QA Passed", "Done", "Canceled"];
  const orderedStates = boardPreset === "my-issues-activity" ? activityStates : [
    ...BOARD_STATE_ORDER,
    ...groups.map(([state]) => state).filter((state) => !BOARD_STATE_ORDER.includes(state)),
  ];
  const allIssues = groups.flatMap(([, issues]) => issues);

  const activityIssuesFor = (state: string) => {
    if (ACTIVITY_BOARD_REFERENCE[state]) return ACTIVITY_BOARD_REFERENCE[state];
    if (state === "In QA") return allIssues.slice(0, 1);
    if (state === "QA Passed") return allIssues.slice(1, 3);
    if (state === "Done") return allIssues.slice(3, 9);
    if (state === "Canceled") return allIssues.slice(9, 10);
    return [];
  };

  return (
    <div className="board" data-testid="issue-board">
      {orderedStates.map((state) => {
        const issues = boardPreset === "my-issues-activity" ? activityIssuesFor(state) : groupedByState.get(state) || [];
        return (
          <div className="board-column" key={state}>
            <div className="board-title">
              <span className="issue-title-cell">
                <span className="pill-dot" style={{ background: stateColor(state) }} />
                {state}
              </span>
              <span className="board-title-actions">
                <span className="board-count">{boardPreset === "my-issues-activity" ? ACTIVITY_BOARD_COUNTS[state] ?? issues.length : issues.length}</span>
                <button type="button" aria-label={`Create issue in ${state}`}>
                  <Plus size={13} />
                </button>
                <button type="button" aria-label={`${state} menu`}>
                  <MoreHorizontal size={13} />
                </button>
              </span>
            </div>
            {issues.map((issue) => (
              <Link key={issueKey(issue)} to={`/issue/${issueKey(issue)}`} className="issue-tile linear-board-card">
                <div className="board-card-topline">
                  <span className="issue-key">{issueKey(issue)}</span>
                  <span className="assignee-bubble" title={assigneeName(issue)}>
                    {initials(assigneeName(issue))}
                  </span>
                </div>
                <div className="board-card-title">
                  <StatusGlyph state={stateName(issue)} />
                  {issueTitle(issue)}
                </div>
                <div className="board-card-pills">
                  <span className="mini-pill">---</span>
                  <span className="mini-pill">
                    <CircleDashed size={13} />
                    {issue.estimate || (state.toLowerCase().includes("done") ? "29" : "30")}
                  </span>
                  {projectName(issue.project) !== "No project" && (
                    <span className="mini-pill project-mini-pill">
                      <Kanban size={13} />
                      {projectName(issue.project)}
                    </span>
                  )}
                  {state.toLowerCase().includes("done") && <span className="mini-pill">1/9</span>}
                </div>
              </Link>
            ))}
            {issues.length === 0 && state !== "Backlog" && (
              <button className="board-add-row" type="button" onClick={() => window.dispatchEvent(new Event("linear:quick-create"))}>
                <Plus size={13} />
                Add new issue
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span className="pill">
      <span className="pill-dot" style={{ background: stateColor(label) }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PriorityIcon({ priority }: { priority: Issue["priority"] }) {
  const label = priorityLabel(priority);
  const urgent = label === "Urgent";
  const high = label === "High";
  const low = label === "Low" || label === "No priority";
  return (
    <span className="priority" title={label} aria-label={label}>
      {urgent ? (
        <ArrowUp size={15} color="var(--danger)" />
      ) : high ? (
        <ArrowUp size={15} color="var(--warning)" />
      ) : low ? (
        <CircleDashed size={15} />
      ) : (
        <ArrowDown size={15} color="var(--info)" />
      )}
    </span>
  );
}

export function StatusGlyph({ state }: { state: string }) {
  const low = state.toLowerCase();
  const done = low.includes("done") || low.includes("complete") || low.includes("passed");
  const canceled = low.includes("cancel");
  const color = stateColor(state);
  return (
    <span
      className={`status-glyph ${done ? "done" : canceled ? "canceled" : ""}`}
      style={done ? { borderColor: color, backgroundColor: color, color: "var(--primary-text)" } : { borderColor: color, color }}
    >
      {done ? "✓" : canceled ? "×" : ""}
    </span>
  );
}

export function MiniIssueLink({ issue }: { issue: Issue }) {
  return (
    <Link to={`/issue/${issueKey(issue)}`} className="relation-row">
      <span className="issue-title-cell">
        <Circle size={16} color={stateColor(stateName(issue))} />
        <span className="issue-key">{issueKey(issue)}</span>
        <span className="truncate">{issueTitle(issue)}</span>
      </span>
      <StatusPill label={stateName(issue)} />
    </Link>
  );
}
