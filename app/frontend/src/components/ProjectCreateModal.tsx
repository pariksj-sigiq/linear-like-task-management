import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Link2,
  Plus,
  Tag,
  Users,
  X,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { VisuallyHidden } from "radix-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { PriorityIcon, StatusIcon } from "./IssueExplorer";
import { ErrorBanner } from "./ui";
import { cn } from "../lib/utils";
import type { LinearUser } from "../linearTypes";
import { userName } from "../linearTypes";

const STATUS_OPTIONS: { label: string; value: string; shortcut: string }[] = [
  { label: "Backlog", value: "backlog", shortcut: "1" },
  { label: "Planned", value: "planned", shortcut: "2" },
  { label: "In Progress", value: "started", shortcut: "3" },
  { label: "Completed", value: "completed", shortcut: "4" },
  { label: "Canceled", value: "canceled", shortcut: "5" },
];

const PRIORITY_OPTIONS: { label: string; value: string; shortcut: string }[] = [
  { label: "No priority", value: "none", shortcut: "0" },
  { label: "Urgent", value: "urgent", shortcut: "1" },
  { label: "High", value: "high", shortcut: "2" },
  { label: "Medium", value: "medium", shortcut: "3" },
  { label: "Low", value: "low", shortcut: "4" },
];

function chipClasses(active?: boolean) {
  return cn(
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    active && "bg-muted",
  );
}

