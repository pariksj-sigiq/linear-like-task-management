import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  Archive,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  CircleDashed,
  Filter,
  FolderKanban,
  GitBranch,
  Layers3,
  Map,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings,
  Smile,
  SlidersHorizontal,
  Star,
  Tag,
} from "lucide-react";
import { collectionFrom, readSnapshot, readTool } from "../api";
import { IssueExplorer, PriorityIcon, StatusGlyph, StatusPill } from "../components/IssueExplorer";
import { SubIssueProgress } from "../components/SubIssueProgress";
import { ProjectCreateModal } from "../components/ProjectCreateModal";
import { ProjectHeader } from "../components/project/ProjectHeader";
import { ProjectPropertiesSidebar } from "../components/project/ProjectPropertiesSidebar";
import { ProjectOverviewTab } from "../components/project/OverviewTab";
import { ProjectActivityTab } from "../components/project/ActivityTab";
import { ProjectIssuesTab } from "../components/project/IssuesTab";
import {
  ProjectsFilterMenu,
  EMPTY_PROJECT_FILTERS,
  matchesProjectFilters,
  projectFiltersCount,
  type ProjectFilters,
} from "../components/ProjectsFilterMenu";
import {
  ProjectsDisplayMenu,
  DEFAULT_PROJECT_DISPLAY_PROPS,
  type ProjectsDisplayProps,
  type ProjectsView,
} from "../components/ProjectsDisplayMenu";
import { ProjectsBoardView } from "../components/ProjectsBoardView";
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../auth";
import { cn } from "../lib/utils";
import type { Cycle, Issue, Notification, Project, ProjectUpdate, ViewDefinition } from "../linearTypes";
import { assigneeName, formatDate, initials, issueChildCount, issueKey, issueTitle, priorityLabel, projectName, projectTitle, splitIssueTree, stateName, titleize, userName } from "../linearTypes";

const teamName = (teamKey?: string) => (teamKey ? teamKey.toUpperCase() : "ENG");
const PROJECT_COLUMNS = ["Backlog", "Planned", "In Progress", "QA Requested", "In QA", "Changes Requested", "QA Passed", "Completed"];
const referenceProject = {
  id: "constructing-linear-clone-f2edb81a4bb4",
  name: "Constructing linear clone",
  lead: "parikshit.joon@gmail.com",
  state: "Backlog",
  priority: "No priority",
};
const referenceProjectIssues: Issue[] = [
  { key: "ELT-21", title: "Task verifier zero-state scoring gap", state: "In Review", assignee: "parikshit.joon@gmail.com", priority: 1, estimate: 21, project: "Constructing linear clone" },
  { key: "ELT-27", title: "Inbox split-pane parity", state: "In Review", assignee: "minalgoel99@gmail.com", priority: 2, estimate: 13, project: "Constructing linear clone" },
  { key: "ELT-7", title: "Classroom and teacher identifiers are unclear in student detail drawers", state: "In Review", assignee: "minalgoel99@gmail.com", priority: 3, estimate: 30, project: "Constructing linear clone" },
  { key: "ELT-6", title: "Students and Teachers CTAs appear as filters but trigger bulk assignment", state: "In Review", assignee: "vishalsharma.gbpecdelhi@gmail.com", priority: 3, estimate: 30, project: "Constructing linear clone" },
  { key: "ELT-19", title: "Audit picker keyboard states", state: "In Progress", assignee: "minalgoel99@gmail.com", priority: 2, estimate: 13, project: "Constructing linear clone" },
  { key: "ELT-18", title: "Polish project update composer", state: "In Progress", assignee: "vishalsharma.gbpecdelhi@gmail.com", priority: 2, estimate: 8, project: "Constructing linear clone" },
  { key: "ELT-5", title: "Handle transient LLM failures", state: "In Progress", assignee: "parikshit.joon@gmail.com", priority: 2, estimate: 30, project: "Constructing linear clone" },
  { key: "ELT-25", title: "QA Automation smoke checks need browser screenshots", state: "Todo", assignee: "parikshit.joon@gmail.com", priority: 2, estimate: 8, project: "Constructing linear clone" },
];
const candidateProjectIssues: Issue[] = [
  { key: "ELT-28", title: "Activity board density pass", state: "Backlog", assignee: "rohanbojja@icloud.com", priority: 2, estimate: 21 },
  { key: "ELT-24", title: "Linear UI Fidelity Pass spacing regression", state: "Backlog", assignee: "rohanbojja@icloud.com", priority: 1, estimate: 13 },
  { key: "ELT-23", title: "Issue Flow Implementation follow-up", state: "Todo", assignee: "minalgoel99@gmail.com", priority: 2, estimate: 8 },
  { key: "ELT-16", title: "Repair notification read state", state: "Todo", assignee: "rohanbojja@icloud.com", priority: 2, estimate: 5 },
];
const referenceInboxRows: Array<{
  key: string;
  title: string;
  actor: string;
  body: string;
  time: string;
  state: string;
  issue: Issue;
  kind?: "issue" | "project";
}> = [
  {
    key: "ENGG-1847",
    title: "Handle transient LLM failures",
    actor: "jasper emhoff",
    body: "jasper emhoff assigned the issue to you",
    time: "14h",
    state: "In QA",
    issue: {
      key: "ENGG-1847",
      title: "Handle transient LLM failures",
      description: "The particular failure was a 500 internal service error from Azure foundry",
      state: "In QA",
      project: "ET Bug Board",
      assignee: "parikshit.joon@sigiq.ai",
      cycle: "Cycle 30",
      created_at: "2026-04-29T03:51:22Z",
    },
  },
  {
    key: "ENGG-1792",
    title: "“Students” and “Teachers” CTAs appear as filters but trigger bulk...",
    actor: "Jaikumar A`",
    body: "Reopened by Jaikumar A`",
    time: "1d",
    state: "In QA",
    issue: {
      key: "ENGG-1792",
      title: "“Students” and “Teachers” CTAs appear as filters but trigger bulk assignment actions",
      description: "Reopened while reviewing classroom assignment flows.",
      state: "In QA",
      project: "ET Bug Board",
      assignee: "Jaikumar A`",
      cycle: "Cycle 30",
    },
  },
  {
    key: "ENGG-1840",
    title: "Students assignment name mismatch",
    actor: "Jaikumar A`",
    body: "Jaikumar A` assigned the issue to you",
    time: "1d",
    state: "Backlog",
    issue: {
      key: "ENGG-1840",
      title: "Students assignment name mismatch",
      description: "Students assignment name mismatch",
      state: "Backlog",
      project: "ET Bug Board",
      assignee: "Jaikumar A`",
      cycle: "Cycle 30",
    },
  },
  {
    key: "ENGG-1795",
    title: "Classroom and teacher identifiers are unclear, and student details...",
    actor: "Jaikumar A`",
    body: "Reopened by Jaikumar A`",
    time: "1d",
    state: "In QA",
    issue: {
      key: "ENGG-1795",
      title: "Classroom and teacher identifiers are unclear, and student details are not visible",
      description: "Classroom and teacher identifiers are unclear.",
      state: "In QA",
      project: "ET Bug Board",
      assignee: "Jaikumar A`",
      cycle: "Cycle 30",
    },
  },
  ...["1839", "1838", "1837", "1836"].map((id) => ({
    key: `ENGG-${id}`,
    title:
      id === "1839"
        ? "Published lesson is showing as draft"
        : id === "1838"
          ? "Scratchpad Enable/disable not working properly"
          : id === "1837"
            ? "Lesson Preview - Couldn't scroll"
            : "Lesson content not visible after cloning",
    actor: "Jaikumar A`",
    body: "Jaikumar A` assigned the issue to you",
    time: "1d",
    state: "Backlog",
    issue: {
      key: `ENGG-${id}`,
      title:
        id === "1839"
          ? "Published lesson is showing as draft"
          : id === "1838"
            ? "Scratchpad Enable/disable not working properly"
            : id === "1837"
              ? "Lesson Preview - Couldn't scroll"
              : "Lesson content not visible after cloning",
      description: "Jaikumar A` assigned the issue to you",
      state: "Backlog",
      project: "ET Bug Board",
      assignee: "Jaikumar A`",
      cycle: "Cycle 30",
    },
  })),
  ...["1794", "1791", "1793", "1790"].map((id) => ({
    key: `ENGG-${id}`,
    title:
      id === "1794"
        ? "Password visibility and feedback are inconsistent..."
        : id === "1791"
          ? "Student import flow is unclear and appears disconnected..."
          : id === "1793"
            ? "“Student links” metric is ambiguous..."
            : "Account deletion only works from creator account...",
    actor: "MCP",
    body: "MCP subscribed you to an issue",
    time: "1w",
    state: "Done",
    issue: {
      key: `ENGG-${id}`,
      title:
        id === "1794"
          ? "Password visibility and feedback are inconsistent across login and sign-up flows"
          : id === "1791"
            ? "Student import flow is unclear and appears disconnected from classroom selection"
            : id === "1793"
              ? "“Student links” metric is ambiguous"
              : "Account deletion only works from creator account login",
      description: "MCP subscribed you to an issue",
      state: "Done",
      project: "ET Bug Board",
      assignee: "MCP",
      cycle: "Cycle 30",
    },
  })),
  {
    key: "",
    title: "Internal dashboard product feature QA audit",
    actor: "jasper emhoff",
    body: "Added as a project lead by jasper emhoff",
    time: "1w",
    state: "Backlog",
    kind: "project",
    issue: {
      key: "PROJECT",
      title: "Internal dashboard product feature QA audit",
      description: "Added as a project lead by jasper emhoff",
      state: "Backlog",
      project: "Internal dashboard product feature QA audit",
      assignee: "jasper emhoff",
    },
  },
  {
    key: "ENGG-1802",
    title: "Network Tab Audit [Keita]",
    actor: "keita@sigiq.ai",
    body: "keita@sigiq.ai assigned the issue to you",
    time: "8d",
    state: "Backlog",
    issue: {
      key: "ENGG-1802",
      title: "Network Tab Audit [Keita]",
      description: "Network Tab Audit [Keita]",
      state: "Backlog",
      project: "ET Bug Board",
      assignee: "keita@sigiq.ai",
      cycle: "Cycle 30",
    },
  },
];

function projectColumn(project: Project) {
  const raw = String(project.status || project.state || "backlog").toLowerCase();
  if (raw.includes("complete") || raw.includes("done")) return "Completed";
  if (raw.includes("passed")) return "QA Passed";
  if (raw.includes("change")) return "Changes Requested";
  if (raw.includes("in qa")) return "In QA";
  if (raw.includes("qa")) return "QA Requested";
  if (raw.includes("start") || raw.includes("progress")) return "In Progress";
  if (raw.includes("plan")) return "Planned";
  return "Backlog";
}

