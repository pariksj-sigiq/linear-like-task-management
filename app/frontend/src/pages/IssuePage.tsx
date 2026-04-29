import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GitBranch,
  Link2,
  MessageSquare,
  Plus,
  Rows3,
  Tag,
  UserRound,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusPill } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, PageHeader, SelectField, Spinner, TextAreaField } from "../components/ui";
import type { Comment, Issue, Label, LinearUser, Project, Relation, WorkflowState } from "../linearTypes";
import {
  assigneeName,
  formatDate,
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

  return (
    <div className="page" data-testid="issue-detail-page">
      <PageHeader
        title={issueTitle(issue)}
        subtitle={`${issueKey(issue)} · ${teamKey(issue)} · Updated ${formatDate(issue.updated_at || issue.created_at)}`}
        actions={
          <Button onClick={() => updateIssue({ archived: true, archived_at: new Date().toISOString() })} data-testid="archive-issue-button">
            Archive
          </Button>
        }
      />
      <ErrorBanner message={error} />

      <div className="split">
        <section>
          <div className="panel">
            <div className="panel-section">
              <div className="issue-title-cell" style={{ marginBottom: 14 }}>
                <PriorityIcon priority={issue.priority} />
                <StatusPill label={stateName(issue)} />
                {(issue.labels || []).slice(0, 4).map((label) => (
                  <span className="pill" key={typeof label === "string" ? label : label.id || label.name}>
                    <Tag size={11} />
                    {typeof label === "string" ? label : label.name}
                  </span>
                ))}
              </div>
              <div style={{ color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {issue.description || "No description."}
              </div>
            </div>

            <div className="panel-section">
              <h2 className="page-title" style={{ fontSize: 15, marginBottom: 8 }}>
                Activity
              </h2>
              {comments.length === 0 ? (
                <p className="page-subtitle">No comments yet.</p>
              ) : (
                comments.map((item) => (
                  <div key={item.id || item.created_at || item.body || item.text} className="comment">
                    <div className="issue-title-cell" style={{ marginBottom: 5 }}>
                      <MessageSquare size={13} />
                      <strong>{userName(item.author)}</strong>
                      <span className="issue-key">{formatDate(item.created_at)}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {item.body || item.text || item.content}
                    </div>
                  </div>
                ))
              )}
              <form onSubmit={addComment} className="field-stack" style={{ marginTop: 12 }}>
                <TextAreaField
                  label="Comment"
                  value={comment}
                  onChange={setComment}
                  placeholder="Add a comment"
                  testId="issue-comment-input"
                />
                <Button type="submit" variant="primary" data-testid="issue-comment-submit">
                  Add comment
                </Button>
              </form>
            </div>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-section property-grid">
            <PropertyPicker
              label="Status"
              icon={<Rows3 size={14} />}
              value={stateName(issue)}
              onChange={(value) => updateIssue({ state: value, status: value, state_id: value })}
              options={states.map((state) => ({
                value: state.id || state.key || state.name || "",
                label: state.name || state.key || "State",
              }))}
              fallback={[stateName(issue), "Backlog", "In Progress", "Done"]}
              testId="issue-status-picker"
            />
            <PropertyPicker
              label="Assignee"
              icon={<UserRound size={14} />}
              value={assigneeName(issue)}
              onChange={(value) => updateIssue({ assignee_id: value, assignee: value })}
              options={users.map((user) => ({ value: user.id || user.username || userName(user), label: userName(user) }))}
              fallback={[assigneeName(issue)]}
              testId="issue-assignee-picker"
            />
            <PropertyPicker
              label="Project"
              icon={<GitBranch size={14} />}
              value={projectName(issue.project)}
              onChange={(value) => updateIssue({ project_id: value, project: value })}
              options={projects.map((project) => ({ value: project.id || project.key || projectTitle(project), label: projectTitle(project) }))}
              fallback={[projectName(issue.project)]}
              testId="issue-project-picker"
            />
            <PropertyPicker
              label="Label"
              icon={<Tag size={14} />}
              value="Add label"
              onChange={(value) => updateIssue({ label_id: value, labels: [value] })}
              options={labels.map((label) => ({ value: label.id || label.name || "", label: label.name || "Label" }))}
              fallback={["bug", "feature", "design"]}
              testId="issue-label-picker"
            />
          </div>

          <div className="panel-section">
            <h2 className="page-title" style={{ fontSize: 14, marginBottom: 10 }}>
              Relations
            </h2>
            {relations.length === 0 ? (
              <p className="page-subtitle">No relations.</p>
            ) : (
              relations.map((relation) => {
                const related = relation.issue || relation.target_issue;
                return related ? (
                  <MiniIssueLink key={relation.id || relation.target_issue_key || relation.related_issue_key} issue={related} />
                ) : (
                  <Link
                    key={relation.id || relation.target_issue_key || relation.related_issue_key}
                    to={`/issue/${relation.target_issue_key || relation.related_issue_key}`}
                    className="relation-row"
                  >
                    <span className="issue-title-cell">
                      <Link2 size={13} />
                      {relation.relation_type || relation.type || "related"}
                    </span>
                    <span className="issue-key">{relation.target_issue_key || relation.related_issue_key}</span>
                  </Link>
                );
              })
            )}
            <form onSubmit={addRelation} className="issue-title-cell" style={{ marginTop: 10 }}>
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
          </div>

          <div className="panel-section">
            <h2 className="page-title" style={{ fontSize: 14, marginBottom: 10 }}>
              Subissues
            </h2>
            {subissues.length === 0 ? (
              <p className="page-subtitle">No subissues.</p>
            ) : (
              subissues.map((child) => <MiniIssueLink key={issueKey(child)} issue={child} />)
            )}
          </div>
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
      <span className="issue-title-cell">
        {icon}
        {label}
      </span>
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
