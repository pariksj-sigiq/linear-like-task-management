import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collectionFrom, readTool } from "../api";
import type { LinearUser, Project, Team } from "../linearTypes";
import { issueKey, projectTitle, userName } from "../linearTypes";
import { Button, ErrorBanner, ModalShell } from "./ui";

export function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("ENG");
  const [status, setStatus] = useState("Backlog");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      readTool("list_teams"),
      readTool("search_projects", { limit: 50 }),
      readTool("search_users", { limit: 50 }),
    ]).then(([teamResponse, projectResponse, userResponse]) => {
      setTeams(collectionFrom<Team>(teamResponse.data, ["teams", "results"]));
      setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
      setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("Backlog");
    setPriority("");
    setProjectId("");
    setAssigneeId("");
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Issue title is required.");
      return;
    }
    setSubmitting(true);
    const response = await readTool("create_issue", {
      title: title.trim(),
      name: title.trim(),
      description: description.trim(),
      team_key: team,
      teamKey: team,
      state: status,
      status,
      priority: priority || undefined,
      project_id: projectId,
      assignee_id: assigneeId,
    });
    setSubmitting(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const data = response.data as Record<string, unknown> | null;
    const issue = (data?.issue || data) as Parameters<typeof issueKey>[0];
    reset();
    onClose();
    if (issue) navigate(`/issue/${issueKey(issue)}`);
  };

  return (
    <ModalShell
      title="Create issue"
      onClose={onClose}
      testId="quick-create-modal"
      footer={
        <>
          <label className="create-more-toggle">
            <input type="checkbox" />
            <span>Create more</span>
          </label>
          <div className="topbar-actions">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="quick-create-form" variant="primary" disabled={submitting} data-testid="create-issue-submit">
              {submitting ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </>
      }
    >
      <form id="quick-create-form" className="create-issue-form" onSubmit={submit}>
        <div className="create-issue-topline">
          <button type="button">Set team</button>
          <span>›</span>
          <button type="button">No template</button>
        </div>
        <ErrorBanner message={error} />
        <input
          className="create-title-input"
          aria-label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Issue title"
          data-testid="create-issue-title"
          autoFocus
        />
        <textarea
          className="create-description-input"
          aria-label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add details, context, or acceptance criteria"
          data-testid="create-issue-description"
        />
        <div className="quick-suggestions">
          <button type="button">Quick suggestions</button>
          <button type="button">Assign to me</button>
        </div>
        <div className="create-properties">
          <label className="property-chip">
            <span>Team</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)} data-testid="create-issue-team">
            {teams.length === 0 && (
              <>
                <option value="ENG">ENG</option>
                <option value="DES">DES</option>
                <option value="OPS">OPS</option>
              </>
            )}
            {teams.map((item) => (
              <option key={item.id || item.key || item.name} value={item.key || item.id || item.name}>
                {item.key || item.name}
              </option>
            ))}
            </select>
          </label>
          <label className="property-chip">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} data-testid="create-issue-status">
              <option value="Backlog">Backlog</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
            </select>
          </label>
          <label className="property-chip">
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} data-testid="create-issue-priority">
              <option value="">Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="property-chip">
            <span>Assignee</span>
            <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} data-testid="create-issue-assignee">
              <option value="">Assignee</option>
              {users.map((user) => (
                <option key={user.id || user.email || userName(user)} value={user.id || user.username || userName(user)}>
                  {userName(user)}
                </option>
              ))}
            </select>
          </label>
          <label className="property-chip property-chip-wide">
            <span>Project</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} data-testid="create-issue-project">
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id || project.key || projectTitle(project)} value={project.id || project.key || projectTitle(project)}>
                {projectTitle(project)}
              </option>
            ))}
            </select>
          </label>
          <button className="property-chip" type="button">Estimate</button>
          <button className="property-chip" type="button">Labels</button>
          <button className="property-chip" type="button">Cycle</button>
        </div>
      </form>
    </ModalShell>
  );
}
