import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Check, ChevronDown, Plus, Search } from "lucide-react";
import { callTool, collectionFrom, readTool } from "../../api";
import type { Project } from "../../linearTypes";
import { projectName } from "../../linearTypes";
import { ProjectCreateModal } from "../ProjectCreateModal";
import { cn } from "../../lib/utils";

interface ProjectPickerProps {
  issueId: string;
  currentProject: Project | string | null | undefined;
  currentProjectId?: string | null;
  onChanged: (nextProjectId: string | null) => void | Promise<void>;
}

function resolveProjectId(
  project: Project | string | null | undefined,
  explicitId?: string | null,
): string | null {
  if (explicitId) return explicitId;
  if (!project) return null;
  if (typeof project === "string") return project;
  return project.id || project.key || null;
}

export function IssueProjectPicker({
  issueId,
  currentProject,
  currentProjectId,
  onChanged,
}: ProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const previousProjectIdsRef = useRef<Set<string>>(new Set());

  const activeProjectId = resolveProjectId(currentProject, currentProjectId);
  const activeProjectLabel =
    activeProjectId && typeof currentProject !== "string" && currentProject
      ? projectName(currentProject)
      : activeProjectId
        ? projects.find((p) => (p.id || p.key) === activeProjectId)
          ? projectName(projects.find((p) => (p.id || p.key) === activeProjectId))
          : typeof currentProject === "string"
            ? currentProject
            : activeProjectId
        : "";

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const response = await readTool("search_projects", { limit: 100 });
    const rows = collectionFrom<Project>(response.data, ["projects", "results", "items"]);
    setProjects(rows);
    setLoading(false);
    return rows;
  }, []);

  useEffect(() => {
    if (open && projects.length === 0) {
      void loadProjects();
    }
  }, [open, projects.length, loadProjects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const applyProject = async (nextProjectId: string | null) => {
    if (busy) return;
    setBusy(true);
    // Use callTool directly so we can pass project_id: null (readTool/compactParams would strip it).
    let errored = false;
    try {
      const observation = await callTool("update_issue", {
        id: issueId,
        issue_key: issueId,
        project_id: nextProjectId,
      });
      if (observation.is_error) {
        errored = true;
        console.warn("update_issue project change failed:", observation.text);
      }
    } catch (error) {
      errored = true;
      console.warn("update_issue project change threw:", error);
    }
    setBusy(false);
    setOpen(false);
    if (errored) return;
    await onChanged(nextProjectId);
  };

  const handleCreateOpen = () => {
    // Snapshot the list of project ids we already know about so we can detect the new one.
    previousProjectIdsRef.current = new Set(
      projects.map((project) => project.id || project.key || "").filter(Boolean),
    );
    setOpen(false);
    setCreateOpen(true);
  };

  const handleCreated = async () => {
    const rows = await loadProjects();
    const previous = previousProjectIdsRef.current;
    const newProject = rows.find((project) => {
      const id = project.id || project.key || "";
      return id && !previous.has(id);
    });
    if (newProject) {
      const newId = newProject.id || newProject.key || "";
      if (newId) await applyProject(newId);
    }
  };

  const filtered = projects.filter((project) => {
    const name = projectName(project).toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="issue-project-display"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex min-h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Box size={14} className="shrink-0 text-muted-foreground" />
        {activeProjectId ? (
          <span
            className="min-w-0 truncate text-foreground"
            data-testid="issue-project-label"
          >
            {activeProjectLabel || "Project"}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">Add to project</span>
        )}
        <ChevronDown size={13} className="ml-auto shrink-0 text-muted-foreground transition-opacity opacity-0 group-hover:opacity-100" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close project menu"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Set project"
            data-testid="issue-project-menu"
            className="absolute left-0 top-[calc(100%+4px)] z-50 w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <div className="flex items-center gap-2 border-b border-border/70 px-2.5 py-2 text-[13px] text-muted-foreground">
              <Search size={13} />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Set project..."
                className="h-6 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                data-testid="issue-project-search"
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => void applyProject(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none hover:bg-accent hover:text-accent-foreground",
                )}
                data-testid="issue-project-option-none"
              >
                <span className="grid size-4 place-items-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground">
                  ∅
                </span>
                <span className="min-w-0 flex-1 truncate">No project</span>
                {!activeProjectId && <Check size={14} className="text-foreground" />}
              </button>
              {loading && projects.length === 0 ? (
                <div className="px-2 py-3 text-[12px] text-muted-foreground">Loading projects...</div>
              ) : (
                filtered.map((project) => {
                  const id = project.id || project.key || "";
                  const selected = !!activeProjectId && activeProjectId === id;
                  return (
                    <button
                      key={id || projectName(project)}
                      type="button"
                      role="menuitem"
                      onClick={() => void applyProject(id || null)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none hover:bg-accent hover:text-accent-foreground"
                      data-testid={`issue-project-option-${id}`}
                    >
                      <Box size={14} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{projectName(project)}</span>
                      {selected && <Check size={14} className="text-foreground" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-border/70 p-1">
              <div className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                New project
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleCreateOpen}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none hover:bg-accent hover:text-accent-foreground"
                data-testid="issue-project-create-trigger"
              >
                <Plus size={14} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">Create new project...</span>
              </button>
            </div>
          </div>
        </>
      )}

      <ProjectCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
