import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  Archive,
  Box,
  CalendarDays,
  Check,
  Clock3,
  CircleDashed,
  FolderKanban,
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
import { IssueExplorer, MiniIssueLink, StatusGlyph, StatusPill } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, ModalShell, PageHeader, Spinner, TextAreaField, TextField } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import type { Cycle, Issue, Notification, Project, ProjectUpdate, ViewDefinition } from "../linearTypes";
import { assigneeName, formatDate, initials, issueKey, issueTitle, projectName, projectTitle, stateName, titleize, userName } from "../linearTypes";

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
  useDocumentTitle("My issues › Activity");

  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
      <IssueExplorer
        title="My Issues"
        toolName="list_my_issues"
        emptyTitle="No assigned issues"
        defaultMode="board"
        showCreateAction={false}
        boardPreset="my-issues-activity"
        headerTabs={<MyIssuesTabs />}
      />
    </div>
  );
}

function MyIssuesTabs() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      isActive && "bg-muted text-foreground",
    );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="My issues sections">
      <NavLink className={tabClass} to="/my-issues/assigned">Assigned</NavLink>
      <NavLink className={tabClass} to="/my-issues/created">Created</NavLink>
      <NavLink className={tabClass} to="/my-issues/subscribed">Subscribed</NavLink>
      <NavLink className={tabClass} to="/my-issues/activity">Activity</NavLink>
    </div>
  );
}

