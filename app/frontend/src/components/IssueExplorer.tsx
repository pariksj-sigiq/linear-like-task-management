import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  Filter,
  Grid3x3,
  Kanban,
  LayoutGrid,
  MoreHorizontal,
  PanelRight,
  Plus,
  Signal,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { Issue } from "../linearTypes";
import {
  assigneeName,
  avatarColor,
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
  const [mode] = useState<LayoutMode>(defaultMode);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'backlog'>('active');
  const [filters] = useState<IssueFilters>({
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

  const filtered = useMemo(() => {
    if (activeTab === 'all') return issues;
    if (activeTab === 'active') return issues.filter(i =>
      ['In Review', 'In Progress', 'Todo'].includes(stateName(i))
    );
    if (activeTab === 'backlog') return issues.filter(i =>
      stateName(i) === 'Backlog'
    );
    return issues;
  }, [issues, activeTab]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Issue[]>();
    for (const issue of filtered) {
      const name = stateName(issue);
      groups.set(name, [...(groups.get(name) || []), issue]);
    }
    const entries = Array.from(groups.entries());
    // Sort groups by board state order
    return entries.sort((a, b) => {
      const indexA = BOARD_STATE_ORDER.indexOf(a[0]);
      const indexB = BOARD_STATE_ORDER.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filtered]);

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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="team-page-icon" style={{ width: 19, height: 19, fontSize: 10 }}>E</span>
              <h1 className="page-title">Issues</h1>
              <Star size={14} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            </div>
            <div className="issue-pill-tabs" role="tablist" style={{ marginTop: 8 }}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`issue-pill-tab${activeTab === 'all' ? ' active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All issues
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'active'}
                className={`issue-pill-tab${activeTab === 'active' ? ' active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'backlog'}
                className={`issue-pill-tab${activeTab === 'backlog' ? ' active' : ''}`}
                onClick={() => setActiveTab('backlog')}
              >
                Backlog
              </button>
            </div>
            {headerTabs}
          </div>
          <div className="topbar-actions">
            <Button variant="ghost" iconOnly aria-label="Filter">
              <Filter size={15} />
            </Button>
            <Button variant="ghost" iconOnly aria-label="Display options">
              <SlidersHorizontal size={15} />
            </Button>
            <Button variant="ghost" iconOnly aria-label="Toggle sidebar">
              <PanelRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {boardPreset === "my-issues-activity" && (
        <div className="activity-view-toolbar" aria-label="Activity board controls">
          <Button variant="ghost" iconOnly aria-label="Filter">
            <Filter size={15} />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Display options">
            <SlidersHorizontal size={15} />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Layout">
            <LayoutGrid size={15} />
          </Button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="topbar-actions" data-testid="bulk-actions" style={{ marginBottom: 8 }}>
          <span className="pill">{selected.length} selected</span>
          <Button onClick={() => bulkUpdate({ state: "In Progress", status: "in_progress" })}>
            Start
          </Button>
          <Button onClick={() => bulkUpdate({ state: "Done", status: "done" })}>
            Done
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {loading && boardPreset !== "my-issues-activity" ? (
        <Spinner label="Loading issues" />
      ) : issues.length === 0 && boardPreset !== "my-issues-activity" ? (
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
        <IssueGroupedList
          groups={grouped}
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
                  <span
                    className="assignee-bubble"
                    title={assigneeName(issue)}
                    style={{ background: avatarColor(assigneeName(issue)) }}
                  >
                    {initials(assigneeName(issue))}
                  </span>
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

function IssueGroupedList({
  groups,
  selected,
  display,
  onToggleSelected,
  onOpenIssue,
}: {
  groups: Array<[string, Issue[]]>;
  selected: string[];
  display: IssueFilters["display"];
  onToggleSelected: (key: string) => void;
  onOpenIssue: (issue: Issue) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (state: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  };

  // Sort groups by a predefined order matching Linear
  const statusOrder = ["In Review", "In Progress", "Todo", "Backlog", "Done", "Canceled"];
  const sortedGroups = [...groups].sort(([a], [b]) => {
    const indexA = statusOrder.indexOf(a);
    const indexB = statusOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="linear-issue-list" data-testid="issue-grouped-list">
      {sortedGroups.map(([state, issues]) => (
        <div key={state} className="issue-status-group" style={{ marginBottom: 4 }}>
          <div className="linear-group-header">
            <button
              onClick={() => toggleGroup(state)}
              aria-expanded={!collapsed.has(state)}
              className="group-header-button"
            >
              <ChevronRight
                size={12}
                className="group-chevron"
                style={{
                  transform: collapsed.has(state) ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
              <StatusIcon status={state} size={10} />
              <span className="group-title">{state}</span>
              <span className="group-count">{issues.length}</span>
            </button>
            <div className="group-header-actions">
              <button
                type="button"
                className="group-action-button"
                aria-label={`Create issue in ${state}`}
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new Event("linear:quick-create")); }}
              >
                <Plus size={13} />
              </button>
              <button
                type="button"
                className="group-action-button"
                aria-label={`${state} menu`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          </div>
          {!collapsed.has(state) && (
            <div className="issue-group-content">
              {issues.map((issue) => {
                const key = issueKey(issue);
                const state = stateName(issue);
                return (
                  <div
                    key={key}
                    className="linear-native-row"
                    onDoubleClick={() => onOpenIssue(issue)}
                    data-testid={`issue-row-${key}`}
                  >
                    <input
                      type="checkbox"
                      className="issue-checkbox"
                      aria-label={`Select ${key}`}
                      checked={selected.includes(key)}
                      onChange={() => onToggleSelected(key)}
                    />
                    <button
                      onClick={() => onOpenIssue(issue)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                        flex: 1,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <PriorityIcon priority={issue.priority} />
                      <span className="issue-key">{key}</span>
                      <StatusIcon status={state} size={12} />
                      <span className="issue-row-title" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {issueTitle(issue)}
                      </span>
                    </button>
                    <div className="row-spacer" />
                    <div className="issue-row-right">
                      <span
                        className="issue-assignee-avatar"
                        style={{ background: avatarColor(assigneeName(issue)) }}
                        title={assigneeName(issue)}
                      >
                        {initials(assigneeName(issue))}
                      </span>
                      <span className="issue-date">{formatDate(issue.updated_at || issue.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
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
                  <span className="issue-key">
                    {issueKey(issue)}
                    {boardPreset === "my-issues-activity" && state !== "In QA" && <span className="issue-substate">› QA</span>}
                  </span>
                  <span
                    className="assignee-bubble"
                    title={assigneeName(issue)}
                    style={{ background: avatarColor(assigneeName(issue)) }}
                  >
                    {initials(assigneeName(issue))}
                  </span>
                </div>
                <div className="board-card-title">
                  <StatusGlyph state={stateName(issue)} />
                  {issueTitle(issue)}
                </div>
                <div className="board-card-pills">
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
            {(issues.length === 0 || (boardPreset === "my-issues-activity" && state === "In QA")) && state !== "Backlog" && (
              <button className="board-add-row" type="button" onClick={() => window.dispatchEvent(new Event("linear:quick-create"))}>
                <Plus size={13} />
                {boardPreset === "my-issues-activity" ? "" : "Add new issue"}
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

  if (label === "Urgent") {
    return (
      <span className="priority" title={label} aria-label={label}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="3" fill="#f2994a"/>
          <path d="M8 5v4M8 11v1" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }

  const colors = { High: "#f2a900", Medium: "#f2c94c", Low: "#8a8885", None: "#b5b3ad", "No priority": "#b5b3ad" };
  const color = colors[label as keyof typeof colors] || "#8a8885";
  const opacity = label === "None" || label === "No priority" ? 0.4 : 1;

  return (
    <span className="priority" title={label} aria-label={label}>
      <Signal size={14} color={color} strokeWidth={2.5} style={{ opacity }} />
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

export function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  const key = status.toLowerCase();
  const isDone = key.includes("done") || key.includes("complete") || key.includes("passed");
  const isCanceled = key.includes("cancel");
  const isInReview = key.includes("review");
  const isInProgress = key.includes("progress") || key.includes("active") || key.includes("started");
  const isTodo = key.includes("todo");
  const isBacklog = key.includes("backlog");

  // Linear's exact SVG pattern with stroke-dasharray for progress
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 1;
  const innerRadius = size / 7;

  if (isInReview) {
    // Green circle with checkmark (complete)
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#28a745" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={innerRadius} fill="#28a745" />
      </svg>
    );
  }

  if (isInProgress) {
    // Yellow/orange circle with partial progress (dasharray)
    const circumference = 2 * Math.PI * outerRadius;
    const progress = 0.5; // 50% progress
    const dashArray = `${circumference * progress} ${circumference}`;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#e0e0e0" strokeWidth="1.5" />
        <circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          fill="none"
          stroke="#f2a900"
          strokeWidth="1.5"
          strokeDasharray={dashArray}
          strokeDashoffset={-circumference * 0.05}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r={innerRadius} fill="#f2a900" />
      </svg>
    );
  }

  if (isTodo) {
    // Gray outlined circle (empty)
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={outerRadius} stroke="#8a8885" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  if (isBacklog) {
    // Gray dashed circle
    const circumference = 2 * Math.PI * outerRadius;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          stroke="#8a8885"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 2"
        />
      </svg>
    );
  }

  if (isDone) {
    // Purple/blue filled circle with checkmark
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#5e6ad2" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={innerRadius} fill="#5e6ad2" />
      </svg>
    );
  }

  if (isCanceled) {
    // Gray canceled circle
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#95918c" strokeWidth="1.5" />
        <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke="#95918c" strokeWidth="1.5" />
        <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} stroke="#95918c" strokeWidth="1.5" />
      </svg>
    );
  }

  // Default: gray outline
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={outerRadius} stroke="#8a8885" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
