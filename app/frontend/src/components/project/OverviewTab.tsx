import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CalendarDays,
  Check,
  CircleCheck,
  CircleDashed,
  Link2,
  Plus,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { collectionFrom, readTool } from "../../api";
import type { LinearUser, Project } from "../../linearTypes";
import {
  avatarColor,
  formatDate,
  initials,
  priorityLabel,
  userName,
} from "../../linearTypes";
import { PriorityIcon } from "../IssueExplorer";
import { cn } from "../../lib/utils";
import {
  getProjectStatusOption,
  ProjectStatusGlyph,
  ProjectStatusMenu,
} from "./ProjectStatusPicker";

interface Milestone {
  id?: string;
  project_id?: string;
  name?: string;
  description?: string | null;
  target_date?: string | null;
  status?: string | null;
  sort_order?: number | null;
}

interface ExtendedProject extends Project {
  icon?: string | null;
  color?: string | null;
  lead_id?: string | null;
  start_date?: string | null;
  priority?: string | number | null;
  milestones?: Milestone[];
}

interface ResourceLink {
  id: string;
  url: string;
  label?: string;
}

const PRIORITY_OPTIONS = [
  { value: "none", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function resourcesStorageKey(projectId: string | undefined) {
  return `linear-clone:project-resources:${projectId || "unknown"}`;
}

function loadResources(projectId: string | undefined): ResourceLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(resourcesStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ResourceLink[];
  } catch (error) {
    console.warn("Failed to load project resources:", error);
  }
  return [];
}

function saveResources(projectId: string | undefined, resources: ResourceLink[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      resourcesStorageKey(projectId),
      JSON.stringify(resources),
    );
  } catch (error) {
    console.warn("Failed to save project resources:", error);
  }
}

function chipClasses(active?: boolean) {
  return cn(
    "inline-flex h-[32px] shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background px-3.5 text-[15px] font-normal text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5e6ad2]",
    active && "border-[#5e6ad2] bg-background shadow-[0_0_0_1px_rgba(94,106,210,0.9)]",
  );
}

function MilestoneStatusIcon({ status }: { status: string | null | undefined }) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed" || normalized === "done") {
    return <CircleCheck size={14} className="text-[#5e6ad2]" />;
  }
  return <CircleDashed size={14} className="text-muted-foreground" />;
}

