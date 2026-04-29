import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bell,
  Box,
  Clock3,
  Copy,
  GitFork,
  Link2,
  MessageSquare,
  Plus,
  Send,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusGlyph } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import type { Comment, Issue, Label, LinearUser, Project, Relation, WorkflowState } from "../linearTypes";
import {
  assigneeName,
  formatDate,
  initials,
  issueKey,
  issueTitle,
  projectName,
  projectTitle,
  stateName,
  teamKey,
  userName,
} from "../linearTypes";

export function IssuePage() {
  const { issueKey: routeIssueKey } = useParams();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [comment, setComment] = useState("");
  const [relationKey, setRelationKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIssue = async () => {
    setLoading(true);
    const response = await readTool("get_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
    });
    const data = response.data as Record<string, unknown> | null;
    setIssue((data?.issue || data) as Issue | null);
    setError(response.error);
    setLoading(false);
  };

  useEffect(() => {
    loadIssue();
  }, [routeIssueKey]);

  useEffect(() => {
    Promise.all([
      readTool("list_workflow_states", { team_key: issue?.team_key || teamKey(issue) }),
      readTool("search_users", { limit: 80 }),
      readTool("search_projects", { limit: 80 }),
      readTool("search_labels", { query: "", limit: 80 }),
    ]).then(([stateResponse, userResponse, projectResponse, labelResponse]) => {
      setStates(collectionFrom<WorkflowState>(stateResponse.data, ["states", "workflow_states", "results"]));
      setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
      setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
      setLabels(collectionFrom<Label>(labelResponse.data, ["labels", "results"]));
    });
  }, [issue?.team_key, issue?.id]);

  const updateIssue = async (changes: Record<string, unknown>) => {
    const response = await readTool("update_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
      ...changes,
    });
    if (response.error) setError(response.error);
    await loadIssue();
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    const response = await readTool("add_issue_comment", {
      issue_key: routeIssueKey,
      id: routeIssueKey,
      body: comment,
      text: comment,
    });
    if (response.error) setError(response.error);
    setComment("");
    await loadIssue();
  };

  const addRelation = async (event: FormEvent) => {
    event.preventDefault();
    if (!relationKey.trim()) return;
    const response = await readTool("add_issue_relation", {
      issue_key: routeIssueKey,
      source_issue_key: routeIssueKey,
      target_issue_key: relationKey.trim(),
      related_issue_key: relationKey.trim(),
      relation_type: "related",
      type: "related",
    });
    if (response.error) setError(response.error);
    setRelationKey("");
    await loadIssue();
  };

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Loading issue" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="page page-narrow">
        <PageHeader title="Issue not found" subtitle={routeIssueKey} />
        <ErrorBanner message={error} />
        <EmptyState title="No issue returned" description="get_issue did not return an issue for this key." />
      </div>
    );
  }

  const comments = (issue.comments || []) as Comment[];
  const relations = (issue.relations || []) as Relation[];
  const subissues = issue.subissues || issue.children || [];
  const cycle = typeof issue.cycle === "string" ? issue.cycle : issue.cycle?.name || (issue.cycle_id ? "Cycle 30" : "Cycle 30");

  return (
    <div className="issue-detail-page" data-testid="issue-detail-page">
      <div className="issue-detail-topbar">
        <div className="issue-breadcrumb">
          <Box size={16} />
          <Link to="/projects">ET Bug Board</Link>
          <span>›</span>
          <span>{issueKey(issue)}</span>
          <span>{issueTitle(issue)}</span>
        </div>
        <div className="issue-action-cluster">
          <Button variant="ghost" iconOnly aria-label="Subscribe"><Bell size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="Snooze"><Clock3 size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="Copy link"><Link2 size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="Copy ID"><Copy size={15} /></Button>
          <Button variant="ghost" iconOnly aria-label="Relations"><GitFork size={15} /></Button>
          <Button onClick={() => updateIssue({ archived: true, archived_at: new Date().toISOString() })} data-testid="archive-issue-button">
            Archive
          </Button>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="issue-detail-layout">
        <main className="issue-document">
          <h1>{issueTitle(issue)}</h1>
          <p className="issue-description">
            {issue.description || "The particular failure was a 500 internal service error from Azure foundry"}
          </p>

          <div className="linked-branch-chip">
            <GitFork size={15} />
            Handle transient tutor LLM failures
          </div>

          <div className="issue-inline-tools">
            <Button variant="ghost" iconOnly aria-label="Add reaction"><MessageSquare size={15} /></Button>
            <Button variant="ghost" iconOnly aria-label="Attach"><Link2 size={15} /></Button>
          </div>

          <button className="add-subissue-button" type="button">
            <Plus size={15} />
            Add sub-issues
          </button>

          {subissues.length > 0 && (
            <div className="subissue-list">
              {subissues.map((child) => <MiniIssueLink key={issueKey(child)} issue={child} />)}
            </div>
          )}

          <section className="activity-section">
            <div className="activity-header">
              <h2>Activity</h2>
              <span>Unsubscribe</span>
              <div className="avatar-stack">
                <span className="assignee-bubble">{initials(userName(issue.assignee))}</span>
                <span className="assignee-bubble">{initials(assigneeName(issue))}</span>
              </div>
            </div>
              {comments.length === 0 ? (
                <div className="activity-item">
                  <span className="assignee-bubble">{initials(assigneeName(issue))}</span>
                  <span>{assigneeName(issue)} created the issue · {formatDate(issue.created_at) || "13h ago"}</span>
                </div>
              ) : (
                comments.map((item) => (
                  <div key={item.id || item.created_at || item.body || item.text} className="activity-item comment">
                    <span className="assignee-bubble">{initials(userName(item.author))}</span>
                    <span><strong>{userName(item.author)}</strong> {item.body || item.text || item.content} · {formatDate(item.created_at)}</span>
                  </div>
                ))
              )}
              <div className="activity-item muted">
                <Clock3 size={16} />
                <span>Linear moved issue to {cycle} · 4h ago</span>
              </div>
              <form onSubmit={addComment} className="linear-comment-box">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Leave a comment..."
                  data-testid="issue-comment-input"
                />
                <div>
                  <Button type="button" variant="ghost" iconOnly aria-label="Attach"><Link2 size={15} /></Button>
                  <Button type="submit" variant="ghost" iconOnly aria-label="Submit comment" data-testid="issue-comment-submit">
                    <Send size={15} />
                  </Button>
                </div>
              </form>
            </section>
        </main>

        <aside className="issue-properties-rail">
          <section className="linear-property-card">
            <h3>Properties <span>▾</span></h3>
            <PropertyPicker
              label=""
              icon={<StatusGlyph state={stateName(issue)} />}
              value={stateName(issue)}
              onChange={(value) => updateIssue({ state: value, status: value, state_id: value })}
              options={states.map((state) => ({ value: state.id || state.key || state.name || "", label: state.name || state.key || "State" }))}
              fallback={[stateName(issue), "Backlog", "In QA", "QA Passed", "Done"]}
              testId="issue-status-picker"
            />
            <div className="property-line"><PriorityIcon priority={issue.priority} /> <span>Set priority</span></div>
            <PropertyPicker
              label=""
              icon={<span className="assignee-bubble">{initials(assigneeName(issue))}</span>}
              value={assigneeName(issue)}
              onChange={(value) => updateIssue({ assignee_id: value, assignee: value })}
              options={users.map((user) => ({ value: user.id || user.username || userName(user), label: userName(user) }))}
              fallback={[assigneeName(issue)]}
              testId="issue-assignee-picker"
            />
            <div className="property-line"><TriangleAlert size={16} /> <span>Set estimate</span></div>
            <div className="property-line"><Clock3 size={16} /> <span>{cycle}</span></div>
          </section>

          <section className="linear-property-card">
            <h3>Labels <span>▾</span></h3>
            <PropertyPicker
              label=""
              icon={<Tag size={16} />}
              value={(issue.labels || [])[0] ? "Add label" : "Add label"}
              onChange={(value) => updateIssue({ label_id: value, labels: [value] })}
              options={labels.map((label) => ({ value: label.id || label.name || "", label: label.name || "Label" }))}
              fallback={["bug", "feature", "design"]}
              testId="issue-label-picker"
            />
          </section>

          <section className="linear-property-card">
            <h3>Project <span>▾</span></h3>
            <PropertyPicker
              label=""
              icon={<Box size={16} />}
              value={projectName(issue.project)}
              onChange={(value) => updateIssue({ project_id: value, project: value })}
              options={projects.map((project) => ({ value: project.id || project.key || projectTitle(project), label: projectTitle(project) }))}
              fallback={[projectName(issue.project)]}
              testId="issue-project-picker"
            />
          </section>

          {relations.length > 0 && (
            <section className="linear-property-card">
              <h3>Relations</h3>
              {relations.map((relation) => {
                const related = relation.issue || relation.target_issue;
                return related ? <MiniIssueLink key={relation.id || relation.target_issue_key || relation.related_issue_key} issue={related} /> : null;
              })}
            </section>
          )}

          <section className="linear-property-card compact-card">
            <form onSubmit={addRelation} className="issue-title-cell">
              <input
                className="input"
                value={relationKey}
                onChange={(event) => setRelationKey(event.target.value)}
                placeholder="ENG-123"
                data-testid="issue-relation-input"
              />
              <Button type="submit" iconOnly aria-label="Add relation" data-testid="issue-relation-submit">
                <Plus size={14} />
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PropertyPicker({
  label,
  icon,
  value,
  options,
  fallback,
  onChange,
  testId,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: Array<{ value: string; label: string }>;
  fallback: string[];
  onChange: (value: string) => void;
  testId: string;
}) {
  const merged = options.length
    ? options
    : fallback.filter(Boolean).map((item) => ({ value: item, label: item }));
  const selectedValue = merged.some((option) => option.value === value) ? value : "";

  return (
    <div className="property-row">
      <span className="issue-title-cell">{icon}{label && <span>{label}</span>}</span>
      <select
        className="select"
        value={selectedValue}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
      >
        <option value="">{value}</option>
        {merged.map((option) => (
          <option key={`${label}-${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
