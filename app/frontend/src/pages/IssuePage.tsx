import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronDown,
  Clock3,
  Link2,
  Plus,
  Send,
  Tag,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusGlyph } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import type { Comment, Issue, Label, LinearUser, Project, WorkflowState } from "../linearTypes";
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
  const subissues = issue.subissues || issue.children || [];

  return (
    <div className="issue-detail-page" data-testid="issue-detail-page">
      <ErrorBanner message={error} />

      <div className="issue-detail-layout">
        <main className="issue-detail-main">
          <h1>{issueTitle(issue)}</h1>

          <p className="issue-description">
            {issue.description || "The particular failure was a 500 internal service error from Azure foundry"}
          </p>

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

        <aside className="issue-detail-sidebar">
          <div className="properties-panel">
            <div className="properties-header">
              <span>Properties</span>
              <ChevronDown size={16} className="properties-chevron" />
            </div>

            <div className="property-row" data-testid="issue-status-display">
              <span className="issue-title-cell">
                <StatusGlyph state={stateName(issue)} />
              </span>
              <span>{stateName(issue)}</span>
            </div>

            <div className="property-row" data-testid="issue-priority-display">
              <span className="issue-title-cell">
                <PriorityIcon priority={issue.priority} />
                <span>Priority</span>
              </span>
              <span>{issue.priority === 3 ? "Medium" : issue.priority === 1 ? "Urgent" : issue.priority === 2 ? "High" : issue.priority === 4 ? "Low" : "No priority"}</span>
            </div>

            <div className="property-row" data-testid="issue-assignee-display">
              <span className="issue-title-cell">
                <span className="assignee-bubble">{initials(assigneeName(issue))}</span>
                <span>Assignee</span>
              </span>
              <span>{assigneeName(issue)}</span>
            </div>

            <div className="labels-section">
              <div className="section-header">
                <span>Labels</span>
                <ChevronDown size={16} />
              </div>
              <button className="add-button" type="button" data-testid="issue-add-label">
                <Plus size={14} />
                Add label
              </button>
            </div>

            <div className="project-section">
              <div className="section-header">
                <span>Project</span>
                <ChevronDown size={16} />
              </div>
              <button className="add-button" type="button" data-testid="issue-add-project">
                <Plus size={14} />
                {projectName(issue.project) || "Add to project"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