export function ProjectOverviewTab({
  project,
  onChange,
  onNavigateToActivity,
}: {
  project: Project;
  onChange: () => void | Promise<void>;
  onNavigateToActivity?: () => void;
}) {
  const extended = project as ExtendedProject;
  const projectId = project.id || "";
  const initialDescription = project.description || "";

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(initialDescription);
  const [descriptionSaving, setDescriptionSaving] = useState(false);

  const [resources, setResources] = useState<ResourceLink[]>(() =>
    loadResources(projectId),
  );
  const [resourceComposerOpen, setResourceComposerOpen] = useState(false);
  const [resourceUrlDraft, setResourceUrlDraft] = useState("");
  const [resourceLabelDraft, setResourceLabelDraft] = useState("");

  const [openPropertyMenu, setOpenPropertyMenu] = useState<"status" | "priority" | "lead" | null>(null);
  const [propertySaving, setPropertySaving] = useState(false);
  const [leadUsers, setLeadUsers] = useState<LinearUser[]>([]);
  const [leadQuery, setLeadQuery] = useState("");
  const propertyMenuRef = useRef<HTMLDivElement | null>(null);

  const [showMilestoneAdd, setShowMilestoneAdd] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [milestoneSaving, setMilestoneSaving] = useState(false);
  const [renamingMilestoneId, setRenamingMilestoneId] = useState<string | null>(null);
  const [milestoneRenameDraft, setMilestoneRenameDraft] = useState("");

  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDescriptionDraft(project.description || "");
  }, [project.description]);

  useEffect(() => {
    setResources(loadResources(projectId));
  }, [projectId]);

  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
      const len = descriptionTextareaRef.current.value.length;
      descriptionTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingDescription]);

  useEffect(() => {
    if (!openPropertyMenu) return;
    const dismiss = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && propertyMenuRef.current?.contains(target)) return;
      setOpenPropertyMenu(null);
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("mousedown", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("mousedown", dismiss, true);
    };
  }, [openPropertyMenu]);

  useEffect(() => {
    if (openPropertyMenu !== "lead") return;
    let cancelled = false;
    (async () => {
      const response = await readTool("search_users", { query: leadQuery || "", limit: 30 });
      if (cancelled) return;
      setLeadUsers(collectionFrom<LinearUser>(response.data, ["users", "results"]));
    })();
    return () => {
      cancelled = true;
    };
  }, [openPropertyMenu, leadQuery]);

  const currentStateOption = getProjectStatusOption(project.state || project.status);
  const stateText = currentStateOption.label;
  const priorityText = priorityLabel(extended.priority);
  const leadLabel = project.lead_name
    ? userName({ name: project.lead_name, username: project.lead_username })
    : "";
  const leadInitials = leadLabel ? initials(leadLabel) : "";
  const leadColor = leadLabel ? avatarColor(leadLabel) : "#71717a";
  const currentPriorityOption =
    PRIORITY_OPTIONS.find((option) => option.label.toLowerCase() === priorityText.toLowerCase()) ||
    PRIORITY_OPTIONS.find((option) => option.value === String(extended.priority || "").toLowerCase()) ||
    PRIORITY_OPTIONS[0];

  const milestones = useMemo<Milestone[]>(
    () => extended.milestones || [],
    [extended.milestones],
  );

  const commitDescription = async () => {
    if (!projectId) {
      setEditingDescription(false);
      return;
    }
    const trimmed = descriptionDraft.trim();
    const original = (project.description || "").trim();
    if (trimmed === original) {
      setEditingDescription(false);
      return;
    }
    setDescriptionSaving(true);
    const response = await readTool("update_project", {
      id: projectId,
      description: trimmed,
    });
    setDescriptionSaving(false);
    setEditingDescription(false);
    if (response.error) {
      console.warn("update_project failed:", response.error);
      return;
    }
    await onChange();
  };

  const handleDescriptionKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setDescriptionDraft(project.description || "");
      setEditingDescription(false);
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void commitDescription();
    }
  };

  const patchProject = async (patch: Record<string, unknown>) => {
    if (!projectId || propertySaving) return;
    setPropertySaving(true);
    const response = await readTool("update_project", { id: projectId, ...patch });
    setPropertySaving(false);
    if (response.error) {
      console.warn("update_project failed:", response.error);
      return;
    }
    setOpenPropertyMenu(null);
    await onChange();
  };

  const handleAddResource = () => {
    const trimmed = resourceUrlDraft.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `res-${Date.now()}`;
    const next = [
      ...resources,
      {
        id,
        url: trimmed,
        label: resourceLabelDraft.trim() || undefined,
      },
    ];
    setResources(next);
    saveResources(projectId, next);
    setResourceComposerOpen(false);
    setResourceUrlDraft("");
    setResourceLabelDraft("");
  };

  const handleRemoveResource = (id: string) => {
    const next = resources.filter((entry) => entry.id !== id);
    setResources(next);
    saveResources(projectId, next);
  };

  const handleWriteUpdate = () => {
    if (onNavigateToActivity) {
      onNavigateToActivity();
    }
  };

  const openAddMilestone = () => {
    setShowMilestoneAdd(true);
    setNewMilestoneName("");
    setNewMilestoneDate("");
  };

  const cancelAddMilestone = () => {
    setShowMilestoneAdd(false);
    setNewMilestoneName("");
    setNewMilestoneDate("");
  };

  const saveNewMilestone = async () => {
    const name = newMilestoneName.trim();
    if (!name || !projectId) return;
    setMilestoneSaving(true);
    const response = await readTool("create_milestone", {
      project_id: projectId,
      name,
      target_date: newMilestoneDate || undefined,
      sort_order: milestones.length,
    });
    setMilestoneSaving(false);
    if (response.error) {
      console.warn("create_milestone failed:", response.error);
      return;
    }
    cancelAddMilestone();
    await onChange();
  };

  const startRenameMilestone = (milestone: Milestone) => {
    if (!milestone.id) return;
    setRenamingMilestoneId(milestone.id);
    setMilestoneRenameDraft(milestone.name || "");
  };

  const commitRenameMilestone = async (milestone: Milestone) => {
    if (!milestone.id) {
      setRenamingMilestoneId(null);
      return;
    }
    const next = milestoneRenameDraft.trim();
    if (!next || next === (milestone.name || "")) {
      setRenamingMilestoneId(null);
      return;
    }
    const response = await readTool("update_milestone", {
      id: milestone.id,
      name: next,
    });
    setRenamingMilestoneId(null);
    if (response.error) {
      console.warn("update_milestone failed:", response.error);
      return;
    }
    await onChange();
  };

  const removeMilestoneRow = async (milestone: Milestone) => {
    if (!milestone.id) return;
    const response = await readTool("delete_milestone", { id: milestone.id });
    if (response.error) {
      console.warn("delete_milestone failed:", response.error);
      return;
    }
    await onChange();
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-12">
      <div className="space-y-6">
        {/* Header: icon + name + summary */}
        <div className="space-y-3">
          <div className="grid size-[40px] place-items-center rounded-lg bg-muted/30 text-muted-foreground">
            <Box size={20} strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h1
              className="text-[32px] font-semibold text-foreground"
              data-testid="project-overview-name"
            >
              {project.name || project.title || "Untitled project"}
            </h1>
            <SummaryField
              description={project.description}
              projectId={projectId}
              onSaved={onChange}
            />
          </div>
        </div>

        {/* Properties section */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-medium text-foreground">Properties</h3>
          <div ref={propertyMenuRef} className="relative flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={chipClasses(openPropertyMenu === "status")}
              data-testid="overview-state-chip"
              aria-expanded={openPropertyMenu === "status"}
              onClick={() => setOpenPropertyMenu((current) => (current === "status" ? null : "status"))}
            >
              <ProjectStatusGlyph status={currentStateOption.value} size={16} />
              <span>{stateText}</span>
            </button>
            <button
              type="button"
              className={chipClasses(openPropertyMenu === "priority")}
              data-testid="overview-priority-chip"
              aria-expanded={openPropertyMenu === "priority"}
              onClick={() => setOpenPropertyMenu((current) => (current === "priority" ? null : "priority"))}
            >
              <PriorityIcon priority={extended.priority ?? "none"} />
              <span>{priorityText}</span>
            </button>
            <button
              type="button"
              className={chipClasses(openPropertyMenu === "lead")}
              data-testid="overview-lead-chip"
              aria-expanded={openPropertyMenu === "lead"}
              onClick={() => setOpenPropertyMenu((current) => (current === "lead" ? null : "lead"))}
            >
              {leadLabel ? (
                <>
                  <span
                    className="grid size-4 place-items-center rounded-full text-[9px] font-semibold text-white"
                    style={{ backgroundColor: leadColor }}
                  >
                    {leadInitials}
                  </span>
                  <span>{leadLabel}</span>
                </>
              ) : (
                <>
                  <span className="grid size-4 place-items-center rounded-full border border-dashed border-border text-[9px] text-muted-foreground">
                    ?
                  </span>
                  <span className="text-muted-foreground">Lead</span>
                </>
              )}
            </button>

            {openPropertyMenu === "status" && (
              <ProjectStatusMenu
                className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[304px]"
                disabled={propertySaving}
                onSelect={(option) => patchProject({ state: option.value })}
                optionTestIdPrefix="overview-status-option"
                selected={currentStateOption.value}
                testId="overview-status-menu"
              />
            )}

            {openPropertyMenu === "priority" && (
              <div className="absolute left-16 top-[calc(100%+6px)] z-[70] w-56 rounded-xl bg-popover p-1 text-sm text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.20)] ring-1 ring-foreground/10" role="menu" data-testid="overview-priority-menu">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted", option.value === currentPriorityOption.value && "bg-muted")}
                    onClick={() => void patchProject({ priority: option.value })}
                    disabled={propertySaving}
                    data-testid={`overview-priority-option-${option.value}`}
                  >
                    <PriorityIcon priority={option.value === "none" ? null : option.label} />
                    <span className="flex-1">{option.label}</span>
                    {option.value === currentPriorityOption.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}

            {openPropertyMenu === "lead" && (
              <div className="absolute left-36 top-[calc(100%+6px)] z-[70] w-72 overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.20)] ring-1 ring-foreground/10" role="menu" data-testid="overview-lead-menu">
                <div className="flex h-9 items-center gap-2 border-b border-border px-2">
                  <Search size={13} className="text-muted-foreground" />
                  <input
                    autoFocus
                    value={leadQuery}
                    onChange={(event) => setLeadQuery(event.target.value)}
                    placeholder="Search users"
                    className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                    data-testid="overview-lead-search"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => void patchProject({ lead_id: null })}
                    disabled={propertySaving}
                    data-testid="overview-lead-option-none"
                  >
                    <span className="grid size-5 place-items-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">?</span>
                    <span>No lead</span>
                  </button>
                  {leadUsers.map((user) => {
                    const label = userName(user);
                    return (
                      <button
                        key={user.id || user.username || label}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                        onClick={() => void patchProject({ lead_id: user.id })}
                        disabled={propertySaving}
                        data-testid={`overview-lead-option-${user.id || user.username}`}
                      >
                        <span
                          className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: avatarColor(label) }}
                        >
                          {initials(label)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {project.target_date && (
            <span className={chipClasses()} data-testid="overview-target-date-chip">
              <CalendarDays size={12} />
              <span>{formatDate(project.target_date)}</span>
            </span>
          )}
        </div>

        {/* Resources section */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-medium text-foreground">Resources</h3>
          <div className="space-y-1">
          {resources.length > 0 && (
            <ul className="space-y-1" data-testid="project-resources">
              {resources.map((resource) => (
                <li
                  key={resource.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
                >
                  <Link2 size={14} className="text-muted-foreground" />
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1 truncate text-foreground hover:underline"
                  >
                    {resource.label || resource.url}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(resource.id)}
                    className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                    aria-label="Remove resource"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setResourceComposerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            data-testid="project-add-resource"
          >
            <Plus size={13} />
            <span>Add document or link...</span>
          </button>
          {resourceComposerOpen && (
            <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)]" data-testid="project-resource-composer">
              <input
                autoFocus
                value={resourceUrlDraft}
                onChange={(event) => setResourceUrlDraft(event.target.value)}
                placeholder="Paste URL"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="project-resource-url"
              />
              <input
                value={resourceLabelDraft}
                onChange={(event) => setResourceLabelDraft(event.target.value)}
                placeholder="Name (optional)"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="project-resource-label"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddResource();
                  }
                  if (event.key === "Escape") {
                    setResourceComposerOpen(false);
                    setResourceUrlDraft("");
                    setResourceLabelDraft("");
                  }
                }}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setResourceComposerOpen(false);
                    setResourceUrlDraft("");
                    setResourceLabelDraft("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="h-7 rounded-md bg-foreground px-2.5 text-xs font-medium text-background disabled:opacity-50"
                  onClick={handleAddResource}
                  disabled={!resourceUrlDraft.trim()}
                  data-testid="project-resource-save"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Write first project update CTA */}
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleWriteUpdate}
            className="flex items-center gap-2.5 rounded-md border border-border/60 bg-background px-4 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            data-testid="project-write-first-update"
          >
            <SquarePen size={14} />
            <span>Write first project update</span>
          </button>
        </div>

        {/* Description section */}
        <section className="space-y-2" data-testid="project-description-section">
          <h2 className="text-[13px] font-semibold text-foreground">Description</h2>
          {editingDescription ? (
            <textarea
              ref={descriptionTextareaRef}
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={commitDescription}
              onKeyDown={handleDescriptionKey}
              disabled={descriptionSaving}
              placeholder="Add description..."
              className="min-h-[120px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              data-testid="project-description-textarea"
            />
          ) : project.description ? (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="block w-full rounded-md px-0 py-0.5 text-left text-sm leading-6 text-foreground whitespace-pre-wrap hover:bg-muted/40"
              data-testid="project-description-text"
            >
              {project.description}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="block w-full rounded-md px-0 py-0.5 text-left text-[13px] text-muted-foreground/70 hover:text-foreground"
              data-testid="project-description-empty"
            >
              Add description...
            </button>
          )}
        </section>

        {/* Milestones section */}
        <section className="space-y-2" data-testid="project-milestones-section">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground">Milestones</h2>
            <button
              type="button"
              onClick={showMilestoneAdd ? cancelAddMilestone : openAddMilestone}
              aria-label={showMilestoneAdd ? "Cancel add milestone" : "Add milestone"}
              className="inline-flex items-center gap-1 text-[13px] font-normal text-muted-foreground hover:text-foreground"
              data-testid="project-add-milestone-button"
            >
              {showMilestoneAdd ? (
                <>
                  <X size={13} />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Milestone</span>
                </>
              )}
            </button>
          </div>

          {showMilestoneAdd && (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
              data-testid="project-milestone-add-row"
            >
              <CircleDashed size={14} className="text-muted-foreground" />
              <input
                autoFocus
                value={newMilestoneName}
                onChange={(event) => setNewMilestoneName(event.target.value)}
                placeholder="Milestone name"
                className="h-7 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveNewMilestone();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelAddMilestone();
                  }
                }}
                data-testid="project-milestone-add-name"
              />
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(event) => setNewMilestoneDate(event.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                data-testid="project-milestone-add-date"
              />
              <button
                type="button"
                onClick={() => void saveNewMilestone()}
                disabled={!newMilestoneName.trim() || milestoneSaving}
                className="h-7 rounded-md bg-[#5e6ad2] px-3 text-xs font-medium text-white transition-colors hover:bg-[#4a55b8] disabled:opacity-50"
                data-testid="project-milestone-save"
              >
                {milestoneSaving ? "Saving..." : "Save"}
              </button>
            </div>
          )}

          {milestones.length > 0 ? (
            <ul className="space-y-0.5" data-testid="project-milestones-list">
              {milestones.map((milestone) => {
                const isRenaming = renamingMilestoneId === milestone.id;
                return (
                  <li
                    key={milestone.id || milestone.name}
                    className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
                    data-testid={`project-milestone-${milestone.id || "row"}`}
                  >
                    <MilestoneStatusIcon status={milestone.status} />
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={milestoneRenameDraft}
                        onChange={(event) => setMilestoneRenameDraft(event.target.value)}
                        onBlur={() => void commitRenameMilestone(milestone)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitRenameMilestone(milestone);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setRenamingMilestoneId(null);
                          }
                        }}
                        className="h-6 flex-1 rounded-sm border border-border bg-background px-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRenameMilestone(milestone)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="truncate text-foreground">
                          {milestone.name || "Untitled milestone"}
                        </span>
                        {milestone.target_date && (
                          <span className="text-xs text-muted-foreground">
                            — {formatDate(milestone.target_date)}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeMilestoneRow(milestone)}
                      aria-label="Delete milestone"
                      className="grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            !showMilestoneAdd && (
              <p className="text-[13px] leading-[1.6] text-muted-foreground">
                Add milestones to organize work within your project and break it into
                more granular stages.{" "}
                <a
                  href="https://linear.app/docs/projects#milestones"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Learn more
                </a>
              </p>
            )
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryField({
  description,
  projectId,
  onSaved,
}: {
  description: string | null | undefined;
  projectId: string;
  onSaved: () => void | Promise<void>;
}) {
  const firstLine = (description || "").split(/\r?\n/)[0] || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(firstLine);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft((description || "").split(/\r?\n/)[0] || "");
  }, [description]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length,
      );
    }
  }, [editing]);

  const commit = async () => {
    if (!projectId) {
      setEditing(false);
      return;
    }
    const trimmed = draft.trim();
    if (trimmed === firstLine) {
      setEditing(false);
      return;
    }
    const rest = (description || "").split(/\r?\n/).slice(1).join("\n");
    const next = rest ? `${trimmed}\n${rest}` : trimmed;
    setSaving(true);
    const response = await readTool("update_project", {
      id: projectId,
      description: next,
    });
    setSaving(false);
    setEditing(false);
    if (response.error) {
      console.warn("update_project failed:", response.error);
      return;
    }
    await onSaved();
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(firstLine);
            setEditing(false);
          }
        }}
        disabled={saving}
        placeholder="Add a short summary..."
        className="h-7 w-full border-0 bg-transparent px-0 text-[15px] leading-tight text-muted-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none disabled:opacity-60"
        data-testid="project-summary-input"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full rounded-md px-0 py-0.5 text-left text-[15px] leading-tight hover:text-foreground",
        firstLine ? "text-muted-foreground" : "text-muted-foreground/70",
      )}
      data-testid="project-summary-button"
    >
      {firstLine || "Add a short summary..."}
    </button>
  );
}
