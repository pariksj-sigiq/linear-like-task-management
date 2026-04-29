import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle, User, Folder, Tag, MoreHorizontal, Maximize2, X, Paperclip } from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { LinearUser, Project, Team } from "../linearTypes";
import { issueKey, projectTitle, userName } from "../linearTypes";
import { Button, ErrorBanner } from "./ui";

export function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("ELT");
  const [status, setStatus] = useState("Todo");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

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
      if (event.key === "Escape") {
        if (showStatusMenu || showPriorityMenu || showAssigneeMenu || showProjectMenu) {
          setShowStatusMenu(false);
          setShowPriorityMenu(false);
          setShowAssigneeMenu(false);
          setShowProjectMenu(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, showStatusMenu, showPriorityMenu, showAssigneeMenu, showProjectMenu]);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("Todo");
    setPriority("");
    setProjectId("");
    setAssigneeId("");
    setError(null);
    setShowStatusMenu(false);
    setShowPriorityMenu(false);
    setShowAssigneeMenu(false);
    setShowProjectMenu(false);
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
    if (!createMore) {
      reset();
      onClose();
    } else {
      reset();
    }
    if (issue) navigate(`/issue/${issueKey(issue)}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" data-testid="quick-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-create-header">
          <div className="quick-create-team-badge">
            <span className="team-key">{team}</span>
          </div>
          <span className="quick-create-arrow">→</span>
          <span className="quick-create-title">New issue</span>
          <button type="button" className="icon-btn btn-ghost" aria-label="Expand">
            <Maximize2 size={16} />
          </button>
          <button type="button" className="icon-btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form id="quick-create-form" className="create-issue-form" onSubmit={submit}>
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
          <input
            className="create-description-input-single"
            aria-label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description..."
            data-testid="create-issue-description"
          />
          <div className="quick-create-properties">
            <div style={{ position: 'relative' }}>
              <button type="button" className="property-pill" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                <Circle size={12} /> {status}
              </button>
              {showStatusMenu && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
                  {['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setStatus(s);
                        setShowStatusMenu(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button type="button" className="property-pill" onClick={() => setShowPriorityMenu(!showPriorityMenu)}>
                --- {priority || "Priority"}
              </button>
              {showPriorityMenu && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
                  {['Urgent', 'High', 'Medium', 'Low', 'No priority'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setPriority(p === 'No priority' ? '' : p);
                        setShowPriorityMenu(false);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button type="button" className="property-pill" onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}>
                <User size={12} /> {assigneeId ? users.find(u => (u.id || u.username) === assigneeId)?.name || assigneeId : "Assignee"}
              </button>
              {showAssigneeMenu && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setAssigneeId('');
                      setShowAssigneeMenu(false);
                    }}
                  >
                    No assignee
                  </button>
                  {users.map((u) => (
                    <button
                      key={u.id || u.username}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setAssigneeId(u.id || u.username || '');
                        setShowAssigneeMenu(false);
                      }}
                    >
                      {u.name || u.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button type="button" className="property-pill" onClick={() => setShowProjectMenu(!showProjectMenu)}>
                <Folder size={12} /> {projectId ? projects.find(p => (p.id || p.key) === projectId)?.name || projectId : "Project"}
              </button>
              {showProjectMenu && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setProjectId('');
                      setShowProjectMenu(false);
                    }}
                  >
                    No project
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id || p.key}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setProjectId(p.id || p.key || '');
                        setShowProjectMenu(false);
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="property-pill">
              <Tag size={12} /> Labels
            </button>
            <button type="button" className="property-pill">
              <MoreHorizontal size={12} />
            </button>
          </div>
          <div className="quick-create-footer">
            <button type="button" className="icon-btn btn-ghost" aria-label="Attach file">
              <Paperclip size={16} />
            </button>
            <label className="create-more-toggle">
              <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} />
              <span>Create more</span>
            </label>
            <Button type="submit" form="quick-create-form" variant="primary" disabled={submitting} data-testid="create-issue-submit">
              {submitting ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
