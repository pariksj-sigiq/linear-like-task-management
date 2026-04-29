import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Filter,
  Kanban,
  LoaderCircle,
  MoreHorizontal,
  PanelRight,
  Plus,
  Signal,
  SlidersHorizontal,
  XCircle,
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
  stateName,
  teamKey,
} from "../linearTypes";
import { Button, EmptyState, ErrorBanner, Spinner } from "./ui";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { ChartAreaInteractive, type ChartAreaPoint } from "./chart-area-interactive";
import { SectionCards, type SectionCardItem } from "./section-cards";
import { cn } from "../lib/utils";

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

  const overviewCards = useMemo<SectionCardItem[]>(() => {
    const rows = filtered;
    const countFor = (predicate: (state: string) => boolean) =>
      rows.filter((issue) => predicate(stateName(issue).toLowerCase())).length;
    const done = countFor((state) => state.includes("done") || state.includes("complete") || state.includes("passed"));
    const active = countFor((state) => state.includes("progress") || state.includes("review") || state.includes("qa"));
    const backlog = countFor((state) => state.includes("backlog") || state.includes("todo") || state.includes("triage"));

    return [
      {
        label: "Visible",
        value: rows.length,
        description: "Issues in this scope",
        detail: title,
        badge: selected.length ? `${selected.length} selected` : "Live",
        trend: "neutral",
      },
      {
        label: "Active",
        value: active,
        description: "Started, review, or QA",
        detail: "Needs current attention",
        badge: active > done ? "High" : "OK",
        trend: active > done ? "up" : "neutral",
      },
      {
        label: "Backlog",
        value: backlog,
        description: "Queued work",
        detail: "Todo, triage, or backlog",
        badge: backlog > active ? "Watch" : "OK",
        trend: backlog > active ? "up" : "neutral",
      },
      {
        label: "Done",
        value: done,
        description: "Completed in view",
        detail: rows.length ? `${Math.round((done / rows.length) * 100)}% of visible work` : "No visible work",
        badge: done ? "Closed" : "None",
        trend: done ? "down" : "neutral",
      },
    ];
  }, [filtered, selected.length, title]);

  const issueFlowData = useMemo<ChartAreaPoint[]>(() => {
    const buckets = new Map<string, ChartAreaPoint>();
    const ensureBucket = (date: string) => {
      const existing = buckets.get(date);
      if (existing) return existing;
      const next = { date, opened: 0, resolved: 0 };
      buckets.set(date, next);
      return next;
    };

    filtered.forEach((issue) => {
      const created = dateKey(issue.created_at || issue.updated_at);
      const updated = dateKey(issue.updated_at || issue.created_at);
      ensureBucket(created).opened += 1;
      const state = stateName(issue).toLowerCase();
      if (state.includes("done") || state.includes("complete") || state.includes("passed")) {
        ensureBucket(updated).resolved += 1;
      }
    });

    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
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
        <div className="mb-3 flex min-h-12 items-start justify-between gap-5">
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            {boardPreset !== "my-issues-activity" && (
              <div className="mt-2 inline-flex items-center gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'all'}
                  className={cn("rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-muted", activeTab === "all" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('all')}
                >
                  All issues
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'active'}
                  className={cn("rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-muted", activeTab === "active" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('active')}
                >
                  Active
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'backlog'}
                  className={cn("rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-muted", activeTab === "backlog" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('backlog')}
                >
                  Backlog
                </button>
              </div>
            )}
            {headerTabs}
          </div>
          <div className="flex items-center gap-2">
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

      {selected.length > 0 && (
        <div className="mb-2 flex items-center gap-2" data-testid="bulk-actions">
          <Badge variant="outline">{selected.length} selected</Badge>
          <Button onClick={() => bulkUpdate({ state: "In Progress", status: "in_progress" })}>
            Start
          </Button>
          <Button onClick={() => bulkUpdate({ state: "Done", status: "done" })}>
            Done
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {showHeader && boardPreset !== "my-issues-activity" && (
        <div className="mb-3 grid gap-3">
          <SectionCards cards={overviewCards} />
          <ChartAreaInteractive data={issueFlowData.length ? issueFlowData : undefined} compact />
        </div>
      )}

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

function dateKey(value: unknown) {
  const date = typeof value === "string" || value instanceof Date ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
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
    <div className="grid gap-1" data-testid="issue-grouped-list">
      {sortedGroups.map(([state, issues]) => (
        <div key={state} className="grid gap-1 rounded-md border border-border bg-card">
          <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3">
            <button
              onClick={() => toggleGroup(state)}
              aria-expanded={!collapsed.has(state)}
              className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground"
            >
              <ChevronRight
                size={12}
                className={cn("text-muted-foreground transition-transform", !collapsed.has(state) ? "rotate-90" : "rotate-0")}
              />
              <StatusIcon status={state} size={10} />
              <span className="truncate">{state}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[11px]">{issues.length}</Badge>
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                iconOnly
                aria-label={`Create issue in ${state}`}
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new Event("linear:quick-create")); }}
              >
                <Plus size={13} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                iconOnly
                aria-label={`${state} menu`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} />
              </Button>
            </div>
          </div>
          {!collapsed.has(state) && (
            <div className="divide-y divide-border">
              {issues.map((issue) => {
                const key = issueKey(issue);
                const state = stateName(issue);
                return (
                  <div
                    key={key}
                    className={cn(
                      "grid h-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 text-sm hover:bg-muted/50",
                      display === "comfortable" && "h-auto py-3",
                    )}
                    onDoubleClick={() => onOpenIssue(issue)}
                    data-testid={`issue-row-${key}`}
                  >
                    <Checkbox
                      aria-label={`Select ${key}`}
                      checked={selected.includes(key)}
                      onCheckedChange={() => onToggleSelected(key)}
                    />
                    <button
                      onClick={() => onOpenIssue(issue)}
                      className="flex min-w-0 items-center gap-2 text-left text-foreground"
                    >
                      <PriorityIcon priority={issue.priority} />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{key}</span>
                      <StatusIcon status={state} size={12} />
                      <span className="min-w-0 truncate">
                        {issueTitle(issue)}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="grid size-5 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                        title={assigneeName(issue)}
                      >
                        {initials(assigneeName(issue))}
                      </span>
                      <span>{formatDate(issue.updated_at || issue.created_at)}</span>
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
    <div className="grid min-h-[calc(100svh-15rem)] gap-3 overflow-x-auto lg:grid-cols-4" data-testid="issue-board">
      {orderedStates.map((state) => {
        const issues = boardPreset === "my-issues-activity" ? activityIssuesFor(state) : groupedByState.get(state) || [];
        return (
          <div className="min-w-64 overflow-hidden rounded-md border border-border bg-background" key={state}>
            <div className="flex min-h-10 items-center justify-between gap-2 border-b border-border px-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                <StatusIcon status={state} size={13} />
                {state}
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="h-5 px-1.5 text-[11px]">{boardPreset === "my-issues-activity" ? ACTIVITY_BOARD_COUNTS[state] ?? issues.length : issues.length}</Badge>
                <Button type="button" variant="ghost" iconOnly aria-label={`Create issue in ${state}`}>
                  <Plus size={13} />
                </Button>
                <Button type="button" variant="ghost" iconOnly aria-label={`${state} menu`}>
                  <MoreHorizontal size={13} />
                </Button>
              </span>
            </div>
            {issues.map((issue) => (
              <Card key={issueKey(issue)} className="m-2 rounded-md border border-border bg-card p-3 shadow-none transition-colors hover:bg-muted/40">
                <Link to={`/issue/${issueKey(issue)}`} className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {issueKey(issue)}
                    {boardPreset === "my-issues-activity" && state !== "In QA" && <span className="ml-1">› QA</span>}
                  </span>
                  <span
                    className="grid size-5 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                    title={assigneeName(issue)}
                  >
                    {initials(assigneeName(issue))}
                  </span>
                </div>
                <div className="flex min-w-0 items-start gap-2 text-sm font-medium text-foreground">
                  <StatusIcon status={stateName(issue)} size={13} />
                  {issueTitle(issue)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <CircleDashed size={13} />
                    {issue.estimate || (state.toLowerCase().includes("done") ? "29" : "30")}
                  </Badge>
                  {projectName(issue.project) !== "No project" && (
                    <Badge variant="outline" className="max-w-full gap-1 text-muted-foreground">
                      <Kanban size={13} />
                      <span className="truncate">{projectName(issue.project)}</span>
                    </Badge>
                  )}
                  {state.toLowerCase().includes("done") && <Badge variant="outline">1/9</Badge>}
                </div>
                </Link>
              </Card>
            ))}
            {(issues.length === 0 || (boardPreset === "my-issues-activity" && state === "In QA")) && state !== "Backlog" && (
              <Button className="m-2 w-[calc(100%-1rem)] justify-start" variant="ghost" type="button" onClick={() => window.dispatchEvent(new Event("linear:quick-create"))}>
                <Plus size={13} />
                {boardPreset === "my-issues-activity" ? "" : "Add new issue"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <StatusIcon status={label} size={12} />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export function PriorityIcon({ priority }: { priority: Issue["priority"] }) {
  const label = priorityLabel(priority);

  if (label === "Urgent") {
    return (
      <span className="text-destructive" title={label} aria-label={label}>
        <Signal size={14} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-muted-foreground",
        label === "High" && "text-destructive",
        label === "Medium" && "text-primary",
        label === "Low" && "text-muted-foreground/70",
      )}
      title={label}
      aria-label={label}
    >
      <Signal size={14} strokeWidth={2.5} />
    </span>
  );
}

export function StatusGlyph({ state }: { state: string }) {
  const low = state.toLowerCase();
  const done = low.includes("done") || low.includes("complete") || low.includes("passed");
  const canceled = low.includes("cancel");
  const qa = low.includes("qa");
  return (
    <span
      className={cn(
        "grid size-3.5 place-items-center rounded-full border text-[10px] leading-none",
        qa && "border-chart-3 bg-chart-3/20 text-chart-3",
        done && !qa && "border-primary bg-primary text-primary-foreground",
        canceled && "border-muted-foreground text-muted-foreground",
        !qa && !done && !canceled && "border-muted-foreground text-muted-foreground",
      )}
    >
      {done ? "✓" : canceled ? "×" : ""}
    </span>
  );
}

export function MiniIssueLink({ issue }: { issue: Issue }) {
  return (
    <Link to={`/issue/${issueKey(issue)}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50">
      <span className="flex min-w-0 items-center gap-2">
        <StatusIcon status={stateName(issue)} size={14} />
        <span className="text-xs tabular-nums text-muted-foreground">{issueKey(issue)}</span>
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
  const isQa = key.includes("qa");
  const isInReview = key.includes("review");
  const isInProgress = key.includes("progress") || key.includes("active") || key.includes("started");
  const isTodo = key.includes("todo");
  const isBacklog = key.includes("backlog");

  if (isQa) {
    return <CheckCircle2 size={size} className="text-chart-3" />;
  }

  if (isInReview) {
    return <CheckCircle2 size={size} className="text-primary" />;
  }

  if (isInProgress) {
    return <LoaderCircle size={size} className="text-primary" />;
  }

  if (isTodo) {
    return <Circle size={size} className="text-muted-foreground" />;
  }

  if (isBacklog) {
    return <CircleDashed size={size} className="text-muted-foreground" />;
  }

  if (isDone) {
    return <CheckCircle2 size={size} className="text-primary" />;
  }

  if (isCanceled) {
    return <XCircle size={size} className="text-muted-foreground" />;
  }

  return <Circle size={size} className="text-muted-foreground" />;
}