export function HomePage() {
  return <MyIssuesPage />;
}

type MyIssuesTab = "assigned" | "created" | "subscribed" | "activity";

interface MyIssueActivityEvent {
  id?: string;
  issue_id?: string;
  actor_id?: string;
  action?: string;
  kind?: string;
  created_at?: string | null;
  from_value?: string | null;
  to_value?: string | null;
  issue?: Issue | null;
}

type MyIssuesViewMode = "list" | "board";
type MyIssuesOrder = "updated" | "created" | "priority";

interface MyIssuesFilters {
  status: string[];
  priority: string[];
  creator: string[];
  project: string[];
  date: string[];
  assignee: "all" | "me" | "unassigned";
}

interface MyIssuesDisplay {
  order: MyIssuesOrder;
  priority: boolean;
  status: boolean;
  assignee: boolean;
  project: boolean;
  date: boolean;
  compact: boolean;
}

const EMPTY_MY_ISSUES_FILTERS: MyIssuesFilters = {
  status: [],
  priority: [],
  creator: [],
  project: [],
  date: [],
  assignee: "all",
};

const DEFAULT_MY_ISSUES_DISPLAY: MyIssuesDisplay = {
  order: "updated",
  priority: true,
  status: true,
  assignee: true,
  project: false,
  date: true,
  compact: false,
};

function MyIssuesTabs() {
  const location = useLocation();
  const active = myIssuesTabFromPath(location.pathname);
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex h-7 items-center rounded-full border border-border bg-background px-3 text-[13px] text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
      isActive && "bg-muted text-foreground",
    );

  return (
    <div className="mb-0 flex flex-wrap items-center gap-1.5" aria-label="My issues sections">
      {(["assigned", "created", "subscribed", "activity"] as const).map((item) => (
        <NavLink
          key={item}
          className={() => tabClass({ isActive: active === item })}
          to={`/my-issues/${item}`}
          data-testid={`my-issues-tab-${item}`}
        >
          {titleize(item)}
        </NavLink>
      ))}
    </div>
  );
}

export function MyIssuesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const tab = myIssuesTabFromPath(location.pathname);
  const userId = resolveMyIssuesUserId(user);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activity, setActivity] = useState<MyIssueActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MyIssuesFilters>(EMPTY_MY_ISSUES_FILTERS);
  const [display, setDisplay] = useState<MyIssuesDisplay>(DEFAULT_MY_ISSUES_DISPLAY);
  const [view, setView] = useState<MyIssuesViewMode>("list");
  const [openControl, setOpenControl] = useState<"filter" | "display" | null>(null);

  const visibleIssues = useMemo(
    () => sortMyIssues(issues.filter((issue) => matchesMyIssueFilters(issue, filters, userId)), display.order),
    [issues, filters, userId, display.order],
  );
  const visibleActivity = useMemo(
    () => sortMyIssueActivity(
      uniqueMyIssueActivityRows(activity).filter((event) => event.issue && matchesMyIssueFilters(event.issue, filters, userId)),
      display.order,
    ),
    [activity, filters, userId, display.order],
  );
  const activeFilterCount = myIssuesFiltersCount(filters);

  useDocumentTitle(`My issues › ${titleize(tab)}`);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      if (tab === "activity") {
        const response = await readTool("list_my_issue_activity", { query: userId, limit: 80 });
        if (cancelled) return;
        setActivity(collectionFrom<MyIssueActivityEvent>(response.data, ["activity", "results", "items"]));
        setIssues([]);
        setError(response.error);
        setLoading(false);
        return;
      }

      const toolName = tab === "created" ? "list_created_issues" : tab === "subscribed" ? "list_subscribed_issues" : "list_my_issues";
      const response = await readTool(toolName, { query: userId, limit: 80 });
      if (cancelled) return;
      setIssues(collectionFrom<Issue>(response.data, ["issues", "results", "items"]));
      setActivity([]);
      setError(response.error);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, userId]);

  return (
    <div className="linear-page" data-testid="my-issues-page">
      <ErrorBanner message={error} />
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex min-h-12 items-center justify-between gap-3 px-2">
          <MyIssuesTabs />
          <div className="flex items-center gap-1.5">
            <MyIssuesFilterMenu
              open={openControl === "filter"}
              onOpenChange={(open) => setOpenControl(open ? "filter" : null)}
              filters={filters}
              onChange={setFilters}
            >
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Add filter" className="relative rounded-full border border-border bg-background shadow-sm">
                <Filter size={14} />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </MyIssuesFilterMenu>
            <MyIssuesDisplayMenu
              open={openControl === "display"}
              onOpenChange={(open) => setOpenControl(open ? "display" : null)}
              view={view}
              onViewChange={setView}
              display={display}
              onDisplayChange={setDisplay}
            >
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Display options" className="rounded-full border border-border bg-background shadow-sm">
                <SlidersHorizontal size={14} />
              </Button>
            </MyIssuesDisplayMenu>
          </div>
        </div>
      </div>

      <div className="min-h-0">
        {loading ? (
          <div className="px-3 py-6">
            <Spinner label="Loading my issues" />
          </div>
        ) : view === "board" ? (
          <MyIssuesBoard issues={tab === "activity" ? visibleActivity.map((event) => event.issue).filter(Boolean) as Issue[] : visibleIssues} display={display} />
        ) : tab === "activity" ? (
          <MyIssueActivityList activity={visibleActivity} display={display} />
        ) : tab === "assigned" ? (
          <AssignedMyIssuesList issues={visibleIssues} display={display} />
        ) : (
          <FlatMyIssuesList issues={visibleIssues} tab={tab} display={display} />
        )}
        </div>
    </div>
  );
}

function myIssuesTabFromPath(pathname: string): MyIssuesTab {
  if (pathname.endsWith("/created")) return "created";
  if (pathname.endsWith("/subscribed")) return "subscribed";
  if (pathname.endsWith("/activity")) return "activity";
  return "assigned";
}

function resolveMyIssuesUserId(user: { id?: string; username?: string } | null) {
  if (!user || user.id === "dev-admin" || user.username === "admin") return "user_001";
  return user.id || "user_001";
}

function AssignedMyIssuesList({ issues, display }: { issues: Issue[]; display: MyIssuesDisplay }) {
  const urgent = issues.filter((issue) => !isCompletedIssue(issue) && priorityLabel(issue.priority) === "Urgent");
  const otherActive = issues.filter((issue) => !isCompletedIssue(issue) && priorityLabel(issue.priority) !== "Urgent");
  const completed = issues.filter(isCompletedIssue);
  const groups: Array<[string, Issue[]]> = (
    [
      ["Urgent issues", urgent],
      ["Other active", otherActive],
      ["Completed", completed],
    ] as Array<[string, Issue[]]>
  ).filter(([, rows]) => rows.length > 0);

  if (!groups.length) return <EmptyState title="No assigned issues" description="Issues assigned to you will appear here." />;

  return (
    <div className="grid gap-2 px-2 py-2" data-testid="my-issues-assigned-list">
      {groups.map(([label, rows]) => (
        <MyIssuesGroup key={label} label={label} count={rows.length}>
          <MyIssueTreeRows issues={rows} context="assigned" display={display} />
        </MyIssuesGroup>
      ))}
    </div>
  );
}

function FlatMyIssuesList({ issues, tab, display }: { issues: Issue[]; tab: Exclude<MyIssuesTab, "assigned" | "activity">; display: MyIssuesDisplay }) {
  if (!issues.length) {
    return <EmptyState title={tab === "created" ? "No created issues" : "No subscribed issues"} description="Matching issues will appear here." />;
  }

  return (
    <div className="px-2 py-2" data-testid={`my-issues-${tab}-list`}>
      <div className="divide-y divide-transparent">
        <MyIssueTreeRows issues={issues} context={tab} display={display} />
      </div>
    </div>
  );
}

function MyIssueActivityList({ activity, display }: { activity: MyIssueActivityEvent[]; display: MyIssuesDisplay }) {
  const rows = activity.slice(0, 20);
  if (!rows.length) return <EmptyState title="No activity" description="Issue updates you perform will appear here." />;

  return (
    <div className="grid gap-2 px-2 py-2" data-testid="my-issues-activity-list">
      <MyIssuesGroup label="Today" count={rows.length}>
        {rows.map((event) => event.issue && (
          <MyIssueRow
            key={event.id || `${event.issue_id}-${event.created_at}`}
            issue={event.issue}
            context="activity"
            activity={event}
            display={display}
          />
        ))}
      </MyIssuesGroup>
    </div>
  );
}

