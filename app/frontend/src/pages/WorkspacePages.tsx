import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Bell,
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
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Tag,
} from "lucide-react";
import { collectionFrom, readSnapshot, readTool } from "../api";
import { IssueExplorer, MiniIssueLink, StatusGlyph, StatusPill } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, ModalShell, PageHeader, Spinner, TextAreaField, TextField } from "../components/ui";
import type { Cycle, Issue, Notification, Project, ProjectUpdate, ViewDefinition } from "../linearTypes";
import { assigneeName, formatDate, initials, issueKey, issueTitle, projectName, projectTitle, stateName, titleize, userName } from "../linearTypes";

const teamName = (teamKey?: string) => (teamKey ? teamKey.toUpperCase() : "ENG");
const PROJECT_COLUMNS = ["Backlog", "Planned", "In Progress", "QA Requested", "In QA", "Changes Requested", "QA Passed", "Completed"];

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
  return (
    <div className="page">
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
  return (
    <div className="linear-tabs" aria-label="My issues sections">
      <NavLink to="/my-issues/assigned">Assigned</NavLink>
      <NavLink to="/my-issues/created">Created</NavLink>
      <NavLink to="/my-issues/subscribed">Subscribed</NavLink>
      <NavLink to="/my-issues/activity">Activity</NavLink>
    </div>
  );
}