function userInitials(user: LinearUser) {
  const label = userName(user) || user.email || "U";
  return label
    .split(/\s+|[.@_-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || "")
    .join("");
}

interface MilestoneDraft {
  name: string;
  target_date: string;
}

export function ProjectCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("backlog");
  const [priority, setPriority] = useState<string>("none");
  const [leadId, setLeadId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const reset = () => {
    setName("");
    setSummary("");
    setDescription("");
    setStatus("backlog");
    setPriority("none");
    setLeadId("");
    setMemberIds([]);
    setStartDate("");
    setTargetDate("");
    setMilestones([]);
    setUserQuery("");
    setMemberQuery("");
    setError(null);
    setWarnings([]);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setWarnings([]);
    readTool("search_users", { query: "", limit: 20 }).then((response) => {
      setUsers(collectionFrom<LinearUser>(response.data, ["users", "results"]));
    });
  }, [open]);

  const fetchUsers = async (query: string) => {
    const response = await readTool("search_users", { query: query || "", limit: 20 });
    setUsers(collectionFrom<LinearUser>(response.data, ["users", "results"]));
  };

  const selectedStatus = useMemo(
    () => STATUS_OPTIONS.find((item) => item.value === status) ?? STATUS_OPTIONS[0],
    [status],
  );
  const selectedPriority = useMemo(
    () => PRIORITY_OPTIONS.find((item) => item.value === priority) ?? PRIORITY_OPTIONS[0],
    [priority],
  );
  const leadUser = useMemo(
    () => users.find((user) => user.id === leadId) || null,
    [leadId, users],
  );
  const memberUsers = useMemo(
    () => users.filter((user) => user.id && memberIds.includes(user.id)),
    [memberIds, users],
  );

  const toggleMember = (id?: string) => {
    if (!id) return;
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { name: "", target_date: "" }]);
  };

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleCancel();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setWarnings([]);

    const combinedDescription = [summary.trim(), description.trim()].filter(Boolean).join("\n\n");

    const createResponse = await readTool("create_project", {
      name: name.trim(),
      description: combinedDescription || undefined,
      state: status,
      priority,
      lead_id: leadId || undefined,
      icon: "roadmap",
      color: "#5e6ad2",
      start_date: startDate || undefined,
      target_date: targetDate || undefined,
    });

    if (createResponse.error || !createResponse.data) {
      setSubmitting(false);
      setError(createResponse.error || "Failed to create project.");
      return;
    }

    const projectRecord = (createResponse.data as Record<string, unknown>).project
      || createResponse.data;
    const projectId = (projectRecord as Record<string, unknown>)?.id as string | undefined;
    const newWarnings: string[] = [];

    if (projectId) {
      // Add members via a best-effort call. update_project doesn't support members,
      // so we try "add_project_member"; if not available we warn.
      for (const memberId of memberIds) {
        if (memberId === leadId) continue; // lead already added on create
        const memberResponse = await readTool("add_project_member", {
          project_id: projectId,
          user_id: memberId,
        });
        if (memberResponse.error && !memberResponse.error.toLowerCase().includes("unknown tool")) {
          newWarnings.push(`Could not add member: ${memberResponse.error}`);
        } else if (memberResponse.error) {
          // No member tool registered; log to console and warn once.
          console.warn("add_project_member not available:", memberResponse.error);
          newWarnings.push("Member selection saved locally only (no backend tool yet).");
          break;
        }
      }

      for (const milestone of milestones) {
        if (!milestone.name.trim()) continue;
        const milestoneResponse = await readTool("create_milestone", {
          project_id: projectId,
          name: milestone.name.trim(),
          target_date: milestone.target_date || undefined,
        });
        if (milestoneResponse.error) {
          console.warn("create_milestone failed:", milestoneResponse.error);
          newWarnings.push(
            `Milestone "${milestone.name.trim()}" not created: ${milestoneResponse.error}`,
          );
        }
      }
    }

    setSubmitting(false);
    if (newWarnings.length) {
      // Show warnings but still close/refresh so the project appears.
      console.warn("ProjectCreateModal warnings:", newWarnings);
    }
    reset();
    onClose();
    await onCreated();
  };

  const leadUsers = users;
  const memberCandidates = users;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[8%] max-h-[88vh] w-[calc(100%-2rem)] max-w-[820px] translate-y-0 overflow-visible rounded-2xl bg-popover p-0 sm:max-w-[820px]"
        data-testid="create-project-modal"
      >
        <VisuallyHidden.Root>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Create a new project for your team.</DialogDescription>
        </VisuallyHidden.Root>
        <form onSubmit={submit} className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="inline-flex h-5 items-center gap-1.5 rounded-md bg-[#5e6ad2]/15 px-1.5 text-[11px] font-semibold text-[#5e6ad2]">
                <Box size={12} /> ELT
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
              <span className="font-medium text-foreground">New project</span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Close"
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pt-5">
            <ErrorBanner message={error} />
            {warnings.length > 0 && (
              <div
                role="alert"
                className="mb-3 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}

            {/* Icon placeholder */}
            <div className="mb-3 inline-grid size-8 place-items-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
              <Box size={16} />
            </div>

            {/* Name */}
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              className="mb-1 h-9 w-full border-0 bg-transparent px-0 text-2xl font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none"
              data-testid="project-name-input"
            />

            {/* Summary */}
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Add a short summary..."
              className="mb-3 h-7 w-full border-0 bg-transparent px-0 text-sm leading-tight text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
              data-testid="project-summary-input"
            />

            {/* Chips */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={chipClasses()} data-testid="status-chip">
                    <StatusIcon status={selectedStatus.label} size={12} />
                    <span>{selectedStatus.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1">
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                    <span>Change status...</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <kbd className="rounded border border-border bg-muted px-1">P</kbd>
                      <span>then</span>
                      <kbd className="rounded border border-border bg-muted px-1">S</kbd>
                    </span>
                  </div>
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => setStatus(option.value)}
                      className="flex items-center gap-2"
                    >
                      <StatusIcon status={option.label} size={14} />
                      <span className="flex-1">{option.label}</span>
                      {option.value === status && <Check size={14} />}
                      <span className="text-xs text-muted-foreground">{option.shortcut}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={chipClasses()} data-testid="priority-chip">
                    <PriorityIcon priority={selectedPriority.label} />
                    <span>{selectedPriority.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1">
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                    <span>Change priority...</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <kbd className="rounded border border-border bg-muted px-1">P</kbd>
                      <span>then</span>
                      <kbd className="rounded border border-border bg-muted px-1">P</kbd>
                    </span>
                  </div>
                  {PRIORITY_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => setPriority(option.value)}
                      className="flex items-center gap-2"
                    >
                      <PriorityIcon priority={option.label} />
                      <span className="flex-1">{option.label}</span>
                      {option.value === priority && <Check size={14} />}
                      <span className="text-xs text-muted-foreground">{option.shortcut}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Lead */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={chipClasses()} data-testid="lead-chip">
                    <span className="grid size-4 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                      {leadUser ? userInitials(leadUser) : <Users size={10} />}
                    </span>
                    <span>{leadUser ? userName(leadUser) : "Lead"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1">
                  <div className="px-1.5 pt-1 pb-0.5">
                    <Input
                      value={userQuery}
                      onChange={(event) => {
                        setUserQuery(event.target.value);
                        fetchUsers(event.target.value);
                      }}
                      placeholder="Search users..."
                      className="h-7 text-xs"
                    />
                  </div>
                  <DropdownMenuItem
                    onSelect={() => setLeadId("")}
                    className="flex items-center gap-2"
                  >
                    <span className="grid size-5 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
                      <Users size={11} />
                    </span>
                    <span className="flex-1">No lead</span>
                    {!leadId && <Check size={14} />}
                  </DropdownMenuItem>
                  {leadUsers.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onSelect={() => setLeadId(user.id || "")}
                      className="flex items-center gap-2"
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {userInitials(user)}
                      </span>
                      <span className="flex-1 truncate">{userName(user)}</span>
                      {user.id === leadId && <Check size={14} />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Members */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={chipClasses()} data-testid="members-chip">
                    <Users size={12} />
                    <span>
                      {memberUsers.length > 0
                        ? `${memberUsers.length} member${memberUsers.length === 1 ? "" : "s"}`
                        : "Members"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1">
                  <div className="px-1.5 pt-1 pb-0.5">
                    <Input
                      value={memberQuery}
                      onChange={(event) => {
                        setMemberQuery(event.target.value);
                        fetchUsers(event.target.value);
                      }}
                      placeholder="Search users..."
                      className="h-7 text-xs"
                    />
                  </div>
                  {memberCandidates.map((user) => {
                    const selected = !!user.id && memberIds.includes(user.id);
                    return (
                      <DropdownMenuItem
                        key={user.id}
                        onSelect={(event) => {
                          event.preventDefault();
                          toggleMember(user.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          {userInitials(user)}
                        </span>
                        <span className="flex-1 truncate">{userName(user)}</span>
                        {selected && <Check size={14} />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Start date */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={chipClasses(!!startDate)}
                    data-testid="start-date-chip"
                    aria-label="Start date"
                  >
                    <CalendarDays size={12} />
                    {startDate && <span>{startDate}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-2">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => setStartDate("")}
                      className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Clear
                    </button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Target date */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={chipClasses(!!targetDate)}
                    data-testid="target-date-chip"
                    aria-label="Target date"
                  >
                    <CalendarDays size={12} />
                    {targetDate && <span>{targetDate}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-2">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    <span>Target date</span>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(event) => setTargetDate(event.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                  {targetDate && (
                    <button
                      type="button"
                      onClick={() => setTargetDate("")}
                      className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Clear
                    </button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Placeholder icons to match visual */}
              <span className={chipClasses()} aria-hidden>
                <Link2 size={12} />
              </span>
              <span className={chipClasses()} aria-hidden>
                <Tag size={12} />
              </span>
            </div>

            <div className="h-px bg-border/60" />

            {/* Description */}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write a description, a project brief, or collect ideas..."
              className="mt-4 min-h-[160px] w-full resize-none border-0 bg-transparent px-0 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
              data-testid="project-description-input"
            />
          </div>

          {/* Milestones */}
          <div className="mx-5 mb-3 overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">Milestones</span>
              <button
                type="button"
                onClick={addMilestone}
                aria-label="Add milestone"
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="add-milestone-button"
              >
                <Plus size={14} />
              </button>
            </div>
            {milestones.length > 0 && (
              <div className="border-t border-border px-4 py-2">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 py-1.5"
                    data-testid={`milestone-row-${index}`}
                  >
                    <CircleDashed size={14} className="text-muted-foreground" />
                    <Input
                      value={milestone.name}
                      onChange={(event) => updateMilestone(index, { name: event.target.value })}
                      placeholder="Milestone name"
                      className="h-7 flex-1 text-xs"
                      data-testid={`milestone-name-${index}`}
                    />
                    <input
                      type="date"
                      value={milestone.target_date}
                      onChange={(event) =>
                        updateMilestone(index, { target_date: event.target.value })
                      }
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                      data-testid={`milestone-date-${index}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      aria-label="Remove milestone"
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full border border-border bg-background px-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              className="h-8 rounded-full bg-[#5e6ad2] px-4 text-white hover:bg-[#4a55b8]"
              disabled={submitting}
              data-testid="create-project-submit"
            >
              {submitting ? "Creating..." : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
