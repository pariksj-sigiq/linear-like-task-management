import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  Clock3,
  FolderKanban,
  Layers3,
  Map,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Star,
} from "lucide-react";
import { collectionFrom, readSnapshot, readTool } from "../api";
import { IssueExplorer, MiniIssueLink, StatusPill } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, ModalShell, PageHeader, Spinner, TextAreaField, TextField } from "../components/ui";
import type { Cycle, Issue, Notification, Project, ProjectUpdate, ViewDefinition } from "../linearTypes";
import { formatDate, issueKey, issueTitle, projectTitle, titleize, userName } from "../linearTypes";

const teamName = (teamKey?: string) => (teamKey ? teamKey.toUpperCase() : "ENG");

export function HomePage() {
  return (
    <div className="page">
      <IssueExplorer
        title="My Issues"
        toolName="list_my_issues"
        emptyTitle="No assigned issues"
        defaultMode="board"
        showCreateAction={false}
        headerTabs={<MyIssuesTabs />}
      />
    </div>
  );
}

function MyIssuesTabs() {
  return (
    <div className="linear-tabs" aria-label="My issues sections">
      <a href="/my-issues/assigned">Assigned</a>
      <a href="/my-issues/created">Created</a>
      <a href="/my-issues/subscribed">Subscribed</a>
      <a href="/my-issues/activity" className="active">Activity</a>
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
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await readTool("list_notifications", { limit: 80 });
    setNotifications(collectionFrom<Notification>(response.data, ["notifications", "results", "items"]));
    setError(response.error);
    setLoading(false);
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
    <div className="page page-narrow" data-testid="inbox-page">
      <PageHeader title="Inbox" subtitle="Mentions, assignments, and project updates." />
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading notifications" />
      ) : notifications.length === 0 ? (
        <EmptyState title="Inbox zero" description="Notifications will appear here when something needs attention." />
      ) : (
        <div>
          {notifications.map((notification) => {
            const unread = !notification.read && !notification.read_at;
            const issue = typeof notification.issue === "object" ? notification.issue : null;
            return (
              <div
                key={notification.id || notification.title || notification.text}
                className={`notification-row ${unread ? "unread" : ""}`}
                data-testid="notification-row"
              >
                <button
                  onClick={() => issue && navigate(`/issue/${issueKey(issue)}`)}
                  style={{ border: 0, background: "transparent", color: "inherit", textAlign: "left", minWidth: 0 }}
                >
                  <div className="issue-title-cell">
                    <Bell size={14} />
                    <strong>{notification.title || notification.type || "Notification"}</strong>
                    <span className="issue-key">{formatDate(notification.created_at)}</span>
                  </div>
                  <div className="page-subtitle truncate">
                    {notification.body || notification.text || (issue ? issueTitle(issue) : "Workspace activity")}
                  </div>
                </button>
                <div className="topbar-actions">
                  <Button onClick={() => markRead(notification)} data-testid="mark-notification-read">
                    <Check size={14} />
                    Read
                  </Button>
                  <Button onClick={() => snooze(notification)} data-testid="snooze-notification">
                    <Clock3 size={14} />
                    Snooze
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className="page page-narrow" data-testid="projects-page">
      <PageHeader
        title={teamScoped ? `${teamName(teamKey)} Projects` : "Projects"}
        subtitle="Project status, ownership, and issue progress."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} data-testid="create-project-button">
            <Plus size={14} />
            New project
          </Button>
        }
      />
      <ErrorBanner message={error} />
      {loading ? (
        <Spinner label="Loading projects" />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects found" description="Create a project or adjust filters." />
      ) : (
        <div>
          {projects.map((project) => (
            <Link key={project.id || project.key || projectTitle(project)} className="project-row" to={`/projects/${project.id || project.key}`}>
              <span>
                <span className="issue-title-cell">
                  <FolderKanban size={15} />
                  <strong>{projectTitle(project)}</strong>
                  {project.status && <StatusPill label={project.status} />}
                </span>
                <span className="page-subtitle truncate">{project.description || "No description"}</span>
              </span>
              <span className="issue-key">{formatDate(project.updated_at || project.target_date)}</span>
            </Link>
          ))}
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
  const humanReadable = typeof snapshot?.human_readable === "string" ? snapshot.human_readable : "";

  return (
    <div className="page page-narrow" data-testid={`${kind}-page`}>
      <PageHeader title={titleize(kind)} subtitle="Tier 2 surface stubbed without a 404." />
      <ErrorBanner message={error} />
      <div className="panel">
        <div className="panel-section issue-title-cell">
          {icon}
          <strong>{titleize(kind)}</strong>
        </div>
        <div className="panel-section">
          <p className="page-subtitle">
            This route is wired into the workspace shell and ready for backend expansion.
          </p>
          {humanReadable && (
            <pre
              style={{
                marginTop: 12,
                whiteSpace: "pre-wrap",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              {humanReadable}
            </pre>
          )}
        </div>
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