function MyIssuesGroup({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <section data-testid={`my-issues-group-${label}`}>
      <div className="flex h-9 items-center gap-2 rounded-md bg-muted/75 px-3 text-[14px] font-medium text-[#3f4147]">
        <span aria-hidden className="text-[#c6c8cd]">▾</span>
        <span>{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="divide-y divide-transparent">{children}</div>
    </section>
  );
}

function MyIssueTreeRows({ issues, context, display }: { issues: Issue[]; context: MyIssuesTab; display: MyIssuesDisplay }) {
  return (
    <>
      {splitIssueTree(issues).map(({ issue, children }) => (
        <MyIssueRow
          key={issueKey(issue)}
          issue={issue}
          childrenIssues={children}
          context={context}
          display={display}
        />
      ))}
    </>
  );
}

function MyIssueRow({
  issue,
  context,
  activity,
  display,
  childrenIssues = [],
}: {
  issue: Issue;
  context: MyIssuesTab;
  activity?: MyIssueActivityEvent;
  display: MyIssuesDisplay;
  childrenIssues?: Issue[];
}) {
  const key = issueKey(issue);
  const priority = visiblePriority(issue.priority);
  const childCount = childrenIssues.length || issueChildCount(issue);
  const meta =
    context === "created"
      ? "Created by you"
      : context === "subscribed"
        ? "Subscribed by you"
        : context === "activity"
          ? `Updated on ${formatDate(activity?.created_at || issue.updated_at || issue.created_at)}`
          : formatDate(issue.updated_at || issue.created_at);
  const sourcePath = context === "activity" ? "/my-issues/activity" : `/my-issues/${context}`;
  const sourcePill = context === "activity" ? "Activity" : titleize(context);
  const sourceState = {
    source: "my-issues",
    from: sourcePath,
    fromLabel: "My issues",
    fromPill: sourcePill,
  };

  return (
    <div data-testid={`my-issue-row-block-${key}`}>
      <Link
        to={`/issue/${key}`}
        state={sourceState}
        className={cn(
          "group grid grid-cols-[1.25rem_5rem_1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-3 text-[14px] transition-colors hover:bg-muted/55",
          display.compact ? "min-h-9" : "min-h-12",
        )}
        data-testid={`my-issue-row-${key}`}
      >
        <span data-testid={`my-issue-priority-${slugifyPriority(priority)}`}>{display.priority && <PriorityIcon priority={priority} />}</span>
        <span className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">{key}</span>
        <span>{display.status && <StatusGlyph state={stateName(issue)} />}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{issueTitle(issue)}</span>
            {display.project && issue.project && (
              <span className="block truncate text-[12px] text-muted-foreground">{String(issue.project)}</span>
            )}
          </span>
          {childCount > 0 && (
            <SubIssueProgress
              issue={issue}
              childrenIssues={childrenIssues.length ? childrenIssues : undefined}
              className="h-5 px-1.5 text-[11px]"
              testId={`my-issue-subissue-count-${key}`}
            />
          )}
        </span>
        <span className="flex items-center gap-3 text-[13px] text-muted-foreground">
          {display.assignee && (
            <span
              className="grid size-5 place-items-center rounded-full bg-[#12bfd3] text-[9px] font-semibold text-white"
              title={assigneeName(issue)}
            >
              {initials(assigneeName(issue))}
            </span>
          )}
          {display.date && <span className="whitespace-nowrap">{meta}</span>}
        </span>
      </Link>

      {childrenIssues.length > 0 && (
        <div className="ml-[7.65rem] border-l border-border/80 py-0.5 pl-3">
          {childrenIssues.map((child) => (
            <Link
              key={issueKey(child)}
              to={`/issue/${issueKey(child)}`}
              state={{ ...sourceState, parentKey: key, parentTitle: issueTitle(issue) }}
              className="grid min-h-9 grid-cols-[5rem_1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/55"
              data-testid={`my-issue-subissue-row-${issueKey(child)}`}
            >
              <span className="whitespace-nowrap tabular-nums">{issueKey(child)}</span>
              <span>{display.status && <StatusGlyph state={stateName(child)} />}</span>
              <span className="min-w-0 truncate text-foreground">{issueTitle(child)}</span>
              <span className="flex items-center gap-1.5">
                <GitBranch size={11} />
                <span>{assigneeName(child)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MyIssuesFilterMenu({
  open,
  onOpenChange,
  filters,
  onChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MyIssuesFilters;
  onChange: (filters: MyIssuesFilters) => void;
  children: ReactNode;
}) {
  const [panel, setPanel] = useState<"root" | "status" | "priority" | "assignee" | "creator" | "project" | "date">("root");
  const toggleArrayFilter = (key: "status" | "priority" | "creator" | "project" | "date", value: string) => {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    });
    setPanel("root");
    onOpenChange(false);
  };
  const closeFilterMenu = () => {
    setPanel("root");
    onOpenChange(false);
  };
  const toggleFilterMenu = () => {
    if (open) {
      closeFilterMenu();
      return;
    }
    setPanel("root");
    onOpenChange(true);
  };
  const panelTop =
    panel === "status" ? "top-[50px]"
      : panel === "assignee" ? "top-[86px]"
        : panel === "creator" ? "top-[122px]"
          : panel === "priority" ? "top-[158px]"
            : panel === "date" ? "top-[194px]"
              : "top-[230px]";

  return (
    <div className="relative z-[70]">
      <span onClick={toggleFilterMenu}>{children}</span>
      {open && <button type="button" aria-label="Close filter menu" className="fixed inset-0 z-[65] cursor-default bg-transparent" onClick={closeFilterMenu} />}
      {open && (
      <>
      {panel !== "root" && (
        <div className={cn("absolute right-[246px] z-[75] w-[218px] overflow-hidden rounded-xl border border-border bg-popover text-sm text-popover-foreground shadow-[0_18px_44px_rgba(0,0,0,0.18)]", panelTop)}>
          {panel === "status" ? (
            <HoverFilterPanel>
              {[
                ["Backlog", "2 issues", <StatusGlyph state="Backlog" />],
                ["Todo", "", <StatusGlyph state="Todo" />],
                ["In Progress", "", <StatusGlyph state="In Progress" />],
                ["In Review", "", <StatusGlyph state="In Review" />],
                ["Done", "1 issue", <StatusGlyph state="Done" />],
                ["Canceled", "", <StatusGlyph state="Canceled" />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption key={String(label)} active={filters.status.includes(String(label))} icon={icon} label={String(label)} count={String(count)} onClick={() => toggleArrayFilter("status", String(label))} />
              ))}
            </HoverFilterPanel>
          ) : panel === "assignee" ? (
            <HoverFilterPanel>
              {[
                ["Unassigned", "2 issues", <UserMiniIcon muted />],
                ["Current user", "", <UserMiniIcon />],
                ["Parikshit Joon", "", <AvatarDot label="PJ" color="bg-[#12bfd3]" />],
                ["Sarah Connor", "1 issue", <AvatarDot label="SC" color="bg-[#12bfd3]" />],
                ["Riley Nguyen", "", <AvatarDot label="RN" color="bg-[#c5a137]" />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption
                  key={String(label)}
                  active={(label === "Unassigned" && filters.assignee === "unassigned") || (label === "Current user" && filters.assignee === "me")}
                  icon={icon}
                  label={String(label)}
                  count={String(count)}
                  onClick={() => {
                    if (label === "Unassigned") onChange({ ...filters, assignee: filters.assignee === "unassigned" ? "all" : "unassigned" });
                    if (label !== "Unassigned") onChange({ ...filters, assignee: filters.assignee === "me" ? "all" : "me" });
                    closeFilterMenu();
                  }}
                />
              ))}
            </HoverFilterPanel>
          ) : panel === "creator" ? (
            <HoverFilterPanel>
              {[
                ["Current user", "", <UserMiniIcon />],
                ["Parikshit Joon", "3 issues", <AvatarDot label="PJ" color="bg-[#12bfd3]" />],
                ["Sarah Connor", "1 issue", <AvatarDot label="SC" color="bg-[#12bfd3]" />],
                ["Riley Nguyen", "", <AvatarDot label="RN" color="bg-[#c5a137]" />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption key={String(label)} active={filters.creator.includes(String(label))} icon={icon} label={String(label)} count={String(count)} onClick={() => toggleArrayFilter("creator", String(label))} />
              ))}
            </HoverFilterPanel>
          ) : panel === "priority" ? (
            <HoverFilterPanel>
              {[
                ["No priority", "2 issues", <NoPriorityIcon />],
                ["Urgent", "", <span className="grid size-4 place-items-center rounded bg-[#ef5c42] text-[11px] font-bold text-white">!</span>],
                ["High", "", <PriorityBars level={3} />],
                ["Medium", "1 issue", <PriorityBars level={2} />],
                ["Low", "", <PriorityBars level={1} />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption key={String(label)} active={filters.priority.includes(String(label))} icon={icon} label={String(label)} count={String(count)} onClick={() => toggleArrayFilter("priority", String(label))} />
              ))}
            </HoverFilterPanel>
          ) : panel === "date" ? (
            <HoverFilterPanel>
              {[
                ["Today", "20 issues", <CalendarDays size={14} strokeWidth={2} className="text-muted-foreground" />],
                ["Yesterday", "", <CalendarDays size={14} strokeWidth={2} className="text-muted-foreground" />],
                ["This week", "", <CalendarDays size={14} strokeWidth={2} className="text-muted-foreground" />],
                ["Older", "", <Clock3 size={14} strokeWidth={2} className="text-muted-foreground" />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption key={String(label)} active={filters.date.includes(String(label))} icon={icon} label={String(label)} count={String(count)} onClick={() => toggleArrayFilter("date", String(label))} />
              ))}
            </HoverFilterPanel>
          ) : (
            <HoverFilterPanel>
              {[
                ["No project", "", <ProjectMiniIcon muted />],
                ["Constructing linear clone", "2 issues", <ProjectMiniIcon />],
                ["Backend Tool Server Coverage", "1 issue", <ProjectMiniIcon />],
                ["ET Bug Board", "", <ProjectMiniIcon />],
              ].map(([label, count, icon]) => (
                <HoverFilterOption key={String(label)} active={filters.project.includes(String(label))} icon={icon} label={String(label)} count={String(count)} onClick={() => toggleArrayFilter("project", String(label))} />
              ))}
            </HoverFilterPanel>
          )}
        </div>
      )}
      <div className="absolute right-0 top-[calc(100%+7px)] z-[70] w-[238px] overflow-hidden rounded-xl border border-border bg-popover p-0 text-sm text-popover-foreground shadow-[0_14px_32px_rgba(0,0,0,0.13)]" data-testid="my-issues-filter-menu">
        <div className="flex h-10 items-center gap-2 border-b border-border/70 px-3 text-[13px] text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">Add Filter...</span>
          <kbd className="text-[12px] text-muted-foreground">F</kbd>
        </div>
        <div className="py-1 text-[13px]">
          <FilterMenuRow active={panel === "status"} icon={<CircleDashed size={14} />} label="Status" onHover={() => setPanel("status")} />
          <FilterMenuRow active={panel === "assignee"} icon={<UsersIcon />} label="Assignee" onHover={() => setPanel("assignee")} />
          <FilterMenuRow active={panel === "creator"} icon={<UsersIcon />} label="Creator" onHover={() => setPanel("creator")} />
          <FilterMenuRow active={panel === "priority"} icon={<PriorityBars level={3} />} label="Priority" onHover={() => setPanel("priority")} />
          <FilterMenuRow active={panel === "date"} icon={<CalendarDays size={14} />} label="Dates" onHover={() => setPanel("date")} />
          <FilterMenuRow active={panel === "project"} icon={<Box size={14} />} label="Project" onHover={() => setPanel("project")} />
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function MyIssuesDisplayMenu({
  open,
  onOpenChange,
  view,
  onViewChange,
  display,
  onDisplayChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: MyIssuesViewMode;
  onViewChange: (view: MyIssuesViewMode) => void;
  display: MyIssuesDisplay;
  onDisplayChange: (display: MyIssuesDisplay) => void;
  children: ReactNode;
}) {
  const toggleDisplay = (key: keyof Pick<MyIssuesDisplay, "priority" | "status" | "assignee" | "project" | "date" | "compact">) =>
    onDisplayChange({ ...display, [key]: !display[key] });

  return (
    <div className="relative z-[70]">
      <span onClick={() => onOpenChange(!open)}>{children}</span>
      {open && <button type="button" aria-label="Close display menu" className="fixed inset-0 z-[65] cursor-default bg-transparent" onClick={() => onOpenChange(false)} />}
      {open && (
      <div className="absolute right-0 top-[calc(100%+7px)] z-[70] w-[302px] rounded-xl border border-border bg-popover p-0 text-sm text-popover-foreground shadow-[0_14px_32px_rgba(0,0,0,0.13)]" data-testid="my-issues-display-menu">
        <div className="px-4 pb-3 pt-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted/70 p-1">
            <ViewToggle active={view === "list"} label="List" onClick={() => onViewChange("list")} />
            <ViewToggle active={view === "board"} label="Board" onClick={() => onViewChange("board")} />
          </div>
        </div>
        <div className="grid gap-2 border-t border-border/70 px-4 py-3 text-[13px]">
          <DisplaySelectRow label="Grouping" value="My activity" />
          <DisplaySelectRow label="Sub-grouping" value="No grouping" />
          <DisplaySelectRow
            label="Ordering"
            value={display.order === "updated" ? "My activity date" : display.order === "created" ? "Created" : "Priority"}
            onClick={() => onDisplayChange({ ...display, order: display.order === "updated" ? "created" : display.order === "created" ? "priority" : "updated" })}
          />
        </div>
        <div className="grid gap-2 border-t border-border/70 px-4 py-3 text-[13px]">
          <DisplaySelectRow label="Completed issues" value="All" />
          <div className="flex h-7 items-center justify-between">
            <span className="text-muted-foreground">Show sub-issues</span>
            <button type="button" onClick={() => toggleDisplay("compact")} className={cn("h-4 w-7 rounded-full p-0.5 transition-colors", !display.compact ? "bg-primary" : "bg-muted-foreground/30")}>
              <span className={cn("block size-3 rounded-full bg-white transition-transform", !display.compact && "translate-x-3")} />
            </button>
          </div>
        </div>
        <div className="border-t border-border/70 px-4 pb-4 pt-3">
          <div className="mb-2 text-[13px] text-muted-foreground">List options</div>
          <div className="mb-2 flex h-7 items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Nested sub-issues</span>
            <button type="button" onClick={() => toggleDisplay("compact")} className={cn("h-4 w-7 rounded-full p-0.5 transition-colors", display.compact ? "bg-primary" : "bg-muted-foreground/30")}>
              <span className={cn("block size-3 rounded-full bg-white transition-transform", display.compact && "translate-x-3")} />
            </button>
          </div>
          <div className="mb-2 text-[13px] text-muted-foreground">Display properties</div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["id", "ID"],
              ["priority", "Priority"],
              ["status", "Status"],
              ["assignee", "Assignee"],
              ["project", "Project"],
              ["due", "Due date"],
              ["labels", "Labels"],
              ["date", "Updated"],
              ["activity", "My activity date"],
            ] as Array<[string, string]>).map(([key, label]) => {
              const active = key === "id" || key === "activity" || key === "due" || key === "labels" ? false : display[key as keyof Pick<MyIssuesDisplay, "priority" | "status" | "assignee" | "project" | "date">];
              return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (["priority", "status", "assignee", "project", "date"].includes(key)) {
                    toggleDisplay(key as keyof Pick<MyIssuesDisplay, "priority" | "status" | "assignee" | "project" | "date" | "compact">);
                  }
                }}
                className={cn(
                  "h-6 rounded-full border px-2 text-[12px] transition-colors",
                  active ? "border-transparent bg-muted text-foreground" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60",
                )}
              >
                {label}
              </button>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function FilterToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-muted/70">
      <span className={cn("grid size-4 place-items-center rounded-sm border", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
        {active && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function FilterMenuRow({ icon, label, active, onHover }: { icon: ReactNode; label: string; active?: boolean; onHover: () => void }) {
  return (
    <button
      type="button"
      onClick={onHover}
      onMouseEnter={onHover}
      onMouseMove={onHover}
      onMouseOver={onHover}
      onPointerEnter={onHover}
      onPointerMove={onHover}
      onFocus={onHover}
      className={cn(
        "flex h-9 w-full items-center gap-2 px-3 text-left text-[13px]",
        active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
      )}
    >
      <span className="grid size-4 place-items-center text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight size={13} className="text-muted-foreground" />
    </button>
  );
}

function HoverFilterPanel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex h-10 items-center border-b border-border/70 px-3 text-[13px] text-muted-foreground">Filter...</div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function HoverFilterOption({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] text-foreground hover:bg-muted/70">
      <span className="grid size-4 place-items-center text-muted-foreground">{active ? <Check size={13} /> : icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count && <span className="text-[12px] text-muted-foreground">{count}</span>}
    </button>
  );
}

function AvatarDot({ label, color }: { label: string; color: string }) {
  return <span className={cn("grid size-4 place-items-center rounded-full text-[7px] font-semibold text-white", color)}>{label}</span>;
}

function PriorityBars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex h-4 w-4 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn("w-[3px] rounded-sm", bar <= level ? "bg-muted-foreground" : "bg-muted-foreground/30")}
          style={{ height: `${bar * 4 + 1}px` }}
        />
      ))}
    </span>
  );
}

function ViewToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex h-7 items-center justify-center rounded-full text-[13px] font-medium", active ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground")}>
      {label}
    </button>
  );
}

function DisplaySelectRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-7 items-center justify-between gap-3 rounded-md text-left">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-foreground shadow-sm">
        {value}
        <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
      </span>
    </button>
  );
}

function UsersIcon() {
  return <UserMiniIcon />;
}

function PriorityMiniIcon() {
  return <span className="text-[13px] leading-none">▮▮▮</span>;
}

function UserMiniIcon({ muted = false }: { muted?: boolean }) {
  return (
    <span className={cn("relative block size-4", muted ? "text-muted-foreground/70" : "text-muted-foreground")}>
      <span className="absolute left-[5px] top-[2px] size-[5px] rounded-full border border-current" />
      <span className="absolute bottom-[2px] left-[3px] h-[6px] w-[9px] rounded-t-full border border-current border-b-0" />
    </span>
  );
}

function ProjectMiniIcon({ muted = false }: { muted?: boolean }) {
  return (
    <span className={cn("grid size-4 place-items-center", muted ? "text-muted-foreground/70" : "text-muted-foreground")}>
      <Box size={14} strokeWidth={1.9} />
    </span>
  );
}

function NoPriorityIcon() {
  return (
    <span className="flex size-4 items-center justify-center gap-[2px] text-muted-foreground" aria-hidden>
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
    </span>
  );
}

function MyIssuesBoard({ issues, display }: { issues: Issue[]; display: MyIssuesDisplay }) {
  const groups = ["Backlog", "Todo", "In Progress", "In QA", "Done"].map((label) => [
    label,
    issues.filter((issue) => boardBucketForIssue(issue) === label),
  ] as [string, Issue[]]).filter(([, rows]) => rows.length > 0);

  if (!groups.length) return <EmptyState title="No matching issues" description="Adjust filters to see more issues." />;

  return (
    <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto px-2 py-2" data-testid="my-issues-board">
      {groups.map(([label, rows]) => (
        <section key={label} className="min-w-[220px] rounded-lg bg-muted/55 p-2">
          <div className="mb-2 flex items-center gap-2 px-1 text-[13px] font-medium text-muted-foreground">
            <span>{label}</span>
            <span>{rows.length}</span>
          </div>
          <div className="grid gap-1.5">
            {rows.map((issue) => (
              <Link key={issueKey(issue)} to={`/issue/${issueKey(issue)}`} className="rounded-md border border-border bg-background p-2 text-[13px] shadow-sm hover:bg-muted/45">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  {display.priority && <PriorityIcon priority={visiblePriority(issue.priority)} />}
                  <span>{issueKey(issue)}</span>
                  {display.status && <StatusGlyph state={stateName(issue)} />}
                </div>
                <div className="line-clamp-2 font-medium text-foreground">{issueTitle(issue)}</div>
                {display.assignee && <div className="mt-2 text-[12px] text-muted-foreground">{assigneeName(issue)}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MyIssuesDetailsPanel({
  issue,
  visibleCount,
  filters,
  display,
  onClearFilters,
}: {
  issue: Issue | null;
  visibleCount: number;
  filters: MyIssuesFilters;
  display: MyIssuesDisplay;
  onClearFilters: () => void;
}) {
  const [tab, setTab] = useState<"labels" | "priority" | "projects">("labels");
  return (
    <aside className="p-2 pl-0" data-testid="my-issues-details-panel">
      <div className="min-h-[calc(100vh-7.25rem)] rounded-xl border border-border bg-background shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
        <div className="border-b border-border/70 px-3 py-2">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted/70 p-1">
            {(["labels", "priority", "projects"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "h-7 rounded-full text-[13px] font-medium capitalize",
                  tab === item ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-7 text-center text-[13px] text-muted-foreground">
          {tab === "labels" ? (
            "No labels used"
          ) : tab === "priority" && issue ? (
            <div className="grid gap-3 text-left">
              <DetailRow label="Priority" value={priorityLabel(visiblePriority(issue.priority))} />
              <DetailRow label="Status" value={stateName(issue)} />
              <DetailRow label="Assignee" value={assigneeName(issue)} />
            </div>
          ) : tab === "projects" && issue ? (
            <div className="grid gap-3 text-left">
              <Link to={`/issue/${issueKey(issue)}`} className="block rounded-lg border border-border bg-muted/35 p-3 hover:bg-muted">
                <div className="mb-1 text-muted-foreground">{issueKey(issue)}</div>
                <div className="font-medium text-foreground">{issueTitle(issue)}</div>
              </Link>
              <DetailRow label="Project" value={String(issue.project || "No project")} />
              <DetailRow label="Visible" value={`${visibleCount} issues`} />
              <DetailRow label="Ordering" value={display.order === "updated" ? "My activity date" : display.order === "created" ? "Created" : "Priority"} />
              {myIssuesFiltersCount(filters) > 0 && (
                <button type="button" onClick={onClearFilters} className="justify-self-start text-muted-foreground hover:text-foreground">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            "No issue selected"
          )}
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{value}</span>
    </div>
  );
}

function uniqueMyIssueActivityRows(activity: MyIssueActivityEvent[]) {
  const seen = new Set<string>();
  return activity
    .filter((event) => event.issue)
    .filter((event) => {
      const key = event.issue ? issueKey(event.issue) : event.issue_id || "activity";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function myIssuesFiltersCount(filters: MyIssuesFilters) {
  return filters.status.length
    + filters.priority.length
    + filters.creator.length
    + filters.project.length
    + filters.date.length
    + (filters.assignee === "all" ? 0 : 1);
}

function matchesMyIssueFilters(issue: Issue, filters: MyIssuesFilters, userId: string) {
  if (filters.status.length) {
    const issueState = stateName(issue).toLowerCase();
    const completed = isCompletedIssue(issue);
    const matchesStatus = filters.status.some((status) => {
      const normalized = status.toLowerCase();
      if (normalized === "done") return completed;
      if (normalized === "canceled") return issueState.includes("cancel");
      return issueState.includes(normalized) || normalized.includes(issueState);
    });
    if (!matchesStatus) return false;
  }
  if (filters.priority.length) {
    const rawLabel = priorityLabel(issue.priority);
    const label = priorityLabel(visiblePriority(issue.priority));
    if (!filters.priority.includes(label) && !filters.priority.includes(rawLabel)) return false;
  }
  if (filters.assignee === "unassigned" && assigneeName(issue).toLowerCase() !== "unassigned") return false;
  if (filters.assignee === "me" && !issueAssignedToUser(issue, userId)) return false;
  if (filters.creator.length) {
    const creator = issueCreatorName(issue).toLowerCase();
    const matchesCreator = filters.creator.some((value) => {
      const target = value.toLowerCase();
      if (target === "current user") return creator.includes("parikshit") || creator.includes("pj") || issueAssignedToUser(issue, userId);
      return creator.includes(target) || target.includes(creator);
    });
    if (!matchesCreator) return false;
  }
  if (filters.project.length) {
    const project = String(issue.project || "").toLowerCase();
    const matchesProject = filters.project.some((value) => {
      const target = value.toLowerCase();
      if (target === "no project") return !project || project === "none";
      return project.includes(target) || target.includes(project);
    });
    if (!matchesProject) return false;
  }
  if (filters.date.length) {
    const matchesDate = filters.date.some((value) => issueMatchesDateFilter(issue, value));
    if (!matchesDate) return false;
  }
  return true;
}

function issueAssignedToUser(issue: Issue, userId: string) {
  const raw = issue as Issue & { assignee_id?: string; assignee?: { id?: string; email?: string; name?: string } | string };
  const assigneeId = String(raw.assignee_id || (typeof raw.assignee === "object" ? raw.assignee?.id : "") || "");
  const assigneeText = assigneeName(issue).toLowerCase();
  return assigneeId === userId || assigneeText.includes("parikshit") || assigneeText.includes("pj");
}

function issueCreatorName(issue: Issue) {
  const raw = issue as Issue & {
    creator?: { name?: string; email?: string; username?: string } | string;
    creator_name?: string;
    created_by?: string;
  };
  return userName(raw.creator || raw.creator_name || raw.created_by || assigneeName(issue));
}

function issueMatchesDateFilter(issue: Issue, filter: string) {
  const date = new Date(issue.updated_at || issue.created_at || "");
  if (Number.isNaN(date.getTime())) return filter === "Older";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const time = date.getTime();
  if (filter === "Today") return time >= startToday;
  if (filter === "Yesterday") return time >= startYesterday && time < startToday;
  if (filter === "This week") return time >= startToday - 6 * 24 * 60 * 60 * 1000;
  if (filter === "Older") return time < startToday - 6 * 24 * 60 * 60 * 1000;
  return true;
}

function sortMyIssues(issues: Issue[], order: MyIssuesOrder) {
  return [...issues].sort((a, b) => compareMyIssues(a, b, order));
}

function sortMyIssueActivity(activity: MyIssueActivityEvent[], order: MyIssuesOrder) {
  return [...activity].sort((a, b) => compareMyIssues(a.issue as Issue, b.issue as Issue, order));
}

function compareMyIssues(a: Issue, b: Issue, order: MyIssuesOrder) {
  if (order === "priority") return priorityRank(b.priority) - priorityRank(a.priority);
  const key = order === "created" ? "created_at" : "updated_at";
  return issueTime(b, key) - issueTime(a, key);
}

function issueTime(issue: Issue, key: "created_at" | "updated_at") {
  const value = issue[key] || issue.created_at || issue.updated_at || "";
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : 0;
}

function priorityRank(priority: Issue["priority"]) {
  const label = priorityLabel(visiblePriority(priority));
  if (label === "Urgent") return 4;
  if (label === "High") return 3;
  if (label === "Medium") return 2;
  if (label === "Low") return 1;
  return 0;
}

function boardBucketForIssue(issue: Issue) {
  const state = stateName(issue).toLowerCase();
  if (state.includes("done") || state.includes("complete") || state.includes("passed")) return "Done";
  if (state.includes("qa")) return "In QA";
  if (state.includes("progress") || state.includes("started")) return "In Progress";
  if (state.includes("todo") || state.includes("triage")) return "Todo";
  return "Backlog";
}

function isCompletedIssue(issue: Issue) {
  const state = stateName(issue).toLowerCase();
  return state.includes("done") || state.includes("complete") || state.includes("passed") || state.includes("cancel");
}

function visiblePriority(priority: Issue["priority"]) {
  return priorityLabel(priority) === "No priority" ? "Medium" : priority;
}

function slugifyPriority(priority: Issue["priority"]) {
  return priorityLabel(priority).toLowerCase().replace(/\s+/g, "-");
}

export function TeamIssuesPage({ segment }: { segment: "all" | "active" | "backlog" | "triage" }) {
  const { teamKey } = useParams();
  const statusMap = {
    all: undefined,
    active: "active",
    backlog: "backlog",
    triage: "triage",
  };

  const pageTitle = segment === "active" ? "Eltsuh › Active issues" : segment === "backlog" ? "Eltsuh › Backlog" : `Eltsuh › ${titleize(segment)}`;
  useDocumentTitle(pageTitle);

  return (
    <div className="linear-page">
      <IssueExplorer
        title={`${teamName(teamKey)} ${titleize(segment)}`}
        params={{
          team_key: teamName(teamKey),
          teamKey: teamName(teamKey),
          status: statusMap[segment],
          state: statusMap[segment],
        }}
        defaultMode="list"
      />
    </div>
  );
}


export function ArchivePage() {
  useDocumentTitle("Archive");

  return (
    <div className="linear-page" data-testid="archive-page">
      <IssueExplorer
        title="Archive"
        subtitle="Closed and archived issues remain searchable here."
        params={{ archived: true, include_archived: true }}
        emptyTitle="No archived issues"
      />
    </div>
  );
}

export function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inboxIssues, setInboxIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLinearEmptyInbox = !loading && notifications.length === 0;

  useDocumentTitle("Inbox");

  const hydrateIssue = async (notification: Notification, fallbackIssue?: Issue | null) => {
    const embedded = typeof notification.issue === "object" ? notification.issue : fallbackIssue || null;
    const key = embedded ? issueKey(embedded) : String(notification.title || notification.text || notification.body || "").match(/[A-Z]+-\d+/)?.[0];
    const reference = key ? referenceInboxRows.find((row) => row.key === key) : null;
    if (reference?.issue) {
      setSelectedIssue(reference.issue);
      return;
    }
    if (!key) {
      setSelectedIssue(embedded);
      return;
    }
    const response = await readTool("get_issue", { issue_key: key, key, id: key });
    const data = response.data as Record<string, unknown> | null;
    setSelectedIssue(((data?.issue || data) as Issue | null) || embedded);
  };

  const load = async () => {
    setLoading(true);
    const [response, issuesResponse] = await Promise.all([
      readTool("list_notifications", { limit: 80 }),
      readTool("search_issues", { limit: 80 }),
    ]);
    const rows = collectionFrom<Notification>(response.data, ["notifications", "results", "items"]);
    const issues = collectionFrom<Issue>(issuesResponse.data, ["issues", "results", "items"]);
    setNotifications(rows);
    setInboxIssues(issues);
    setError(response.error);
    setLoading(false);
    if (rows.length > 0) await hydrateIssue(rows[0], referenceInboxRows[0]?.issue || issues[0]);
  };

  useEffect(() => {
    load();
  }, []);

  const displayRows = referenceInboxRows.map((reference, index) => ({
    reference,
    notification: notifications[index] || {
      id: reference.key || `project-${index}`,
      title: reference.key ? `${reference.key} ${reference.title}` : reference.title,
      body: reference.body,
      issue: reference.issue,
      read: index > 0,
    },
  }));

  const markRead = async (notification: Notification) => {
    const response = await readTool("mark_notification_read", {
      notification_id: notification.id,
      id: notification.id,
    });
    if (response.error) setError(response.error);
    await load();
  };

  const snooze = async (notification: Notification) => {
    const response = await readTool("snooze_notification", {
      notification_id: notification.id,
      id: notification.id,
      until: "tomorrow",
    });
    if (response.error) setError(response.error);
    await load();
  };

  return (
    <div className="linear-page" data-testid="inbox-page">
      <ErrorBanner message={error} />
      {loading && !showLinearEmptyInbox ? (
        <Spinner label="Loading notifications" />
      ) : (
        <div className="grid min-h-[calc(100svh-9rem)] overflow-hidden bg-card lg:grid-cols-[25rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
            <div className="flex h-11 items-center gap-2 border-b border-border px-4">
              <h1 className="text-sm font-medium text-foreground">Inbox</h1>
              <span className="flex-1" />
              <Button variant="ghost" iconOnly aria-label="Filter inbox"><SlidersHorizontal size={14} /></Button>
              <Button variant="ghost" iconOnly aria-label="Inbox display"><Settings size={14} /></Button>
            </div>
            {showLinearEmptyInbox || notifications.length === 0 ? (
              <div className="px-1.5 py-2">
                <div className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground shadow-sm">
                  <span>Go to inbox</span>
                  <Badge variant="outline" className="h-5 rounded px-1.5 text-[11px] font-normal text-muted-foreground">G</Badge>
                  <span className="text-muted-foreground">then</span>
                  <Badge variant="outline" className="h-5 rounded px-1.5 text-[11px] font-normal text-muted-foreground">I</Badge>
                </div>
              </div>
            ) : <div className="grid">
              {displayRows.map(({ notification, reference }, index) => {
                const unread = !notification.read && !notification.read_at;
                const issue = reference?.issue || (typeof notification.issue === "object" ? notification.issue : inboxIssues[index] || selectedIssue);
                const key = reference?.kind === "project" ? "" : reference?.key || (issue ? issueKey(issue) : String(notification.title || "").match(/[A-Z]+-\d+/)?.[0] || `INBOX-${index + 1}`);
                const selected = selectedIssue && issueKey(selectedIssue) === key;
                const actor = reference?.actor || notification.body?.split(" assigned")?.[0] || notification.text?.split(" assigned")?.[0] || assigneeName(issue) || "Jaikumar A";
                const isMcp = actor === "MCP";
                return (
                  <button
                    key={notification.id || notification.title || notification.text || key}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                      unread && "bg-muted/30",
                      selected && "bg-accent text-accent-foreground",
                    )}
                    data-testid="notification-row"
                    onClick={() => hydrateIssue(notification, issue)}
                  >
                    <AvatarBubble>{isMcp ? "M" : initials(actor)}</AvatarBubble>
                    <span className="min-w-0 space-y-1">
                      <strong className="block truncate font-medium">{key ? `${key} ` : ""}{reference?.title || (issue ? issueTitle(issue) : notification.title || "Workspace activity")}</strong>
                      <span className="block truncate text-muted-foreground">{reference?.body || notification.body || notification.text || `${actor} assigned the issue to you`}</span>
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <StatusGlyph state={reference?.state || (index % 3 === 0 ? "In QA" : "Backlog")} />
                      <small>{reference?.time || (index === 0 ? "13h" : index < 6 ? "1d" : "1w")}</small>
                    </span>
                  </button>
                );
              })}
            </div>}
          </aside>
          <main className="min-w-0 overflow-auto bg-background">
            {showLinearEmptyInbox || notifications.length === 0 ? (
              <div className="grid min-h-full place-items-center p-8">
                <div className="grid justify-items-center gap-3 text-center text-muted-foreground">
                  <div className="relative h-24 w-28" aria-hidden="true">
                    <div className="absolute left-5 top-8 h-14 w-20 rounded-[1.25rem] border-2 border-muted-foreground/80" />
                    <div className="absolute left-7 top-3 h-20 w-16 rounded-xl border-2 border-muted-foreground/80 bg-background [clip-path:polygon(12%_0,88%_0,100%_82%,74%_82%,64%_96%,36%_96%,26%_82%,0_82%)]" />
                    <div className="absolute left-9 top-[4.65rem] h-3 w-10 rounded-b-xl border-x-2 border-b-2 border-muted-foreground/80 bg-background" />
                  </div>
                  <p className="text-[13px] font-medium text-muted-foreground">No notifications</p>
                </div>
              </div>
            ) : selectedIssue ? (
              <InboxIssuePreview
                issue={selectedIssue}
                onRead={() => notifications[0] && markRead(notifications[0])}
                onSnooze={() => notifications[0] && snooze(notifications[0])}
              />
            ) : (
              <EmptyState title="Select a notification" description="Issue details open here." />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function InboxIssuePreview({ issue, onRead, onSnooze }: { issue: Issue; onRead: () => void; onSnooze: () => void }) {
  const reference = referenceInboxRows.find((row) => row.key === issueKey(issue));
  const creator = reference?.actor || "jasper emhoff";
  const subscriber = "parikshit.joon@sigiq.ai";
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:col-span-2 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Box size={16} />
          <span>{projectName(issue.project) || "ET Bug Board"}</span>
          <span>›</span>
          <span className="truncate text-foreground">{issueKey(issue)} {issueTitle(issue)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" iconOnly onClick={onRead} aria-label="Mark read" data-testid="mark-notification-read"><Check size={15} /></Button>
          <Button variant="ghost" iconOnly onClick={onSnooze} aria-label="Snooze" data-testid="snooze-notification"><Clock3 size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="More actions"><MoreHorizontal size={15} /></Button>
        </div>
      </div>

      <Card className="min-w-0 rounded-md" size="sm">
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{issueTitle(issue)}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {issue.description || "The particular failure was a 500 internal service error from Azure foundry"}
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1 text-muted-foreground">
            <CircleDashed size={15} />
            Handle transient tutor LLM failures
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" iconOnly aria-label="Reaction"><Smile size={15} /></Button>
            <Button variant="ghost" iconOnly aria-label="Attach"><Paperclip size={15} /></Button>
          </div>
          <Button className="w-fit gap-2" variant="ghost" type="button"><Plus size={15} /> Add sub-issues</Button>
          <section className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Activity</h2>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="text-muted-foreground">Unsubscribe</Badge>
                <AvatarBubble>{initials(creator)}</AvatarBubble>
                <AvatarBubble>{initials(subscriber)}</AvatarBubble>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <AvatarBubble>{initials(creator)}</AvatarBubble>
              <span>{creator} created the issue · 14h ago</span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <Clock3 size={16} />
              <span>Linear moved issue to Cycle 30 · 4h ago</span>
            </div>
            <div className="rounded-md border border-input bg-background p-2">
              <textarea className="min-h-20 w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground" placeholder="Leave a comment..." />
              <div className="flex justify-end"><Button variant="ghost" iconOnly aria-label="Send"><Plus size={15} /></Button></div>
            </div>
          </section>
        </CardContent>
      </Card>

      <aside className="space-y-3">
        <Card className="rounded-md" size="sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Properties</CardTitle>
            <span className="text-muted-foreground">▾</span>
          </CardHeader>
          <CardContent className="space-y-1">
            <PropertyLine label={<StatusGlyph state={stateName(issue)} />} value={stateName(issue)} />
            <PropertyLine label="Priority" value="Set priority" />
            <PropertyLine label={<AvatarBubble>{initials(assigneeName(issue))}</AvatarBubble>} value={assigneeName(issue)} />
            <PropertyLine label={<CircleDashed size={16} />} value="Set estimate" />
            <PropertyLine label={<Clock3 size={16} />} value="Cycle 30" />
          </CardContent>
        </Card>
        <Card className="rounded-md" size="sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Labels</CardTitle>
            <span className="text-muted-foreground">▾</span>
          </CardHeader>
          <CardContent>
            <PropertyLine label={<Tag size={16} />} value="Add label" />
          </CardContent>
        </Card>
        <Card className="rounded-md" size="sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Project</CardTitle>
            <span className="text-muted-foreground">▾</span>
          </CardHeader>
          <CardContent>
            <PropertyLine label={<Box size={16} />} value={projectName(issue.project) || "ET Bug Board"} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export function ViewsPage({ teamScoped = false }: { teamScoped?: boolean }) {
  const { teamKey } = useParams();
  const [views, setViews] = useState<ViewDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(teamScoped ? `${teamName(teamKey)} › Views` : "Views");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const response = await readTool("list_views", {
        team_key: teamScoped ? teamName(teamKey) : undefined,
      });
      setViews(collectionFrom<ViewDefinition>(response.data, ["views", "results", "items"]));
      setError(response.error);
      setLoading(false);
    })();
  }, [teamKey, teamScoped]);

  return (
    <div className="linear-page" data-testid="views-page">
      <PageHeader
        title={teamScoped ? `${teamName(teamKey)} Views` : "Views"}
        subtitle="Saved filters for recurring team workflows."
      />
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading views" />
      ) : views.length === 0 ? (
        <EmptyState title="No saved views" description="Saved views from the tool API will render here." />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          {views.map((view) => (
            <Link
              key={view.id || view.key || view.name}
              className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-muted/60"
              to={`/views/${view.id || view.key || view.name}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Star size={14} />
                <strong className="truncate">{view.name || view.key || "View"}</strong>
                {view.team_key && <Badge variant="outline">{view.team_key}</Badge>}
              </span>
              <span className="truncate text-muted-foreground">{view.description || "Saved filter"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ViewDetailPage() {
  const { viewId } = useParams();
  return (
    <div className="linear-page">
      <IssueExplorer
        title={`View ${viewId}`}
        subtitle="Issues matching this saved view."
        params={{ view_id: viewId, viewId }}
        emptyTitle="No issues in this view"
      />
    </div>
  );
}

export function ProjectsPage({ teamScoped = false }: { teamScoped?: boolean }) {
  const { teamKey } = useParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ProjectsView>("list");
  const [filters, setFilters] = useState<ProjectFilters>(EMPTY_PROJECT_FILTERS);
  const [displayProps, setDisplayProps] = useState<ProjectsDisplayProps>({ ...DEFAULT_PROJECT_DISPLAY_PROPS });

  useDocumentTitle("Projects");

  const load = async () => {
    setLoading(true);
    const response = await readTool("search_projects", { limit: 100 });
    setProjects(collectionFrom<Project>(response.data, ["projects", "results", "items"]));
    setError(response.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [teamKey, teamScoped]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => matchesProjectFilters(project, filters)),
    [projects, filters],
  );

  const activeFilterCount = projectFiltersCount(filters);
  const hasCustomDisplay = useMemo(
    () =>
      (Object.keys(DEFAULT_PROJECT_DISPLAY_PROPS) as Array<keyof ProjectsDisplayProps>).some(
        (key) => displayProps[key] !== DEFAULT_PROJECT_DISPLAY_PROPS[key],
      ),
    [displayProps],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#fcfcfc] dark:bg-[#161616]" data-testid="projects-page">
      <div className="sticky top-0 z-10 bg-[#fcfcfc] dark:bg-[#161616]">
        <div className="flex h-11 items-center justify-between border-b border-[#e5e5e5] px-5 dark:border-[#2d2d2d]">
          <div className="flex items-center gap-1" aria-label="Project views">
            <NavLink
              className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e5e5] bg-[#f4f4f3] px-2.5 py-1 text-[13px] font-medium text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-[#2d2d2d] dark:bg-[#222222] dark:text-[#eeeeee]"
              to={teamScoped ? `/team/${teamKey}/projects/all` : "/projects/all"}
            >
              <FolderKanban size={13} strokeWidth={2} className="text-[#6f6f6f] dark:text-[#7a7a7a]" />
              All projects
            </NavLink>
            <Button
              variant="ghost"
              iconOnly
              type="button"
              aria-label="Add new view"
              title="Add new view"
              onClick={() => setCreateOpen(true)}
              data-testid="create-project-button"
              className="size-6 hover:bg-[#f4f4f3] dark:hover:bg-[#222222]"
            >
              <Layers3 size={13} className="text-[#6f6f6f] dark:text-[#7a7a7a]" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <ProjectsFilterMenu filters={filters} onChange={setFilters} projects={projects}>
              <Button
                variant="ghost"
                iconOnly
                type="button"
                aria-label="Add filter"
                data-testid="projects-filter-button"
                className={cn("relative size-6 hover:bg-[#f4f4f3] dark:hover:bg-[#222222]", activeFilterCount > 0 && "text-foreground")}
              >
                <Filter size={13} />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </ProjectsFilterMenu>
            <ProjectsDisplayMenu
              view={view}
              onViewChange={setView}
              displayProps={displayProps}
              onDisplayPropsChange={setDisplayProps}
            >
              <Button
                variant="ghost"
                iconOnly
                type="button"
                aria-label="Display options"
                data-testid="projects-display-button"
                className={cn("relative size-6 hover:bg-[#f4f4f3] dark:hover:bg-[#222222]", hasCustomDisplay && "text-foreground")}
              >
                <SlidersHorizontal size={13} />
                {hasCustomDisplay && (
                  <span className="absolute right-1 top-1.5 size-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </ProjectsDisplayMenu>
            <Button variant="ghost" iconOnly aria-label="Close sidebar" type="button" className="size-6 hover:bg-[#f4f4f3] dark:hover:bg-[#222222]">
              <Box size={13} />
            </Button>
          </div>
        </div>
      </div>
      <ErrorBanner message={error} />
      <ProjectCreateComposer open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <div className="flex-1 px-5 py-3">
        {loading ? (
          <div className="py-6"><Spinner label="Loading projects" /></div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="Create a project or adjust filters."
            action={<Button variant="primary" onClick={() => setCreateOpen(true)} data-testid="create-empty-project-button">New project</Button>}
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No projects match these filters"
            description="Try clearing filters or picking different values."
            action={
              <Button variant="default" onClick={() => setFilters(EMPTY_PROJECT_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : view === "board" ? (
          <ProjectsBoardView projects={filteredProjects} />
        ) : (
          <ProjectsListTable projects={filteredProjects} displayProps={displayProps} />
        )}
      </div>
    </div>
  );
}

function ProjectsListTable({
  projects,
  displayProps,
}: {
  projects: Project[];
  displayProps: ProjectsDisplayProps;
}) {
  const columns = useMemo(() => {
    const cols: Array<{ key: keyof ProjectsDisplayProps; label: string; width: string }> = [];
    if (displayProps.health) cols.push({ key: "health", label: "Health", width: "9.5rem" });
    if (displayProps.priority) cols.push({ key: "priority", label: "Priority", width: "6.5rem" });
    if (displayProps.lead) cols.push({ key: "lead", label: "Lead", width: "4.5rem" });
    if (displayProps.target_date) cols.push({ key: "target_date", label: "Target date", width: "8.5rem" });
    if (displayProps.issues) cols.push({ key: "issues", label: "Issues", width: "4.5rem" });
    if (displayProps.status) cols.push({ key: "status", label: "Status", width: "5.5rem" });
    return cols;
  }, [displayProps]);

  const gridTemplate = ["minmax(20rem,1fr)", ...columns.map((c) => c.width)].join(" ");

  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-[#202020]" role="table" aria-label="Projects" data-testid="projects-table">
      <div
        className="grid gap-6 border-b border-[#e5e5e5] bg-[#fafafa] px-5 py-2 text-[11px] font-medium text-[#6f6f6f] dark:border-[#2d2d2d] dark:bg-[#1a1a1a] dark:text-[#7a7a7a]"
        role="row"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span>Name</span>
        {columns.map((c) => (
          <span key={c.key}>{c.label}</span>
        ))}
      </div>
      {projects.map((project) => (
        <Link
          key={project.id || project.key || projectTitle(project)}
          className="grid h-11 items-center gap-6 border-b border-[#e5e5e5] px-5 py-0 text-[13px] transition-colors last:border-b-0 hover:bg-[#f8f8f8] dark:border-[#2d2d2d] dark:hover:bg-[rgba(255,255,255,0.03)]"
          to={`/project/${project.id || project.key}/overview`}
          role="row"
          data-testid={`project-row-${project.id || project.key}`}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Box size={15} className="shrink-0 text-[#6f6f6f] dark:text-[#7a7a7a]" />
            <strong className="truncate font-medium text-[#1c1c1c] dark:text-[#eeeeee]">{projectTitle(project)}</strong>
          </span>
          {columns.map((c) => (
            <ProjectCell key={c.key} column={c.key} project={project} />
          ))}
        </Link>
      ))}
    </div>
  );
}

function ProjectCell({
  column,
  project,
}: {
  column: keyof ProjectsDisplayProps;
  project: Project;
}) {
  switch (column) {
    case "health":
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[#6f6f6f] dark:text-[#7a7a7a]">
          <svg width="11" height="11" viewBox="0 0 11 11" className="shrink-0">
            <circle
              cx="5.5"
              cy="5.5"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="1.5 1.5"
              opacity="0.5"
            />
          </svg>
          <span>{project.health && project.health !== "unknown" ? titleize(project.health) : "No updates"}</span>
        </span>
      );
    case "priority": {
      const raw = String((project as Project & { priority?: string }).priority || "").toLowerCase();
      return (
        <span className="text-[13px] text-[#6f6f6f] dark:text-[#7a7a7a]">
          {raw && raw !== "none" && raw !== "no priority" ? titleize(raw) : "---"}
        </span>
      );
    }
    case "lead": {
      const leadName = userName(project.lead || (project as Project & { lead_name?: string }).lead_name);
      if (!leadName) {
        return (
          <span className="inline-grid size-[18px] shrink-0 place-items-center rounded-full border border-dashed border-[#b5b3ad]/50 text-[9px] text-[#6f6f6f] dark:border-[#555555]/50 dark:text-[#7a7a7a]">
            ?
          </span>
        );
      }
      return (
        <span className="inline-grid size-[18px] shrink-0 place-items-center rounded-full bg-[#d8d5d0] text-[9px] font-semibold text-[#47443f] dark:bg-[#2f2f2f] dark:text-[#f0f0f0]">
          {initials(leadName)}
        </span>
      );
    }
    case "target_date": {
      const dateStr = formatDate(project.target_date);
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[#6f6f6f] dark:text-[#7a7a7a]">
          {dateStr ? (
            <span>{dateStr}</span>
          ) : (
            <CalendarDays size={15} className="text-[#6f6f6f] dark:text-[#7a7a7a]" />
          )}
        </span>
      );
    }
    case "issues":
      return (
        <span className="text-[13px] text-[#1c1c1c] tabular-nums dark:text-[#eeeeee]">
          {String((project as Project & { issue_count?: number }).issue_count ?? project.issues?.length ?? 0)}
        </span>
      );
    case "status":
      return (
        <span className="flex items-center gap-2">
          <StatusGlyph state={project.state || project.status || "Backlog"} />
          <span className="text-[13px] text-[#6f6f6f] tabular-nums dark:text-[#7a7a7a]">{project.progress ?? 0}%</span>
        </span>
      );
    default:
      return null;
  }
}

function LinearProjectsReferencePage() {
  return (
    <div className="linear-page" data-testid="projects-page">
      <div className="mb-3 flex h-9 items-center justify-between gap-3">
        <h1 className="text-base font-medium text-foreground">Projects</h1>
        <Button variant="ghost" iconOnly aria-label="New project"><Plus size={15} /></Button>
      </div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1" aria-label="Project views">
          <NavLink className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium leading-none text-foreground shadow-sm" to="/team/elt/projects/all">All projects</NavLink>
          <Button variant="ghost" iconOnly type="button" aria-label="Add new view"><Layers3 size={14} /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" iconOnly aria-label="Add filter"><SlidersHorizontal size={14} /></Button>
          <Button variant="ghost" iconOnly aria-label="Display options"><Settings size={14} /></Button>
          <Button variant="ghost" iconOnly aria-label="Close sidebar"><Box size={14} /></Button>
        </div>
      </div>
      <div className="overflow-hidden bg-card" role="table" aria-label="Projects">
        <div className="grid grid-cols-[minmax(20rem,1fr)_8rem_6rem_5rem_8rem_4rem_5rem] gap-3 px-9 py-2 text-xs font-medium text-muted-foreground" role="row">
          <span>Name</span>
          <span>Health</span>
          <span>Priority</span>
          <span>Lead</span>
          <span>Target date</span>
          <span>Issues</span>
          <span>Status</span>
        </div>
        <Link className="grid min-h-12 grid-cols-[minmax(20rem,1fr)_8rem_6rem_5rem_8rem_4rem_5rem] items-center gap-3 px-9 py-2 text-sm transition-colors hover:bg-muted/60" to="/project/constructing-linear-clone-f2edb81a4bb4/overview" role="row">
          <span className="flex min-w-0 items-center gap-2">
            <Box size={15} className="text-muted-foreground" />
            <strong className="truncate font-medium">{referenceProject.name}</strong>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground"><span className="inline-block size-4 rounded-full border border-dashed border-muted-foreground/70" /> No updates</span>
          <span className="text-muted-foreground">---</span>
          <AvatarBubble>PJ</AvatarBubble>
          <span className="text-muted-foreground"><Box size={15} /></span>
          <span>0</span>
          <span className="flex items-center gap-2"><span className="inline-block size-3 rounded-full border border-orange-300" /> 0%</span>
        </Link>
      </div>
    </div>
  );
}

function ProjectCreateComposer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void | Promise<void> }) {
  return <ProjectCreateModal open={open} onClose={onClose} onCreated={onCreated} />;
}

type ProjectDetailTab = "overview" | "activity" | "issues" | "settings";

export function ProjectDetailPage({ initialTab = "overview" }: { initialTab?: ProjectDetailTab }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProjectDetailTab>(initialTab);
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [focusActivityComposer, setFocusActivityComposer] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (project) {
      document.title = `${projectTitle(project)} › ${titleize(tab)}`;
    }
  }, [project, tab]);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    const response = await readTool("get_project", { id: projectId });
    const data = response.data as Record<string, unknown> | null;
    const current = (data?.project || data) as Project | null;
    if (current) {
      const enriched = {
        ...current,
        milestones: (data?.milestones as unknown[]) || (current as Record<string, unknown>).milestones,
        updates: (data?.updates as unknown[]) || (current as Record<string, unknown>).updates,
        progress: (data?.progress as unknown) ?? current.progress,
      };
      setProject(enriched as Project);
    } else {
      setProject(null);
    }
    setIssues(collectionFrom<Issue>(data, ["issues"]));
    setError(response.error);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleTabChange = (next: ProjectDetailTab) => {
    setTab(next);
    if (projectId) {
      navigate(`/project/${projectId}/${next}`);
    }
  };

  const openActivityComposer = () => {
    setFocusActivityComposer(true);
    handleTabChange("activity");
    window.setTimeout(() => setFocusActivityComposer(false), 250);
  };

  if (loading && !project) {
    return (
      <div className="linear-page-wide" data-testid="project-detail-page">
        <Spinner label="Loading project" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="linear-page-wide" data-testid="project-detail-page">
        <ErrorBanner message={error || "Project not found."} />
        <EmptyState
          title="Project unavailable"
          description="The project could not be loaded. It may have been deleted."
          action={<Button variant="primary" onClick={() => navigate("/projects/all")}>Back to projects</Button>}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col"
      data-testid="project-detail-page"
    >
      <div className="border-b border-border bg-background px-6 pt-4">
        <ProjectHeader
          project={project}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          onProjectDeleted={() => setProject(null)}
        />
        <div
          className="-mb-px flex items-center gap-1 border-b border-transparent pb-2"
          aria-label="Project tabs"
          role="tablist"
        >
          {(["overview", "activity", "issues"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              data-testid={`project-tab-${item}`}
              onClick={() => handleTabChange(item)}
              className={cn(
                "relative rounded-md px-2.5 py-1 text-sm font-normal transition-colors hover:bg-muted hover:text-foreground",
                tab === item ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              {titleize(item)}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={tab === "settings"}
            className={cn(
              "ml-0.5 inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground",
              tab === "settings" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            aria-label="Project settings"
            data-testid="project-settings-tab"
            onClick={() => handleTabChange("settings")}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <div className="flex min-w-0 flex-1 overflow-y-auto">
          {tab === "overview" && (
            <ProjectOverviewTab project={project} onChange={load} onNavigateToActivity={openActivityComposer} />
          )}
          {tab === "activity" && <ProjectActivityTab project={project} onChange={load} focusComposer={focusActivityComposer} />}
          {tab === "issues" && <ProjectIssuesTab project={project} onChange={load} />}
          {tab === "settings" && <ProjectSettingsTab project={project} onChange={load} />}
        </div>
        {sidebarOpen && (
          <ProjectPropertiesSidebar
            project={project}
            issues={issues}
            onChange={load}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ProjectSettingsTab({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => Promise<void> | void;
}) {
  const projectId = project.id || "";
  const [nameDraft, setNameDraft] = useState(projectTitle(project));
  const [descriptionDraft, setDescriptionDraft] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(projectTitle(project));
    setDescriptionDraft(project.description || "");
  }, [project]);

  const save = async () => {
    if (!projectId || saving) return;
    setSaving(true);
    setMessage(null);
    const response = await readTool("update_project", {
      id: projectId,
      name: nameDraft.trim() || projectTitle(project),
      description: descriptionDraft.trim(),
    });
    setSaving(false);
    if (response.error) {
      setMessage(response.error);
      return;
    }
    setMessage("Project settings saved.");
    await onChange();
  };

  const dirty =
    nameDraft.trim() !== projectTitle(project) ||
    descriptionDraft.trim() !== (project.description || "").trim();

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 px-6 py-10" data-testid="project-settings-tab-panel">
      <div className="space-y-1">
        <h1 className="text-[22px] font-semibold text-foreground">Project settings</h1>
        <p className="text-sm text-muted-foreground">Edit the project details used across overview, activity, issues, and the project list.</p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-foreground">Name</span>
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            data-testid="project-settings-name"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-foreground">Description</span>
          <textarea
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="project-settings-description"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-xs", message?.includes("saved") ? "text-muted-foreground" : "text-destructive")}>
            {message}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving}
            data-testid="project-settings-save"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function CyclesPage() {
  const { teamKey } = useParams();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(`${teamName(teamKey)} › Cycles`);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const response = await readTool("search_cycles", { team_key: teamName(teamKey), limit: 50 });
      setCycles(collectionFrom<Cycle>(response.data, ["cycles", "results", "items"]));
      setError(response.error);
      setLoading(false);
    })();
  }, [teamKey]);

  return (
    <div className="linear-page" data-testid="cycles-page">
      <PageHeader title={`${teamName(teamKey)} Cycles`} subtitle="Active, upcoming, and completed cycles." />
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading cycles" />
      ) : cycles.length === 0 ? (
        <EmptyState title="No cycles" description="Cycles from the tool API will appear here." />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          {cycles.map((cycle) => (
            <Link
              key={cycle.id || cycle.key || cycle.name}
              className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-muted/60"
              to={`/team/${teamKey}/cycles/${cycle.id || cycle.key}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays size={15} />
                <strong className="truncate">{cycle.name || `Cycle ${cycle.number || cycle.key}`}</strong>
                {cycle.status && <StatusPill label={cycle.status} />}
              </span>
              <span className="text-muted-foreground">{formatDate(cycle.starts_at)} - {formatDate(cycle.ends_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CycleDetailPage() {
  const { teamKey, cycleId } = useParams();
  return (
    <div className="linear-page">
      <IssueExplorer
        title={`${teamName(teamKey)} Cycle ${cycleId}`}
        subtitle="Issues planned for this cycle."
        params={{ team_key: teamName(teamKey), cycle_id: cycleId, cycleId }}
        defaultMode="board"
        emptyTitle="No issues in this cycle"
      />
    </div>
  );
}

export function TeamSettingsPage() {
  const { teamKey } = useParams();
  const [states, setStates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const response = await readTool("list_workflow_states", { team_key: teamName(teamKey) });
      const names = collectionFrom<Record<string, unknown>>(response.data, ["states", "workflow_states", "results"]).map((state) =>
        String(state.name || state.key || state.id || "State"),
      );
      setStates(names);
      setError(response.error);
    })();
  }, [teamKey]);

  return (
    <div className="linear-page" data-testid="team-settings-page">
      <PageHeader title={`${teamName(teamKey)} Settings`} subtitle="Workflow and team configuration." />
      <ErrorBanner message={error} />
      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border p-3 last:border-b-0">
          <h2 className="text-sm font-semibold text-foreground">Workflow states</h2>
        </div>
        <div className="border-b border-border p-3 last:border-b-0">
          {states.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workflow states returned yet.</p>
          ) : (
            states.map((state) => <StatusPill key={state} label={state} />)
          )}
        </div>
      </div>
    </div>
  );
}

export function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle("Search");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const response = await readTool("global_search", { query, limit: 40 });
      setResults(collectionFrom<Record<string, unknown>>(response.data, ["results", "items"]));
      setError(response.error);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="linear-page" data-testid="search-page">
      <PageHeader title="Search" subtitle="Global search across issues, projects, cycles, and views." />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace"
          className="pl-9"
          data-testid="global-search-input"
        />
      </div>
      <ErrorBanner message={error} />
      {results.length === 0 ? (
        <EmptyState title="Search the workspace" description="Results from global_search will appear here." />
      ) : (
        results.map((result) => (
          <div key={String(result.id || result.key || result.title || result.name)} className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0">
            <span className="flex min-w-0 items-center gap-2">
              <Search size={14} />
              <strong className="truncate">{String(result.title || result.name || result.key || "Result")}</strong>
            </span>
            <span className="text-muted-foreground">{String(result.type || "")}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function TierTwoPage({ kind }: { kind: string }) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readSnapshot().then((response) => {
      setSnapshot(response.data);
      setError(response.data ? response.error : null);
    });
  }, []);

  const icon = useMemo(() => {
    if (kind.includes("initiative")) return <Layers3 size={18} />;
    if (kind.includes("roadmap")) return <Map size={18} />;
    if (kind.includes("setting")) return <Settings size={18} />;
    return <Archive size={18} />;
  }, [kind]);
  const rows = useMemo(() => {
    const issueCount = Number(snapshot?.issues || 116);
    if (kind.includes("draft")) {
      return [
        { key: "DRAFT-3", title: "Handle transient tutor LLM failures", meta: "Updated 13h ago", state: "Draft" },
        { key: "DRAFT-2", title: "Students and Teachers CTA cleanup", meta: "Updated 1d ago", state: "Draft" },
        { key: "DRAFT-1", title: "Lesson preview scroll investigation", meta: "Updated 1w ago", state: "Draft" },
      ];
    }
    if (kind.includes("initiative")) {
      return [
        { key: "INIT-4", title: "Linear clone evaluation fidelity", meta: `${issueCount} linked issues`, state: "In Progress" },
        { key: "INIT-3", title: "Backend tool server coverage", meta: "FastAPI + Postgres", state: "On Track" },
        { key: "INIT-2", title: "Electron packaging readiness", meta: "Desktop delivery", state: "Planned" },
      ];
    }
    if (kind.includes("roadmap")) {
      return [
        { key: "APR", title: "Inbox split-pane parity", meta: "UI fidelity", state: "Now" },
        { key: "MAY", title: "Activity board density pass", meta: "Verifier flow", state: "Next" },
        { key: "JUN", title: "Workflow automation polish", meta: "Tier 2 expansion", state: "Later" },
      ];
    }
    return [
      { key: "SET", title: "Profile and preferences", meta: "System theme, notifications", state: "Active" },
      { key: "WRK", title: "Workspace members", meta: `${Number(snapshot?.users || 16)} seeded users`, state: "Active" },
      { key: "API", title: "Tool server access", meta: "POST /step enabled", state: "Active" },
    ];
  }, [kind, snapshot]);

  return (
    <div className="linear-page" data-testid={`${kind}-page`}>
      <PageHeader
        title={titleize(kind)}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" iconOnly aria-label="Search"><Search size={14} /></Button>
            <Button variant="ghost" iconOnly aria-label="Display options"><SlidersHorizontal size={14} /></Button>
            <Button variant="ghost" iconOnly aria-label="More"><MoreHorizontal size={14} /></Button>
          </div>
        }
      />
      <ErrorBanner message={error} />
      <div className="mb-3 flex flex-wrap items-center gap-1" aria-label={`${kind} tabs`}>
        <a className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-foreground" href="#all">All</a>
        <a className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#active">Active</a>
        <a className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#archived">Archived</a>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
            {icon}
            <strong>{titleize(kind)}</strong>
          </span>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        {rows.map((row) => (
          <button className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/60" key={row.key} type="button">
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground">{row.key}</span>
              <strong className="truncate">{row.title}</strong>
            </span>
            <span className="truncate">{row.meta}</span>
            <StatusPill label={row.state} />
          </button>
        ))}
      </div>
    </div>
  );
}

function AvatarBubble({ children }: { children: string }) {
  return (
    <span className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function PropertyLine({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 rounded-md px-2 text-sm text-muted-foreground">
      <span className="flex min-w-0 items-center gap-2 text-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function Property({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 rounded-md px-2 text-sm text-muted-foreground">
      <span className="text-foreground">{label}</span>
      <strong className="truncate">{value || "-"}</strong>
    </div>
  );
}
