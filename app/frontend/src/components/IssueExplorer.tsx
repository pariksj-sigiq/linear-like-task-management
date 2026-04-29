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
            Filters
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
            Display
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
        <IssueBoard groups={grouped} />
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

function IssueBoard({ groups }: { groups: Array<[string, Issue[]]> }) {
  return (
    <div className="board" data-testid="issue-board">
      {groups.map(([state, issues]) => (
        <div className="board-column" key={state}>
          <div className="board-title">
            <span className="issue-title-cell">
              <span className="pill-dot" style={{ background: stateColor(state) }} />
              {state}
            </span>
            <span>{issues.length}</span>
          </div>
          {issues.map((issue) => (
            <Link key={issueKey(issue)} to={`/issue/${issueKey(issue)}`} className="issue-tile">
              <div className="issue-title-cell" style={{ marginBottom: 8 }}>
                <PriorityIcon priority={issue.priority} />
                <span className="issue-key">{issueKey(issue)}</span>
              </div>
              <div style={{ color: "var(--text-primary)", fontWeight: 550, marginBottom: 10 }}>
                {issueTitle(issue)}
              </div>
              <div className="issue-title-cell" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                <span>{teamKey(issue)}</span>
                <span>·</span>
                <span className="truncate">{assigneeName(issue)}</span>
              </div>
            </Link>
          ))}
        </div>
      ))}
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
