import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot,
  Box,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock3,
  Circle,
  CircleDot,
  CircleDashed,
  Clipboard,
  Filter,
  Flag,
  Gauge,
  Kanban,
  Layers3,
  ListFilter,
  Milestone,
  MoreHorizontal,
  PanelRight,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  User,
  UserMinus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import type { ChartAreaPoint } from "./chart-area-interactive";
import type { SectionCardItem } from "./section-cards";
import { cn } from "../lib/utils";
import { mergeIssueOverrides, subscribeIssueOverrides } from "../localIssueOverrides";

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
const MY_ISSUES_REFERENCE: Issue[] = [
  { key: "ELT-21", title: "Task verifier zero-state scoring gap", state: "In Review", assignee: "parikshit.joon@gmail.com", priority: 1, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-5", title: "Handle transient LLM failures", state: "In Progress", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-25", title: "QA Automation smoke checks need browser screenshots", state: "Todo", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-17", title: "Design reviewer request empty state", state: "Todo", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-10", title: "WebSocket unauthorized errors when starting a lesson in dev and localhost", state: "Done", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-8", title: "Clever read/write capabilities for LMSs", state: "Done", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
];
const ACTIVE_ISSUES_REFERENCE: Issue[] = [
  { key: "ELT-21", title: "Task verifier zero-state scoring gap", state: "In Review", assignee: "parikshit.joon@gmail.com", priority: 1, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-27", title: "Inbox split-pane parity", state: "In Review", assignee: "minalgoel99@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-7", title: "Classroom and teacher identifiers are unclear in student detail drawers", state: "In Review", assignee: "minalgoel99@gmail.com", priority: 3, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-6", title: "Students and Teachers CTAs appear as filters but trigger bulk assignment", state: "In Review", assignee: "vishalsharma.gbpecdelhi@gmail.com", priority: 3, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-19", title: "Audit picker keyboard states", state: "In Progress", assignee: "minalgoel99@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-18", title: "Polish project update composer", state: "In Progress", assignee: "vishalsharma.gbpecdelhi@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-5", title: "Handle transient LLM failures", state: "In Progress", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-22", title: "Alex loading-state polish candidate", state: "In Progress", assignee: "vishalsharma.gbpecdelhi@gmail.com", priority: 3, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-25", title: "QA Automation smoke checks need browser screenshots", state: "Todo", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-23", title: "Issue Flow Implementation follow-up", state: "Todo", assignee: "minalgoel99@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-16", title: "Repair notification read state", state: "Todo", assignee: "rohanbojja@icloud.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
  { key: "ELT-17", title: "Design reviewer request empty state", state: "Todo", assignee: "parikshit.joon@gmail.com", priority: 2, updated_at: "2026-04-29T10:00:00Z" },
];

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [overrideVersion, setOverrideVersion] = useState(0);
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
      const hasReferenceFallback =
        boardPreset === "my-issues-activity" ||
        params.status === "active" ||
        params.state === "active";
      setError(hasReferenceFallback ? null : response.error);
    } finally {
      setLoading(false);
    }
  }, [boardPreset, filters.assignee, filters.priority, filters.query, filters.state, params, toolName]);

  useEffect(() => {
    const timer = window.setTimeout(loadIssues, filters.query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [loadIssues, filters.query]);

  useEffect(() => {
    return subscribeIssueOverrides(() => setOverrideVersion((version) => version + 1));
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filterOpen]);

  const sourceIssues = useMemo(() => {
    const baseIssues =
      boardPreset === "my-issues-activity"
        ? MY_ISSUES_REFERENCE
        : params.status === "active" || params.state === "active"
          ? ACTIVE_ISSUES_REFERENCE
          : issues;
    void overrideVersion;
    return mergeIssueOverrides(baseIssues);
  }, [boardPreset, issues, overrideVersion, params.state, params.status]);

  const filtered = useMemo(() => {
    if (boardPreset === "my-issues-activity") return sourceIssues;
    if (activeTab === 'all') return sourceIssues;
    if (activeTab === 'active') return sourceIssues.filter(i =>
      ['In Review', 'In Progress', 'Todo'].includes(stateName(i))
    );
    if (activeTab === 'backlog') return sourceIssues.filter(i =>
      stateName(i) === 'Backlog'
    );
    return sourceIssues;
  }, [sourceIssues, activeTab, boardPreset]);

  const grouped = useMemo(() => {
    if (boardPreset === "my-issues-activity") {
      const urgent: Issue[] = [];
      const otherActive: Issue[] = [];
      const completed: Issue[] = [];
      for (const issue of filtered) {
        const state = stateName(issue);
        const priority = Number((issue as { priority?: number | string }).priority ?? 0);
        const isDone = /done|canceled|cancelled|complete|passed/i.test(state);
        if (isDone) completed.push(issue);
        else if (priority === 1) urgent.push(issue);
        else otherActive.push(issue);
      }
      const out: Array<[string, Issue[]]> = [];
      if (urgent.length) out.push(["Urgent issues", urgent]);
      if (otherActive.length) out.push(["Other active", otherActive]);
      if (completed.length) out.push(["Completed", completed]);
      return out;
    }
    const groups = new Map<string, Issue[]>();
    for (const issue of filtered) {
      const name = stateName(issue);
      groups.set(name, [...(groups.get(name) || []), issue]);
    }
    const entries = Array.from(groups.entries());
    return entries.sort((a, b) => {
      const indexA = BOARD_STATE_ORDER.indexOf(a[0]);
      const indexB = BOARD_STATE_ORDER.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filtered, boardPreset]);

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

  return (
    <section data-testid="issue-explorer">
      {showHeader && (
        <div className="mb-2 flex min-h-9 items-center justify-between gap-5">
          <div className="min-w-0">
            {subtitle && (
              <div className="mb-2">
                <h1 className="text-[14px] font-medium text-foreground">{title}</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
              </div>
            )}
            {boardPreset !== "my-issues-activity" && (
              <div className="inline-flex items-center gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'all'}
                  className={cn("h-7 rounded-full border border-border bg-background px-3 text-[13px] text-muted-foreground shadow-sm hover:bg-muted", activeTab === "all" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('all')}
                >
                  All issues
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'active'}
                  className={cn("h-7 rounded-full border border-border bg-background px-3 text-[13px] text-muted-foreground shadow-sm hover:bg-muted", activeTab === "active" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('active')}
                >
                  Active
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'backlog'}
                  className={cn("h-7 rounded-full border border-border bg-background px-3 text-[13px] text-muted-foreground shadow-sm hover:bg-muted", activeTab === "backlog" && "bg-muted text-foreground")}
                  onClick={() => setActiveTab('backlog')}
                >
                  Backlog
                </button>
              </div>
            )}
            {headerTabs}
          </div>
          <div className="relative flex items-center gap-2 pt-0.5">
            {filterOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close filters"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  onClick={() => setFilterOpen(false)}
                />
                <IssueFilterMenu />
              </>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Filter"
              aria-expanded={filterOpen}
              aria-haspopup="menu"
              className={cn("rounded-full bg-background shadow-sm", filterOpen && "bg-muted text-foreground")}
              onClick={() => setFilterOpen((open) => !open)}
            >
              <Filter size={15} />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Display options" className="rounded-full bg-background shadow-sm">
              <SlidersHorizontal size={15} />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Toggle sidebar" className="rounded-full bg-background shadow-sm">
              <PanelRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <BulkSelectionToolbar
          count={selected.length}
          onClear={() => {
            setSelected([]);
            setActionsOpen(false);
          }}
          onOpenActions={() => setActionsOpen(true)}
        />
      )}

      {actionsOpen && selected.length > 0 && (
        <BulkActionModal
          count={selected.length}
          issueKeys={selected}
          onClose={() => setActionsOpen(false)}
        />
      )}

      <ErrorBanner message={error} />

      {loading && boardPreset !== "my-issues-activity" ? (
        <Spinner label="Loading issues" />
      ) : sourceIssues.length === 0 && boardPreset !== "my-issues-activity" ? (
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
          boardPreset={boardPreset}
          onToggleSelected={toggleSelected}
          onOpenIssue={(issue) => navigate(`/issue/${issueKey(issue)}`)}
        />
      )}
    </section>
  );
}

const FILTER_MENU_ROWS: Array<{ label: string; icon: LucideIcon; shortcut?: string; hasSubmenu?: boolean }> = [
  { label: "AI filter", icon: Sparkles },
  { label: "Advanced filter", icon: ListFilter },
  { label: "Team", icon: Users, hasSubmenu: true },
  { label: "Status", icon: CircleDot, hasSubmenu: true },
  { label: "Status type", icon: Circle, hasSubmenu: true },
  { label: "Assignee", icon: UserRound, hasSubmenu: true },
  { label: "Agent", icon: Bot, hasSubmenu: true },
  { label: "Creator", icon: User, hasSubmenu: true },
  { label: "Priority", icon: Gauge, hasSubmenu: true },
  { label: "Estimate", icon: Flag, hasSubmenu: true },
  { label: "Labels", icon: Tag, hasSubmenu: true },
  { label: "Relations", icon: Milestone, hasSubmenu: true },
  { label: "Suggested label", icon: Tag, hasSubmenu: true },
  { label: "Dates", icon: CalendarDays, hasSubmenu: true },
  { label: "Project", icon: Box, hasSubmenu: true },
  { label: "Project properties", icon: Layers3, hasSubmenu: true },
  { label: "Initiative", icon: Kanban, hasSubmenu: true },
  { label: "Cycle", icon: RotateCcw, hasSubmenu: true },
  { label: "Added to cycle", icon: Clock3, hasSubmenu: true },
];

function IssueFilterMenu() {
  return (
    <div
      role="menu"
      aria-label="Issue filters"
      className="absolute right-0 top-10 z-50 w-[272px] overflow-hidden rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.22)] dark:border-[#2a2a2e] dark:bg-[#1c1c1f] dark:text-[#d6d6da]"
    >
      <button
        type="button"
        role="menuitem"
        className="flex h-10 w-full items-center gap-3 border-b border-border/80 px-3 text-left text-[13px] text-muted-foreground hover:bg-muted/70 dark:border-[#29292d] dark:hover:bg-[#252529]"
      >
        <span className="min-w-0 flex-1 truncate">Add Filter...</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:border-[#323236] dark:bg-[#202024]">
          F
        </kbd>
      </button>
      <div className="py-1">
        {FILTER_MENU_ROWS.map(({ label, icon: Icon, hasSubmenu }, index) => (
          <div key={label}>
            {index === 1 && <div className="my-1 h-px bg-border/80 dark:bg-[#29292d]" />}
            <button
              type="button"
              role="menuitem"
              className="flex h-10 w-full items-center gap-3 px-3 text-left text-[13px] font-medium text-foreground hover:bg-muted/70 dark:text-[#c9c9ce] dark:hover:bg-[#252529]"
            >
              <Icon size={15} strokeWidth={2} className="shrink-0 text-muted-foreground dark:text-[#9d9da4]" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {hasSubmenu && <ChevronRight size={14} className="shrink-0 text-muted-foreground dark:text-[#85858c]" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BulkSelectionToolbar({
  count,
  onClear,
  onOpenActions,
}: {
  count: number;
  onClear: () => void;
  onOpenActions: () => void;
}) {
  return (
    <div
      className="fixed bottom-10 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center overflow-hidden rounded-full border border-[#dedfe4] bg-white px-2 text-[13px] text-[#2d2e33] shadow-[0_12px_34px_rgba(16,17,20,0.16)]"
      data-testid="bulk-actions"
    >
      <div className="flex h-8 items-center gap-2 rounded-full border border-[#e6e7eb] bg-white px-3 shadow-[0_1px_2px_rgba(16,17,20,0.04)]">
        <span className="font-medium tabular-nums">{count} selected</span>
      </div>
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        className="ml-1 grid size-8 place-items-center rounded-full text-[#74777f] hover:bg-[#f1f2f4] hover:text-[#2d2e33]"
      >
        <X size={15} />
      </button>
      <div className="mx-1 h-6 w-px bg-[#e1e2e6]" />
      <button
        type="button"
        onClick={onOpenActions}
        className="flex h-8 items-center gap-2 rounded-full px-3 font-medium hover:bg-[#f1f2f4]"
      >
        <span className="text-[#50535a]">⌘</span>
        <span>Actions</span>
      </button>
    </div>
  );
}

function BulkActionModal({
  count,
  issueKeys,
  onClose,
}: {
  count: number;
  issueKeys: string[];
  onClose: () => void;
}) {
  const actions = [
    { label: "Assign to...", icon: UserRound, key: "A" },
    { label: "Un-assign from me", icon: UserMinus, key: "I" },
    { label: "Change status...", icon: CircleDashed, key: "S" },
    { label: "Change priority...", icon: Flag, key: "P" },
    { label: "Add to project...", icon: Kanban, key: "⇧ P", active: true },
    { label: "Add labels...", icon: Tag, key: "L" },
    { label: "Set due date...", icon: Calendar, key: "⇧ D" },
    { label: "Copy issue IDs", icon: Clipboard, key: "⌘ ." , onClick: () => navigator.clipboard?.writeText(issueKeys.join(", ")) },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white/10 px-4 backdrop-blur-[1px]" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bulk issue actions"
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[#dedfe4] bg-white text-[#2d2e33] shadow-[0_24px_70px_rgba(16,17,20,0.20)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f1f2f4] px-2 py-1 text-[12px] font-medium text-[#55585f]">
            {count} issues
            <X size={12} className="text-[#6c6f76]" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[14px] text-[#a1a4ac]">
            <span>Type a command or search...</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#8b8e96]">
            <span>Ask Linear</span>
            <kbd className="rounded border border-[#e2e3e7] bg-white px-1.5 py-0.5 text-[11px] font-medium">Tab</kbd>
          </div>
        </div>
        <div className="px-2 pb-2">
          {actions.map(({ label, icon: Icon, key: shortcut, active, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] text-[#3a3b40]",
                active ? "bg-[#f2f2f3]" : "hover:bg-[#f6f6f7]",
              )}
            >
              <Icon size={16} className="text-[#60636a]" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {shortcut && (
                <kbd className="rounded border border-[#e1e2e6] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#6c6f76]">
                  {shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
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
  boardPreset,
  onToggleSelected,
  onOpenIssue,
}: {
  groups: Array<[string, Issue[]]>;
  selected: string[];
  display: IssueFilters["display"];
  boardPreset: IssueExplorerProps["boardPreset"];
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

  const statusOrder = ["In Review", "In Progress", "Todo", "Backlog", "Done", "Canceled"];
  const sortedGroups = [...groups].sort(([a], [b]) => {
    const indexA = statusOrder.indexOf(a);
    const indexB = statusOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="grid gap-0" data-testid="issue-grouped-list">
      {sortedGroups.map(([state, issues]) => (
        <div key={state} className="group/issue-section grid gap-0 overflow-hidden rounded-lg bg-card">
          <div className="flex h-9 items-center justify-between gap-2 rounded-lg bg-muted px-3">
            <button
              onClick={() => toggleGroup(state)}
              aria-expanded={!collapsed.has(state)}
              className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground"
            >
              <ChevronRight
                size={12}
                className={cn("text-muted-foreground transition-transform", !collapsed.has(state) ? "rotate-90" : "rotate-0")}
              />
              {boardPreset !== "my-issues-activity" && <StatusIcon status={state} size={10} />}
              <span className="truncate">{state}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[11px]">{issues.length}</Badge>
            </button>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/issue-section:opacity-100">
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
            <div className="divide-y divide-transparent">
              {issues.map((issue) => {
                const key = issueKey(issue);
                const state = stateName(issue);
                return (
                  <div
                    key={key}
                    data-selected={selected.includes(key) ? "true" : "false"}
                    className={cn(
                      "group grid h-12 grid-cols-[1rem_1rem_3rem_1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-[14px] transition-colors hover:bg-muted/55",
                      selected.includes(key) && "bg-[#f4efff] hover:bg-[#efe7ff]",
                      display === "comfortable" && "h-auto py-3",
                    )}
                    onDoubleClick={() => onOpenIssue(issue)}
                    data-testid={`issue-row-${key}`}
                  >
                    <Checkbox
                      aria-label={`Select ${key}`}
                      checked={selected.includes(key)}
                      onCheckedChange={() => onToggleSelected(key)}
                      className={cn(
                        "transition-opacity group-hover:opacity-100",
                        selected.includes(key) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <PriorityIcon priority={issue.priority} />
                    <button
                      type="button"
                      onClick={() => onOpenIssue(issue)}
                      className="text-left text-[13px] tabular-nums text-muted-foreground"
                    >
                      {key}
                    </button>
                    <button type="button" onClick={() => onOpenIssue(issue)} className="grid place-items-center">
                      <StatusIcon status={state} size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenIssue(issue)}
                      className="min-w-0 truncate text-left text-foreground"
                    >
                      {issueTitle(issue)}
                    </button>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span
                        className="grid size-5 place-items-center rounded-full bg-[#12bfd3] text-[9px] font-semibold text-white"
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
  const normalized = label.toLowerCase();
  const activeBars = normalized === "medium" ? 2 : normalized === "low" ? 1 : normalized === "no priority" ? 0 : 3;

  if (label === "Urgent") {
    return (
      <svg aria-label={label} className="shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="#ff6b3d" role="img" focusable="false">
        <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
      </svg>
    );
  }

  return (
    <svg aria-label={label} className="shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="#626166" role="img" focusable="false">
      {activeBars === 0 ? (
        <>
          <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
          <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
          <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        </>
      ) : (
        <>
          <rect x="1.5" y="8" width="3" height="6" rx="1" opacity={activeBars >= 1 ? 1 : 0.4} />
          <rect x="6.5" y="5" width="3" height="9" rx="1" opacity={activeBars >= 2 ? 1 : 0.4} />
          <rect x="11.5" y="2" width="3" height="12" rx="1" opacity={activeBars >= 3 ? 1 : 0.4} />
        </>
      )}
    </svg>
  );
}

export function StatusGlyph({ state }: { state: string }) {
  return <StatusIcon status={state} size={14} />;
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

  const iconColor = isDone ? "#5f6ad2" : isInReview || isQa ? "#35b866" : isInProgress ? "#f2a900" : "#8f9297";
  let path = "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14";

  if (isInReview || isQa) {
    path = "M8 4a4 4 0 1 1-3.993 4.213H8z M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11";
  } else if (isInProgress) {
    path = "M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11M8 4a4 4 0 0 1 0 8z";
  } else if (isBacklog) {
    path = "m14.94 8.914-1.982-.258a5 5 0 0 0 0-1.312l1.983-.258a7 7 0 0 1 0 1.828M14.47 5.32a7 7 0 0 0-.915-1.581l-1.586 1.218q.4.52.653 1.13zm-2.207-2.874-1.22 1.586a5 5 0 0 0-1.129-.653l.767-1.848c.569.236 1.1.545 1.582.915M8.914 1.06l-.258 1.983a5 5 0 0 0-1.312 0L7.086 1.06a7 7 0 0 1 1.828 0m-3.594.472.767 1.848a5 5 0 0 0-1.13.653L3.74 2.446a7 7 0 0 1 1.581-.915M2.446 3.74l1.586 1.218a5 5 0 0 0-.653 1.13L1.53 5.32a7 7 0 0 1 .915-1.581M1.06 7.086a7 7 0 0 0 0 1.828l1.983-.258a5 5 0 0 1 0-1.312zm.472 3.594 1.848-.767q.254.61.653 1.13l-1.586 1.219a7 7 0 0 1-.915-1.582m2.208 2.874 1.218-1.586q.52.4 1.13.653L5.32 14.47a7 7 0 0 1-1.581-.915m3.347 1.387.258-1.983a5 5 0 0 0 1.312 0l.258 1.983a7 7 0 0 1-1.828 0m3.594-.472-.767-1.848a5 5 0 0 0 1.13-.653l1.219 1.586a7 7 0 0 1-1.582.915m2.874-2.207-1.586-1.22c.265-.344.485-.723.653-1.129l1.848.767a7 7 0 0 1-.915 1.582";
  } else if (isDone) {
    path = "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1m4.101 5.101a.85.85 0 1 0-1.202-1.202L6.5 9.298 5.101 7.899a.85.85 0 1 0-1.202 1.202l2 2a.85.85 0 0 0 1.202 0z";
  } else if (isCanceled) {
    path = "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14M5.4 4.34 8 6.94l2.6-2.6 1.06 1.06L9.06 8l2.6 2.6-1.06 1.06L8 9.06l-2.6 2.6-1.06-1.06L6.94 8l-2.6-2.6z";
  } else if (isTodo) {
    path = "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14";
  }

  return (
    <svg aria-hidden="true" className="shrink-0" width={size} height={size} viewBox="0 0 16 16" fill={iconColor} role="img" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d={path} />
    </svg>
  );
}