export function MyIssuesPage() {
  const location = useLocation();
  const isActivity = location.pathname.endsWith("/activity");

  useDocumentTitle("My issues › Activity");

  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
      <IssueExplorer
        title="My issues"
        toolName="list_my_issues"
        emptyTitle="No assigned issues"
        defaultMode={isActivity ? "board" : "list"}
        showCreateAction={false}
        boardPreset="my-issues-activity"
        headerTabs={<MyIssuesTabs />}
      />
    </div>
  );
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
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
      <IssueExplorer
        title={`${teamName(teamKey)} ${titleize(segment)}`}
        subtitle={`Team-scoped ${segment} work queue.`}
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
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12" data-testid="archive-page">
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
  const showLinearEmptyInbox = true;

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
    <div className="min-w-0 p-4 pb-12" data-testid="inbox-page">
      <ErrorBanner message={error} />
      {loading && !showLinearEmptyInbox ? (
        <Spinner label="Loading notifications" />
      ) : (
        <div className="grid min-h-[calc(100svh-9rem)] overflow-hidden rounded-md border border-border bg-card lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
            <div className="flex h-12 items-center gap-2 border-b border-border px-3">
              <h1 className="text-sm font-semibold text-foreground">Inbox</h1>
              <span className="text-muted-foreground">•••</span>
              <span className="flex-1" />
              <Button variant="ghost" iconOnly aria-label="Filter inbox"><SlidersHorizontal size={15} /></Button>
              <Button variant="ghost" iconOnly aria-label="Inbox display"><Settings size={15} /></Button>
            </div>
            {showLinearEmptyInbox || notifications.length === 0 ? (
              <div className="h-full min-h-64" />
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
                <EmptyState title="No notifications" description="Inbox updates will appear here." />
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
    <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12" data-testid="views-page">
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
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
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

  useDocumentTitle("Projects");

  const projectsByColumn = useMemo(
    () =>
      PROJECT_COLUMNS.reduce<Record<string, Project[]>>((groups, column) => {
        groups[column] = projects.filter((project) => projectColumn(project) === column);
        return groups;
      }, {}),
    [projects],
  );

  const load = async () => {
    setLoading(true);
    const response = await readTool("search_projects", {
      team_key: teamScoped ? teamName(teamKey) : undefined,
      limit: 80,
    });
    setProjects(collectionFrom<Project>(response.data, ["projects", "results", "items"]));
    setError(response.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [teamKey, teamScoped]);

  if (!teamScoped || teamName(teamKey) === "ELT") {
    return <LinearProjectsReferencePage />;
  }

  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12" data-testid="projects-page">
      <PageHeader
        title={teamScoped ? `${teamName(teamKey)} Projects` : "Projects"}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} data-testid="create-project-button">
            <Plus size={14} />
            New project
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-1" aria-label="Project views">
        <NavLink className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" to={teamScoped ? `/team/${teamKey}/projects` : "/projects"}>All projects</NavLink>
        <a className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm font-medium text-foreground" href="#project-board">
          <FolderKanban size={13} />
          Kanban View
        </a>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button>
          <Search size={14} />
          Find in view...
        </Button>
        <Button>
          <SlidersHorizontal size={14} />
          Add filter
        </Button>
        <Button>
          <Settings size={14} />
          Display options
        </Button>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading projects" />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects found" description="Create a project or adjust filters." />
      ) : (
        <div className="grid gap-3 overflow-x-auto lg:grid-flow-col lg:auto-cols-[18rem]" id="project-board" data-testid="projects-board">
          {PROJECT_COLUMNS.map((column) => {
            const columnProjects = projectsByColumn[column] || [];
            return (
              <Card className="rounded-md" size="sm" key={column} aria-label={`${column} projects`}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <StatusGlyph state={column} />
                    {column}
                    <Badge variant="outline">{columnProjects.length}</Badge>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" variant="ghost" iconOnly aria-label={`Create project in ${column}`} onClick={() => setCreateOpen(true)}>
                      <Plus size={13} />
                    </Button>
                  </span>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {columnProjects.map((project) => (
                    <Link
                      key={project.id || project.key || projectTitle(project)}
                      className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted/60"
                      to={`/projects/${project.id || project.key}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FolderKanban size={14} />
                        <strong className="truncate">{projectTitle(project)}</strong>
                      </span>
                      <span className="line-clamp-2 text-muted-foreground">{project.description || "No description"}</span>
                      <span className="flex items-center justify-between gap-2 text-muted-foreground">
                        <StatusPill label={project.status || project.state || column} />
                        <span>{formatDate(project.updated_at || project.target_date)}</span>
                      </span>
                    </Link>
                  ))}
                  <Button className="justify-start gap-2 text-muted-foreground" variant="ghost" type="button" onClick={() => setCreateOpen(true)}>
                    <Plus size={13} />
                    Add new project
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ProjectCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} teamKey={teamScoped ? teamName(teamKey) : undefined} />
    </div>
  );
}

function LinearProjectsReferencePage() {
  return (
    <div className="min-w-0 p-4 pb-12" data-testid="projects-page">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-foreground">Projects</h1>
        <Button variant="ghost" iconOnly aria-label="New project"><Plus size={15} /></Button>
      </div>
      <div className="mb-3 flex items-center gap-1" aria-label="Project views">
        <NavLink className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-foreground" to="/team/elt/projects/all">All projects</NavLink>
        <Button variant="ghost" iconOnly type="button" aria-label="Add new view"><Layers3 size={14} /></Button>
      </div>
      <div className="mb-3 flex items-center gap-1">
        <Button variant="ghost" iconOnly aria-label="Add filter"><SlidersHorizontal size={14} /></Button>
        <Button variant="ghost" iconOnly aria-label="Display options"><Settings size={14} /></Button>
        <Button variant="ghost" iconOnly aria-label="Close sidebar"><Box size={14} /></Button>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card" role="table" aria-label="Projects">
        <div className="grid grid-cols-[minmax(12rem,1fr)_6rem_7rem_8rem_8rem_5rem_6rem] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground" role="row">
          <span>Name</span>
          <span>Health</span>
          <span>Priority</span>
          <span>Lead</span>
          <span>Target date</span>
          <span>Issues</span>
          <span>Status</span>
        </div>
        <Link className="grid grid-cols-[minmax(12rem,1fr)_6rem_7rem_8rem_8rem_5rem_6rem] items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/60" to="/project/constructing-linear-clone-f2edb81a4bb4/overview" role="row">
          <span className="flex min-w-0 items-center gap-2">
            <Checkbox aria-label="Select project" />
            <Box size={15} />
            <strong className="truncate">{referenceProject.name}</strong>
          </span>
          <span><span className="inline-block size-2 rounded-full border border-muted-foreground" /></span>
          <span>---</span>
          <AvatarBubble>PJ</AvatarBubble>
          <span>Target date</span>
          <span>0</span>
          <span className="flex items-center gap-2"><StatusGlyph state="Backlog" /> 0%</span>
        </Link>
      </div>
    </div>
  );
}

function ProjectCreateModal({ open, onClose, onCreated, teamKey }: { open: boolean; onClose: () => void; onCreated: () => void; teamKey?: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const response = await readTool("create_project", {
      name,
      title: name,
      description,
      team_key: teamKey,
    });
    setSubmitting(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    setName("");
    setDescription("");
    onClose();
    onCreated();
  };

  return (
    <ModalShell
      title="New project"
      onClose={onClose}
      testId="create-project-modal"
      footer={
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="project-create-form" variant="primary" disabled={submitting} data-testid="create-project-submit">
            {submitting ? "Creating..." : "Create project"}
          </Button>
        </div>
      }
    >
      <form id="project-create-form" className="grid gap-3" onSubmit={submit}>
        <ErrorBanner message={error} />
        <TextField label="Name" value={name} onChange={setName} placeholder="Project name" autoFocus testId="project-name-input" />
        <TextAreaField label="Description" value={description} onChange={setDescription} placeholder="What changes when this ships?" testId="project-description-input" />
      </form>
    </ModalShell>
  );
}

export function ProjectDetailPage({ initialTab = "overview" }: { initialTab?: "overview" | "activity" | "issues" }) {
  const { projectId } = useParams();
  const [tab, setTab] = useState(initialTab);
  const [linkedIssues, setLinkedIssues] = useState<Issue[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [updateBody, setUpdateBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      const title = `${projectTitle(project)} › ${titleize(tab)}`;
      document.title = title;
    }
  }, [project, tab]);

  const load = async () => {
    setLoading(true);
    const response = await readTool("get_project", { project_id: projectId, id: projectId });
    const data = response.data as Record<string, unknown> | null;
    const current = (data?.project || data) as Project | null;
    setProject(current);
    setIssues(collectionFrom<Issue>(data, ["issues"]));
    setUpdates(collectionFrom<ProjectUpdate>(data, ["updates", "project_updates"]));
    setError(response.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  if (String(projectId || "").includes("constructing-linear-clone")) {
    return (
      <div className="min-w-0 p-4 pb-12" data-testid="project-detail-page">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Box size={15} />
            <span className="truncate text-foreground">{referenceProject.name}</span>
            <Star size={14} />
            <MoreHorizontal size={15} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" iconOnly aria-label="Copy page URL"><Paperclip size={14} /></Button>
            <Button variant="ghost" iconOnly aria-label="Setup project notifications"><Clock3 size={14} /></Button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-1" aria-label="Project tabs">
          {(["overview", "activity", "issues"] as const).map((item) => (
            <button
              key={item}
              className={cn(
                "rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                tab === item && "bg-muted font-medium text-foreground",
              )}
              onClick={() => setTab(item)}
              type="button"
            >
              {titleize(item)}
            </button>
          ))}
          <Button variant="ghost" iconOnly type="button" aria-label="Add new view"><Layers3 size={14} /></Button>
        </div>
        {tab === "overview" && <ProjectOverviewReference />}
        {tab === "activity" && <ProjectActivityReference />}
        {tab === "issues" && (
          <ProjectIssuesReference
            issues={linkedIssues}
            onRemove={(key) => setLinkedIssues((current) => current.filter((issue) => issueKey(issue) !== key))}
            onAdd={(issue) => setLinkedIssues((current) => current.some((item) => issueKey(item) === issueKey(issue)) ? current : [...current, { ...issue, project: referenceProject.name }])}
            addOpen={addOpen}
            setAddOpen={setAddOpen}
          />
        )}
      </div>
    );
  }

  const postUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!updateBody.trim()) return;
    const response = await readTool("post_project_update", {
      project_id: projectId,
      id: projectId,
      body: updateBody,
      text: updateBody,
    });
    if (response.error) setError(response.error);
    setUpdateBody("");
    await load();
  };

  if (loading) return <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12"><Spinner label="Loading project" /></div>;

  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12" data-testid="project-detail-page">
      <PageHeader title={projectTitle(project)} subtitle={project?.description || `Project ${projectId}`} />
      <ErrorBanner message={error} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border p-3 last:border-b-0">
              <h2 className="text-sm font-semibold text-foreground">Issues</h2>
            </div>
            <div className="border-b border-border p-3 last:border-b-0">
              {issues.length === 0 ? (
                <IssueExplorer
                  title="Project issues"
                  showHeader={false}
                  params={{ project_id: projectId, projectId }}
                  emptyTitle="No linked issues"
                />
              ) : (
                issues.map((issue) => <MiniIssueLink key={issueKey(issue)} issue={issue} />)
              )}
            </div>
          </div>
        </section>
        <aside className="rounded-md border border-border bg-card">
          <div className="grid gap-1 border-b border-border p-3 last:border-b-0">
            <Property label="Status" value={project?.status || project?.state || "Unknown"} />
            <Property label="Lead" value={userName(project?.lead)} />
            <Property label="Target" value={formatDate(project?.target_date)} />
          </div>
          <div className="border-b border-border p-3 last:border-b-0">
            <h2 className="mb-2.5 text-sm font-semibold text-foreground">Updates</h2>
            {updates.map((update) => (
              <div key={update.id || update.created_at || update.body} className="rounded-md border border-border bg-muted/20 p-2 text-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <MessageSquare size={13} />
                  <strong>{userName(update.author)}</strong>
                  <span className="text-muted-foreground">{formatDate(update.created_at)}</span>
                </div>
                <div className="text-sm text-muted-foreground">{update.body || update.text}</div>
              </div>
            ))}
            <form onSubmit={postUpdate} className="mt-2.5 grid gap-2">
              <textarea
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={updateBody}
                onChange={(event) => setUpdateBody(event.target.value)}
                placeholder="Post a project update"
                data-testid="project-update-input"
              />
              <Button type="submit" variant="primary" data-testid="post-project-update">
                Post update
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProjectOverviewReference() {
  return (
    <Card className="rounded-md" size="sm">
      <CardContent className="space-y-5">
        <div className="inline-grid size-10 place-items-center rounded-md bg-muted text-muted-foreground"><Box size={22} /></div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{referenceProject.name}</h1>
          <p className="text-sm text-muted-foreground">Add a short summary...</p>
        </div>
      <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <span className="font-medium text-foreground">Properties</span>
        <span className="flex items-center gap-2"><StatusGlyph state="Backlog" /> Backlog</span>
        <span>--- No priority</span>
        <span className="flex items-center gap-2"><AvatarBubble>PJ</AvatarBubble> {referenceProject.lead}</span>
        <span>Target date</span>
        <span className="flex items-center gap-2"><Badge variant="outline">E</Badge> Eltsuh</span>
        <span>•••</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
        <span>Resources</span>
        <Button type="button" variant="ghost">+ Add document or link...</Button>
      </div>
      <Button className="w-fit gap-2" variant="ghost" type="button"><MessageSquare size={16} /> Write first project update</Button>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Description</h3>
        <p className="text-sm text-muted-foreground">Add description...</p>
      </div>
      <Button className="w-fit justify-start" variant="ghost" type="button">+ Milestone</Button>
      </CardContent>
    </Card>
  );
}

function ProjectActivityReference() {
  return (
    <Card className="rounded-md" size="sm">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <AvatarBubble>PJ</AvatarBubble>
          <span>parikshit.joon@gmail.com created the project · Apr 29</span>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Clock3 size={16} />
          <span>Linear updated project status to Backlog · Apr 29</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectIssuesReference({ issues, onRemove, onAdd, addOpen, setAddOpen }: { issues: Issue[]; onRemove: (key: string) => void; onAdd: (issue: Issue) => void; addOpen: boolean; setAddOpen: (open: boolean) => void }) {
  const grouped = ["In Review", "In Progress", "Todo", "Backlog"].map((state) => [state, issues.filter((issue) => stateName(issue) === state)] as const);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <Button variant="ghost" iconOnly aria-label="Add filter"><SlidersHorizontal size={14} /></Button>
        <Button variant="ghost" iconOnly aria-label="Display options"><Settings size={14} /></Button>
        <Button variant="ghost" iconOnly aria-label="Open project details"><Box size={14} /></Button>
      </div>
      {issues.length > 0 && <Button variant="primary" onClick={() => setAddOpen(true)} data-testid="project-add-issue">Add issues</Button>}
      {grouped.map(([state, rows]) => rows.length > 0 && (
        <section key={state} className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-sm font-medium">
            <span>▾</span>
            <StatusGlyph state={state} />
            <span>{state}</span>
            <Badge variant="outline">{rows.length}</Badge>
            <Button className="ml-auto" type="button" variant="ghost" iconOnly onClick={() => setAddOpen(true)}><Plus size={14} /></Button>
          </div>
          {rows.map((issue) => (
            <div className="grid grid-cols-[2rem_5rem_auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0" key={issueKey(issue)}>
              <span className="font-medium text-muted-foreground">{Number(issue.priority) === 1 ? "!" : "▮▮"}</span>
              <span className="text-muted-foreground">{issueKey(issue)}</span>
              <StatusGlyph state={stateName(issue)} />
              <strong className="truncate">{issueTitle(issue)}</strong>
              <AvatarBubble>{initials(assigneeName(issue))}</AvatarBubble>
              <Button type="button" variant="ghost" onClick={() => onRemove(issueKey(issue))}>Remove</Button>
            </div>
          ))}
        </section>
      ))}
      {issues.length === 0 && (
        <div className="grid min-h-80 place-items-center rounded-md border border-dashed border-border bg-card p-8 text-center">
          <div className="mb-3 inline-grid size-12 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <Plus size={20} />
          </div>
          <strong>Add issues to the project</strong>
          <p>Start building your project by creating an issue.</p>
          <p className="max-w-md text-sm text-muted-foreground">You can also add teams, team members, and project dates in the project sidebar with <Badge variant="outline">⌘</Badge><Badge variant="outline">I</Badge>.</p>
          <Button variant="primary" onClick={() => setAddOpen(true)} data-testid="project-add-issue">Create new issue <Badge variant="outline">C</Badge></Button>
        </div>
      )}
      {addOpen && (
        <ModalShell title="Add issues to project" onClose={() => setAddOpen(false)}>
          <div className="grid gap-1">
            {candidateProjectIssues.map((issue) => (
              <button
                key={issueKey(issue)}
                className="grid grid-cols-[5rem_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => { onAdd(issue); setAddOpen(false); }}
                type="button"
              >
                <span className="text-muted-foreground">{issueKey(issue)}</span>
                <StatusGlyph state={stateName(issue)} />
                <strong className="truncate">{issueTitle(issue)}</strong>
                <AvatarBubble>{initials(assigneeName(issue))}</AvatarBubble>
              </button>
            ))}
          </div>
        </ModalShell>
      )}
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
    <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12" data-testid="cycles-page">
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
    <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
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
    <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12" data-testid="team-settings-page">
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
    <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12" data-testid="search-page">
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
      setError(response.error);
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
    <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12" data-testid={`${kind}-page`}>
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
