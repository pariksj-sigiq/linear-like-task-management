import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collectionFrom, readTool } from "../api";
import type { LinearUser, Project, Team } from "../linearTypes";
import { issueKey, projectTitle, userName } from "../linearTypes";
import { Button, ErrorBanner, ModalShell, SelectField, TextAreaField, TextField } from "./ui";

export function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("ENG");
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
      title="New issue"
      onClose={onClose}
      testId="quick-create-modal"
      footer={
        <>
          <span className="page-subtitle">Press C anywhere to open this composer.</span>
          <div className="topbar-actions">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="quick-create-form" variant="primary" disabled={submitting} data-testid="create-issue-submit">
              {submitting ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </>
      }
    >
      <form id="quick-create-form" className="field-stack" onSubmit={submit}>
        <ErrorBanner message={error} />
        <TextField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Issue title"
          testId="create-issue-title"
          autoFocus
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add details, context, or acceptance criteria"
          testId="create-issue-description"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <SelectField label="Team" value={team} onChange={(event) => setTeam(event.target.value)} data-testid="create-issue-team">
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
          </SelectField>
          <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} data-testid="create-issue-project">
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id || project.key || projectTitle(project)} value={project.id || project.key || projectTitle(project)}>
                {projectTitle(project)}
              </option>
            ))}
          </SelectField>
          <SelectField label="Assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} data-testid="create-issue-assignee">
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id || user.email || userName(user)} value={user.id || user.username || userName(user)}>
                {userName(user)}
              </option>
            ))}
          </SelectField>
        </div>
      </form>
    </ModalShell>
  );
}
