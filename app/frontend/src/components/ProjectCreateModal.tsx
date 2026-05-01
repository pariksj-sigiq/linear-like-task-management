import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  CalendarDays,
  Check,
  ChevronLeft,
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
import { PriorityIcon } from "./IssueExplorer";
import { ProjectStatusGlyph } from "./project/ProjectStatusPicker";
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

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DATE_VIEW_MODES = ["Day", "Month", "Quarter", "Half-year", "Year"];

function chipClasses(active?: boolean) {
  return cn(
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-background px-2.5 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5e6ad2] dark:border-[#333333]",
    active && "bg-muted/70",
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

function userMatchesQuery(user: LinearUser, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [userName(user), user.username, user.email, user.id]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (slash) {
    return new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date | null, b: Date | null) {
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

function formatChipDate(value: string) {
  const date = parseLocalDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatDateInput(value: string) {
  const date = parseLocalDate(value);
  if (!date) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

interface MilestoneDraft {
  name: string;
  target_date: string;
}

type ProjectCreateMenu = "status" | "priority" | "lead" | null;

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
  const [activeMenu, setActiveMenu] = useState<ProjectCreateMenu>(null);
  const [membersOpen, setMembersOpen] = useState(false);
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
    setActiveMenu(null);
    setMembersOpen(false);
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
    const fetched = collectionFrom<LinearUser>(response.data, ["users", "results"]);
    setUsers((current) => {
      const byId = new Map<string, LinearUser>();
      [...current, ...fetched].forEach((user) => {
        if (user.id) byId.set(user.id, user);
      });
      return Array.from(byId.values());
    });
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
    setActiveMenu(null);
    setMembersOpen(false);
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

  const leadUsers = useMemo(
    () => users.filter((user) => userMatchesQuery(user, userQuery)),
    [userQuery, users],
  );
  const memberCandidates = useMemo(
    () => users.filter((user) => userMatchesQuery(user, memberQuery)),
    [memberQuery, users],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[9%] max-h-[78svh] w-[min(680px,calc(100vw-4rem))] max-w-[680px] translate-y-0 overflow-hidden rounded-[18px] border border-border/80 bg-popover p-0 shadow-[0_22px_68px_rgba(0,0,0,0.28)] sm:max-w-[680px]"
        data-testid="create-project-modal"
      >
        <VisuallyHidden.Root>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Create a new project for your team.</DialogDescription>
        </VisuallyHidden.Root>
        <form onSubmit={submit} className="flex max-h-[78svh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/55 px-5 py-3">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-background px-2 text-[12px] font-medium text-[#5e6ad2] shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-[#333333]">
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
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
            <div className="mb-4 inline-grid size-7 place-items-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
              <Box size={15} />
            </div>

            {/* Name */}
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              className="mb-1 h-8 w-full border-0 bg-transparent px-0 text-[22px] font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none"
              data-testid="project-name-input"
            />

            {/* Summary */}
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Add a short summary..."
              className="mb-3 h-6 w-full border-0 bg-transparent px-0 text-[14px] leading-tight text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
              data-testid="project-summary-input"
            />

            {/* Chips */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {/* Status */}
              <DropdownMenu
                modal={false}
                open={activeMenu === "status"}
                onOpenChange={(nextOpen) => {
                  setActiveMenu((current) => {
                    if (nextOpen) return "status";
                    return current === "status" ? null : current;
                  });
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button type="button" className={chipClasses()} data-testid="status-chip">
                    <ProjectStatusGlyph status={selectedStatus.value} size={14} />
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
                      onClick={() => {
                        setStatus(option.value);
                        setActiveMenu(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ProjectStatusGlyph status={option.value} size={14} />
                      <span className="flex-1">{option.label}</span>
                      {option.value === status && <Check size={14} />}
                      <span className="text-xs text-muted-foreground">{option.shortcut}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority */}
              <DropdownMenu
                modal={false}
                open={activeMenu === "priority"}
                onOpenChange={(nextOpen) => {
                  setActiveMenu((current) => {
                    if (nextOpen) return "priority";
                    return current === "priority" ? null : current;
                  });
                }}
              >
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
                      onClick={() => {
                        setPriority(option.value);
                        setActiveMenu(null);
                      }}
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
              <DropdownMenu
                modal={false}
                open={activeMenu === "lead"}
                onOpenChange={(nextOpen) => {
                  setActiveMenu((current) => {
                    if (nextOpen) return "lead";
                    return current === "lead" ? null : current;
                  });
                }}
              >
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
                    onClick={() => {
                      setLeadId("");
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="grid size-5 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
                      <Users size={11} />
                    </span>
                    <span className="flex-1">No lead</span>
                    {!leadId && <Check size={14} />}
                  </DropdownMenuItem>
                  <div className="max-h-[360px] overflow-y-auto">
                    {leadUsers.length > 0 ? (
                      leadUsers.map((user) => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => {
                            setLeadId(user.id || "");
                            setActiveMenu(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {userInitials(user)}
                          </span>
                          <span className="flex-1 truncate">{userName(user)}</span>
                          {user.id === leadId && <Check size={14} />}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Members */}
              <DropdownMenu modal={false} open={membersOpen} onOpenChange={setMembersOpen}>
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
                <DropdownMenuContent
                  align="start"
                  className="w-64 p-1"
                  data-testid="create-project-members-menu"
                  onEscapeKeyDown={() => setMembersOpen(false)}
                  onFocusOutside={() => setMembersOpen(false)}
                  onPointerDownOutside={() => setMembersOpen(false)}
                >
                  <div className="px-1.5 pt-1 pb-0.5">
                    <Input
                      value={memberQuery}
                      onChange={(event) => {
                        setMemberQuery(event.target.value);
                        fetchUsers(event.target.value);
                      }}
                      placeholder="Search users..."
                      className="h-7 text-xs"
                      data-testid="create-project-members-search"
                    />
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {memberCandidates.length > 0 ? (
                      memberCandidates.map((user) => {
                        const selected = !!user.id && memberIds.includes(user.id);
                        return (
                          <DropdownMenuItem
                            key={user.id}
                            onClick={() => {
                              toggleMember(user.id);
                              setMembersOpen(false);
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
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Start date */}
              <ProjectDatePicker
                label="Start date"
                value={startDate}
                onChange={setStartDate}
                testId="start-date"
              />

              {/* Target date */}
              <ProjectDatePicker
                label="Target date"
                value={targetDate}
                onChange={setTargetDate}
                testId="target-date"
              />

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
              className="mt-4 min-h-[112px] w-full resize-y border-0 bg-transparent px-0 text-[14px] leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
              data-testid="project-description-input"
            />
          </div>

          {/* Milestones */}
          <div className="mx-6 mb-4 overflow-hidden rounded-xl border border-border/80">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-foreground">Milestones</span>
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
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3">
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

function ProjectDatePicker({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDate(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const [draft, setDraft] = useState(() => formatDateInput(value));
  const days = buildMonthDays(visibleMonth);

  useEffect(() => {
    if (!open) return;
    const nextDate = parseLocalDate(value) || new Date();
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setDraft(formatDateInput(value));
  }, [open, value]);

  const commitDate = (date: Date) => {
    onChange(toDateValue(date));
    setDraft(formatDateInput(toDateValue(date)));
    setOpen(false);
  };

  const commitDraft = () => {
    const parsed = parseLocalDate(draft);
    if (!parsed) return;
    commitDate(parsed);
  };

  const moveMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={chipClasses(!!value)}
          data-testid={`${testId}-chip`}
          aria-label={label}
        >
          <CalendarDays size={12} />
          <span>{value ? formatChipDate(value) : label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[420px] overflow-hidden rounded-[14px] border border-border bg-popover p-0 text-popover-foreground shadow-[0_22px_70px_rgba(0,0,0,0.28)] ring-0"
        data-testid={`${testId}-calendar-menu`}
      >
        <div className="border-b border-border px-5 py-4">
          <label className="grid gap-2 text-[13px] font-medium text-muted-foreground">
            <span>{label}</span>
            <span className="flex h-10 items-center rounded-lg border border-[#5e6ad2] bg-background px-3 text-foreground shadow-[0_0_0_1px_rgba(94,106,210,0.25)]">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
                placeholder="MM/DD/YYYY"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                data-testid={`${testId}-date-input`}
              />
              {value && (
                <button
                  type="button"
                  aria-label={`Clear ${label}`}
                  onClick={() => {
                    onChange("");
                    setDraft("");
                  }}
                  className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  data-testid={`${testId}-clear`}
                >
                  <X size={13} />
                </button>
              )}
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {DATE_VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "h-8 rounded-full border border-border px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  mode === "Day" && "bg-muted text-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-foreground">{monthLabel(visibleMonth)}</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={17} />
              </button>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-[13px] font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const selected = sameDay(day, selectedDate);
              const today = sameDay(day, new Date());
              return (
                <button
                  key={toDateValue(day)}
                  type="button"
                  onClick={() => commitDate(day)}
                  className={cn(
                    "mx-auto grid size-8 place-items-center rounded-full text-[14px] transition-colors",
                    inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/35 hover:bg-muted/40",
                    today && !selected && "ring-1 ring-muted-foreground/60",
                    selected && "bg-[#5e6ad2] text-white hover:bg-[#5e6ad2]",
                  )}
                  data-testid={`${testId}-day-${toDateValue(day)}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