export function MyIssuesPage() {
  return (
    <div className="page">
      <IssueExplorer
        title="My issues"
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

export function TeamIssuesPage({ segment }: { segment: "all" | "active" | "backlog" | "triage" }) {
  const { teamKey } = useParams();
  const statusMap = {
    all: undefined,
    active: "active",
    backlog: "backlog",
    triage: "triage",
  };
  return (
    <div className="page">
      <IssueExplorer
        title={`${teamName(teamKey)} ${titleize(segment)}`}
        subtitle={`Team-scoped ${segment} work queue.`}
        params={{
          team_key: teamName(teamKey),
          teamKey: teamName(teamKey),
          status: statusMap[segment],
          state: statusMap[segment],
        }}
        defaultMode={segment === "active" ? "board" : "list"}
      />
    </div>
  );
}

export function ArchivePage() {
  return (
    <div className="page" data-testid="archive-page">
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

  const hydrateIssue = async (notification: Notification, fallbackIssue?: Issue | null) => {
    const embedded = typeof notification.issue === "object" ? notification.issue : fallbackIssue || null;
    const key = embedded ? issueKey(embedded) : String(notification.title || notification.text || notification.body || "").match(/[A-Z]+-\d+/)?.[0];
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
    if (rows.length > 0) await hydrateIssue(rows[0], issues[0]);
  };

  useEffect(() => {
    load();
  }, []);

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
    <div className="inbox-page" data-testid="inbox-page">
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading notifications" />
      ) : notifications.length === 0 ? (
        <EmptyState title="Inbox zero" description="Notifications will appear here when something needs attention." />
      ) : (
        <div className="inbox-split">
          <aside className="inbox-list-pane">
            <div className="inbox-pane-header">
              <h1>Inbox</h1>
              <span className="header-dots">•••</span>
              <span className="spacer" />
              <Button variant="ghost" iconOnly aria-label="Filter inbox"><SlidersHorizontal size={15} /></Button>
              <Button variant="ghost" iconOnly aria-label="Inbox display"><Settings size={15} /></Button>
            </div>
            <div className="inbox-notification-list">
              {notifications.map((notification, index) => {
                const unread = !notification.read && !notification.read_at;
                const issue = typeof notification.issue === "object" ? notification.issue : inboxIssues[index] || selectedIssue;
                const key = issue ? issueKey(issue) : String(notification.title || "").match(/[A-Z]+-\d+/)?.[0] || `INBOX-${index + 1}`;
                const selected = selectedIssue && issueKey(selectedIssue) === key;
                const actor = notification.body?.split(" assigned")?.[0] || notification.text?.split(" assigned")?.[0] || assigneeName(issue) || "Jaikumar A";
                return (
                  <button
                    key={notification.id || notification.title || notification.text || key}
                    className={`inbox-notification ${unread ? "unread" : ""} ${selected ? "selected" : ""}`}
                    data-testid="notification-row"
                    onClick={() => hydrateIssue(notification, issue)}
                  >
                    <span className="inbox-avatar">{initials(actor)}</span>
                    <span className="inbox-row-copy">
                      <strong>{key} {issue ? issueTitle(issue) : notification.title || "Workspace activity"}</strong>
                      <span>{notification.body || notification.text || `${actor} assigned the issue to you`}</span>
                    </span>
                    <span className="inbox-row-meta">
                      <StatusGlyph state={index % 3 === 0 ? "In QA" : "Backlog"} />
                      <small>{index === 0 ? "13h" : index < 6 ? "1d" : "1w"}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
          <main className="inbox-detail-pane">
            {selectedIssue ? (
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
  return (
    <div className="inbox-issue-preview">
      <div className="issue-detail-topbar inbox-issue-topbar">
        <div className="issue-breadcrumb">
          <Box size={16} />
          <span>{projectName(issue.project) || "ET Bug Board"}</span>
          <span>›</span>
          <span>{issueKey(issue)} {issueTitle(issue)}</span>
        </div>
        <div className="issue-action-cluster">
          <Button variant="ghost" iconOnly onClick={onRead} aria-label="Mark read" data-testid="mark-notification-read"><Check size={15} /></Button>
          <Button variant="ghost" iconOnly onClick={onSnooze} aria-label="Snooze" data-testid="snooze-notification"><Clock3 size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="More actions"><MoreHorizontal size={15} /></Button>
        </div>
      </div>
      <div className="issue-detail-layout inbox-detail-layout">
        <main className="issue-document">
          <h1>{issueTitle(issue)}</h1>
          <p className="issue-description">{issue.description || "The particular failure was a 500 internal service error from Azure foundry"}</p>
          <div className="linked-branch-chip"><CircleDashed size={15} /> Handle transient tutor LLM failures</div>
          <div className="issue-inline-tools">
            <Button variant="ghost" iconOnly aria-label="Reaction"><MessageSquare size={15} /></Button>
            <Button variant="ghost" iconOnly aria-label="Attach"><Bell size={15} /></Button>
          </div>
          <button className="add-subissue-button" type="button"><Plus size={15} /> Add sub-issues</button>
          <section className="activity-section">
            <div className="activity-header">
              <h2>Activity</h2>
              <span>Unsubscribe</span>
              <span className="assignee-bubble">{initials(assigneeName(issue))}</span>
            </div>
            <div className="activity-item"><span className="assignee-bubble">{initials(assigneeName(issue))}</span><span>{assigneeName(issue)} created the issue · 13h ago</span></div>
            <div className="activity-item muted"><Clock3 size={16} /><span>Linear moved issue to Cycle 30 · 4h ago</span></div>
            <div className="linear-comment-box">
              <textarea placeholder="Leave a comment..." />
              <div><Button variant="ghost" iconOnly aria-label="Send"><Plus size={15} /></Button></div>
            </div>
          </section>
        </main>
        <aside className="issue-properties-rail">
          <section className="linear-property-card">
            <h3>Properties <span>▾</span></h3>
            <div className="property-line"><StatusGlyph state={stateName(issue)} /> <span>{stateName(issue)}</span></div>
            <div className="property-line"><span>---</span> <span>Set priority</span></div>
            <div className="property-line"><span className="assignee-bubble">{initials(assigneeName(issue))}</span> <span>{assigneeName(issue)}</span></div>
            <div className="property-line"><CircleDashed size={16} /> <span>Set estimate</span></div>
            <div className="property-line"><Clock3 size={16} /> <span>Cycle 30</span></div>
          </section>
          <section className="linear-property-card"><h3>Labels <span>▾</span></h3><div className="property-line"><Tag size={16} /> <span>Add label</span></div></section>
          <section className="linear-property-card"><h3>Project <span>▾</span></h3><div className="property-line"><Box size={16} /> <span>{projectName(issue.project) || "ET Bug Board"}</span></div></section>
        </aside>
      </div>
    </div>
  );
}

export function ViewsPage({ teamScoped = false }: { teamScoped?: boolean }) {
  const { teamKey } = useParams();
  const [views, setViews] = useState<ViewDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="page page-narrow" data-testid="views-page">
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
        <div>
          {views.map((view) => (
            <Link key={view.id || view.key || view.name} className="project-row" to={`/views/${view.id || view.key || view.name}`}>
              <span className="issue-title-cell">
                <Star size={14} />
                <strong>{view.name || view.key || "View"}</strong>
                {view.team_key && <span className="pill">{view.team_key}</span>}
              </span>
              <span className="issue-key">{view.description || "Saved filter"}</span>
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
    <div className="page">
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

  return (
    <div className="page" data-testid="projects-page">
      <PageHeader
        title={teamScoped ? `${teamName(teamKey)} Projects` : "Projects"}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} data-testid="create-project-button">
            <Plus size={14} />
            New project
          </Button>
        }
      />
      <div className="linear-tabs project-view-tabs" aria-label="Project views">
        <NavLink to={teamScoped ? `/team/${teamKey}/projects` : "/projects"}>All projects</NavLink>
        <a className="active" href="#project-board">
          <FolderKanban size={13} />
          Kanban View
        </a>
      </div>
      <div className="toolbar projects-toolbar">
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
        <div className="board project-board" id="project-board" data-testid="projects-board">
          {PROJECT_COLUMNS.map((column) => {
            const columnProjects = projectsByColumn[column] || [];
            return (
              <section className="board-column" key={column} aria-label={`${column} projects`}>
                <div className="board-title">
                  <span className="issue-title-cell">
                    <span className={`status-dot status-${column.toLowerCase().replace(/\s+/g, "-")}`} />
                    {column}
                    <span className="board-count">{columnProjects.length}</span>
                  </span>
                  <span className="board-title-actions">
                    <button type="button" aria-label={`Create project in ${column}`} onClick={() => setCreateOpen(true)}>
                      <Plus size={13} />
                    </button>
                  </span>
                </div>
                {columnProjects.map((project) => (
                  <Link key={project.id || project.key || projectTitle(project)} className="issue-tile project-card" to={`/projects/${project.id || project.key}`}>
                    <span className="issue-title-cell project-card-title">
                      <FolderKanban size={14} />
                      <strong>{projectTitle(project)}</strong>
                    </span>
                    <span className="project-card-description">{project.description || "No description"}</span>
                    <span className="project-card-meta">
                      <StatusPill label={project.status || project.state || column} />
                      <span>{formatDate(project.updated_at || project.target_date)}</span>
                    </span>
                  </Link>
                ))}
                <button className="board-add-row" type="button" onClick={() => setCreateOpen(true)}>
                  <Plus size={13} />
                  Add new project
                </button>
              </section>
            );
          })}
        </div>
      )}
      <ProjectCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} teamKey={teamScoped ? teamName(teamKey) : undefined} />
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
        <div className="topbar-actions" style={{ marginLeft: "auto" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="project-create-form" variant="primary" disabled={submitting} data-testid="create-project-submit">
            {submitting ? "Creating..." : "Create project"}
          </Button>
        </div>
      }
    >
      <form id="project-create-form" className="field-stack" onSubmit={submit}>
        <ErrorBanner message={error} />
        <TextField label="Name" value={name} onChange={setName} placeholder="Project name" autoFocus testId="project-name-input" />
        <TextAreaField label="Description" value={description} onChange={setDescription} placeholder="What changes when this ships?" testId="project-description-input" />
      </form>
    </ModalShell>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [updateBody, setUpdateBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="page"><Spinner label="Loading project" /></div>;

  return (
    <div className="page" data-testid="project-detail-page">
      <PageHeader title={projectTitle(project)} subtitle={project?.description || `Project ${projectId}`} />
      <ErrorBanner message={error} />
      <div className="split">
        <section>
          <div className="panel">
            <div className="panel-section">
              <h2 className="page-title" style={{ fontSize: 15 }}>Issues</h2>
            </div>
            <div className="panel-section">
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
        <aside className="panel">
          <div className="panel-section property-grid">
            <Property label="Status" value={project?.status || project?.state || "Unknown"} />
            <Property label="Lead" value={userName(project?.lead)} />
            <Property label="Target" value={formatDate(project?.target_date)} />
          </div>
          <div className="panel-section">
            <h2 className="page-title" style={{ fontSize: 14, marginBottom: 10 }}>Updates</h2>
            {updates.map((update) => (
              <div key={update.id || update.created_at || update.body} className="comment">
                <div className="issue-title-cell" style={{ marginBottom: 5 }}>
                  <MessageSquare size={13} />
                  <strong>{userName(update.author)}</strong>
                  <span className="issue-key">{formatDate(update.created_at)}</span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>{update.body || update.text}</div>
              </div>
            ))}
            <form onSubmit={postUpdate} className="field-stack" style={{ marginTop: 10 }}>
              <textarea
                className="textarea"
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

export function CyclesPage() {
  const { teamKey } = useParams();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="page page-narrow" data-testid="cycles-page">
      <PageHeader title={`${teamName(teamKey)} Cycles`} subtitle="Active, upcoming, and completed cycles." />
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading cycles" />
      ) : cycles.length === 0 ? (
        <EmptyState title="No cycles" description="Cycles from the tool API will appear here." />
      ) : (
        <div>
          {cycles.map((cycle) => (
            <Link key={cycle.id || cycle.key || cycle.name} className="project-row" to={`/team/${teamKey}/cycles/${cycle.id || cycle.key}`}>
              <span className="issue-title-cell">
                <CalendarDays size={15} />
                <strong>{cycle.name || `Cycle ${cycle.number || cycle.key}`}</strong>
                {cycle.status && <StatusPill label={cycle.status} />}
              </span>
              <span className="issue-key">{formatDate(cycle.starts_at)} - {formatDate(cycle.ends_at)}</span>
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
    <div className="page">
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
    <div className="page page-narrow" data-testid="team-settings-page">
      <PageHeader title={`${teamName(teamKey)} Settings`} subtitle="Workflow and team configuration." />
      <ErrorBanner message={error} />
      <div className="panel">
        <div className="panel-section">
          <h2 className="page-title" style={{ fontSize: 15 }}>Workflow states</h2>
        </div>
        <div className="panel-section">
          {states.length === 0 ? (
            <p className="page-subtitle">No workflow states returned yet.</p>
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
    <div className="page page-narrow" data-testid="search-page">
      <PageHeader title="Search" subtitle="Global search across issues, projects, cycles, and views." />
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: "var(--text-muted)" }} />
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace"
          style={{ paddingLeft: 38 }}
          data-testid="global-search-input"
        />
      </div>
      <ErrorBanner message={error} />
      {results.length === 0 ? (
        <EmptyState title="Search the workspace" description="Results from global_search will appear here." />
      ) : (
        results.map((result) => (
          <div key={String(result.id || result.key || result.title || result.name)} className="project-row">
            <span className="issue-title-cell">
              <Search size={14} />
              <strong>{String(result.title || result.name || result.key || "Result")}</strong>
            </span>
            <span className="issue-key">{String(result.type || "")}</span>
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
    <div className="page page-narrow" data-testid={`${kind}-page`}>
      <PageHeader
        title={titleize(kind)}
        actions={
          <div className="topbar-actions">
            <Button variant="ghost" iconOnly aria-label="Search"><Search size={14} /></Button>
            <Button variant="ghost" iconOnly aria-label="Display options"><SlidersHorizontal size={14} /></Button>
            <Button variant="ghost" iconOnly aria-label="More"><MoreHorizontal size={14} /></Button>
          </div>
        }
      />
      <ErrorBanner message={error} />
      <div className="linear-tabs project-view-tabs" aria-label={`${kind} tabs`}>
        <a className="active" href="#all">All</a>
        <a href="#active">Active</a>
        <a href="#archived">Archived</a>
      </div>
      <div className="linear-list-surface">
        <div className="linear-list-header">
          <span className="issue-title-cell">
            {icon}
            <strong>{titleize(kind)}</strong>
          </span>
          <span>{rows.length}</span>
        </div>
        {rows.map((row) => (
          <button className="linear-list-row" key={row.key} type="button">
            <span className="issue-title-cell">
              <span className="issue-key">{row.key}</span>
              <strong>{row.title}</strong>
            </span>
            <span className="truncate">{row.meta}</span>
            <StatusPill label={row.state} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Property({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="property-row">
      <span>{label}</span>
      <strong className="truncate">{value || "-"}</strong>
    </div>
  );
}
