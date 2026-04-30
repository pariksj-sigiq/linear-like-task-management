import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  Search,
  Slack,
  Tag,
  Users,
} from "lucide-react";
import { collectionFrom, readTool } from "../../api";
import { cn } from "../../lib/utils";
import {
  PriorityIcon,
} from "../IssueExplorer";
import type { Issue, LinearUser, Project } from "../../linearTypes";
import {
  avatarColor,
  formatDate,
  initials,
  priorityLabel,
  userName,
} from "../../linearTypes";
import { Button } from "../ui";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { ProjectMilestonesList } from "./ProjectMilestonesList";
import {
  getProjectStatusOption,
  ProjectStatusGlyph,
  ProjectStatusMenu,
  type ProjectStatusOption,
} from "./ProjectStatusPicker";

interface Milestone {
  id?: string;
  project_id?: string;
  name?: string;
  target_date?: string | null;
  status?: string;
  sort_order?: number;
}

interface ExtendedProject extends Project {
  priority?: string;
  start_date?: string | null;
  lead_id?: string | null;
  team_id?: string | null;
  team?: { id?: string; key?: string; name?: string } | string | null;
  icon?: string | null;
  milestones?: Milestone[];
  members?: LinearUser[];
}

type PriorityKey = "none" | "urgent" | "high" | "medium" | "low";

interface PriorityOption {
  value: PriorityKey;
  label: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: "none", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface ProjectPropertiesSidebarProps {
  project: ExtendedProject;
  issues: Issue[];
  onChange: () => Promise<void> | void;
  onClose: () => void;
}

export function ProjectPropertiesSidebar({
  project,
  issues,
  onChange,
  onClose,
}: ProjectPropertiesSidebarProps) {
  const projectId = project.id || "";
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchProject = async (patch: Record<string, unknown>) => {
    if (!projectId) return false;
    setSaving(true);
    const response = await readTool("update_project", { id: projectId, ...patch });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return false;
    }
    setError(null);
    await onChange();
    return true;
  };

  return (
    <aside
      className="hidden min-h-0 w-[420px] shrink-0 flex-col gap-3 overflow-y-auto bg-background px-4 pb-16 pt-6 text-sm xl:flex"
      data-testid="project-properties-sidebar"
    >
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-background p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="flex w-full items-center justify-between gap-2 pb-3">
          <button
            type="button"
            onClick={() => setPropertiesOpen(!propertiesOpen)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={propertiesOpen}
            data-testid="project-properties-toggle"
          >
            <span className="text-sm font-medium text-foreground">Properties</span>
            <ChevronDown
              size={14}
              className={cn("text-muted-foreground transition-transform", !propertiesOpen && "-rotate-90")}
            />
          </button>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Add property"
            data-testid="project-add-property"
          >
            <Plus size={14} />
          </button>
        </div>
        {propertiesOpen && (
          <div className="space-y-1">
            <StatusRow project={project} onPatch={patchProject} />
            <PriorityRow project={project} onPatch={patchProject} />
            <LeadRow project={project} onPatch={patchProject} />
            <MembersRow project={project} />
            <DateRow
              label="Start date"
              value={project.start_date}
              field="start_date"
              onPatch={patchProject}
            />
            <DateRow
              label="Target date"
              value={project.target_date}
              field="target_date"
              onPatch={patchProject}
            />
            <TeamRow project={project} />
            <SlackRow />
            <LabelsRow />
          </div>
        )}
      </section>

      <ProjectMilestonesList
        projectId={projectId}
        milestones={project.milestones || []}
        onChange={onChange}
      />

      <ProgressCard project={project} issues={issues} />
    </aside>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 py-2 text-sm">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function StatusRow({
  project,
  onPatch,
}: {
  project: ExtendedProject;
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const option = getProjectStatusOption(project.state || project.status);

  const pick = async (next: ProjectStatusOption) => {
    setOpen(false);
    await onPatch({ state: next.value });
  };

  return (
    <PropertyRow label="Status">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-full border border-transparent px-2.5 py-1.5 text-left text-[15px] text-foreground transition-colors hover:bg-muted",
              open && "border-[#5e6ad2] bg-background shadow-[0_0_0_1px_rgba(94,106,210,0.9)]",
            )}
            data-testid="project-status-trigger"
          >
            <ProjectStatusGlyph status={option.value} />
            <span>{option.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[304px] overflow-hidden rounded-[18px] border border-border/80 bg-popover p-0 text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04]"
        >
          <ProjectStatusMenu
            onBack={() => setOpen(false)}
            onSelect={pick}
            optionTestIdPrefix="project-status-option"
            selected={option.value}
            showHeader
            surface={false}
            testId="project-status-menu"
          />
        </PopoverContent>
      </Popover>
    </PropertyRow>
  );
}

function PriorityRow({
  project,
  onPatch,
}: {
  project: ExtendedProject;
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const rawPriorityValue = String(project.priority || "medium").toLowerCase();
  const rawPriority = rawPriorityValue === "none" ? "medium" : rawPriorityValue;
  const option = PRIORITY_OPTIONS.find((item) => item.value === rawPriority)
    || PRIORITY_OPTIONS.find((item) => item.label.toLowerCase() === priorityLabel(rawPriority).toLowerCase())
    || PRIORITY_OPTIONS.find((item) => item.value === "medium")
    || PRIORITY_OPTIONS[0];

  const pick = async (next: PriorityOption) => {
    setOpen(false);
    await onPatch({ priority: next.value });
  };

  return (
    <PropertyRow label="Priority">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-foreground hover:bg-muted"
            data-testid="project-priority-trigger"
          >
            <PriorityIcon priority={option.value === "none" ? null : option.label} />
            <span>{option.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          {PRIORITY_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => pick(item)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                item.value === option.value && "bg-muted",
              )}
              data-testid={`project-priority-option-${item.value}`}
            >
              <PriorityIcon priority={item.value === "none" ? null : item.label} />
              <span>{item.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </PropertyRow>
  );
}

function UserAvatar({ name, size = 20 }: { name: string | null | undefined; size?: number }) {
  const color = avatarColor(name);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full text-[10px] font-medium text-white"
      style={{ width: size, height: size, background: color }}
    >
      {initials(name)}
    </span>
  );
}

function LeadRow({
  project,
  onPatch,
}: {
  project: ExtendedProject;
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<LinearUser[]>([]);
  const leadName = userName(project.lead || project.lead_name);
  const hasLead = Boolean(project.lead || project.lead_id || project.lead_name);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const response = await readTool("search_users", { query: query || "", limit: 20 });
      if (cancelled) return;
      setUsers(collectionFrom<LinearUser>(response.data, ["users", "results"]));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  const pick = async (user: LinearUser | null) => {
    setOpen(false);
    await onPatch({ lead_id: user?.id ?? null });
  };

  return (
    <PropertyRow label="Lead">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-foreground hover:bg-muted"
            data-testid="project-lead-trigger"
          >
            {hasLead ? (
              <>
                <UserAvatar name={leadName} size={18} />
                <span className="truncate">{leadName}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Set lead</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1">
            <Search size={13} className="text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="inline-grid size-5 place-items-center rounded-full border border-dashed border-muted-foreground/60 text-[10px] text-muted-foreground">
                ?
              </span>
              <span>No lead</span>
            </button>
            {users.map((user) => {
              const label = userName(user);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => pick(user)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  data-testid={`project-lead-option-${user.id}`}
                >
                  <UserAvatar name={label} size={18} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </PropertyRow>
  );
}

function MembersRow({ project }: { project: ExtendedProject }) {
  const [members, setMembers] = useState<LinearUser[]>(project.members || []);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMembers(project.members || []);
  }, [project.members]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const response = await readTool("search_users", { query: query || "", limit: 20 });
      if (cancelled) return;
      setUsers(collectionFrom<LinearUser>(response.data, ["users", "results"]));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  const toggle = async (user: LinearUser) => {
    const exists = members.some((m) => m.id === user.id);
    const next = exists ? members.filter((m) => m.id !== user.id) : [...members, user];
    setMembers(next);
    // Backend doesn't currently expose multi-member updates — skip gracefully.
    const response = await readTool("update_project", {
      id: project.id,
      member_ids: next.map((m) => m.id).filter(Boolean),
    });
    if (response.error) {
      console.warn("update_project member sync not available:", response.error);
    }
  };

  const displayLabel = members.length === 0 ? "Add members" : `${members.length} member${members.length === 1 ? "" : "s"}`;

  return (
    <PropertyRow label="Members">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-foreground hover:bg-muted"
            data-testid="project-members-trigger"
          >
            {members.length === 0 ? (
              <span className="text-muted-foreground">{displayLabel}</span>
            ) : (
              <div className="flex items-center -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <UserAvatar key={m.id} name={userName(m)} size={18} />
                ))}
                {members.length > 4 && (
                  <span className="inline-grid size-[18px] place-items-center rounded-full bg-muted text-[10px] text-muted-foreground">
                    +{members.length - 4}
                  </span>
                )}
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1">
            <Search size={13} className="text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {users.map((user) => {
              const label = userName(user);
              const active = members.some((m) => m.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggle(user)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                    active && "bg-muted",
                  )}
                >
                  <UserAvatar name={label} size={18} />
                  <span className="flex-1 truncate">{label}</span>
                  {active && <span className="text-xs text-[#5e6ad2]">✓</span>}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </PropertyRow>
  );
}

function DateRow({
  label,
  value,
  field,
  onPatch,
}: {
  label: string;
  value: string | null | undefined;
  field: "start_date" | "target_date";
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const save = async () => {
    setOpen(false);
    await onPatch({ [field]: draft || null });
  };

  return (
    <PropertyRow label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-foreground hover:bg-muted"
            data-testid={`project-${field}-trigger`}
          >
            {value ? (
              <span>{formatDate(value)}</span>
            ) : (
              <span className="text-muted-foreground">Set {label.toLowerCase()}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <Input
            type="date"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8"
            data-testid={`project-${field}-input`}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={async () => {
                setDraft("");
                setOpen(false);
                await onPatch({ [field]: null });
              }}
            >
              Clear
            </Button>
            <Button variant="primary" type="button" onClick={save}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </PropertyRow>
  );
}

function TeamRow({ project }: { project: ExtendedProject }) {
  const teamName = useMemo(() => {
    if (!project.team && !project.team_id) return null;
    if (typeof project.team === "string") return project.team;
    return project.team?.name || project.team?.key || project.team_id || null;
  }, [project.team, project.team_id]);

  if (!teamName) {
    return (
      <PropertyRow label="Teams">
        <span className="text-muted-foreground">No team</span>
      </PropertyRow>
    );
  }

  return (
    <PropertyRow label="Teams">
      <Badge variant="outline" className="gap-1.5 text-foreground">
        <span className="inline-block size-2 rounded-sm bg-[#5e6ad2]" />
        <span>{teamName}</span>
      </Badge>
    </PropertyRow>
  );
}

function SlackRow() {
  return (
    <PropertyRow label="Slack channel">
      <span className="text-muted-foreground">Connect channel</span>
    </PropertyRow>
  );
}

function LabelsRow() {
  return (
    <PropertyRow label="Labels">
      <span className="text-muted-foreground">Add label</span>
    </PropertyRow>
  );
}

function ProgressCard({ project, issues }: { project: ExtendedProject; issues: Issue[] }) {
  const [tab, setTab] = useState<"assignees" | "labels">("assignees");
  const [progressOpen, setProgressOpen] = useState(true);

  const progress = (project as Project & { progress?: Record<string, number> | number }).progress;
  const scope = issues.length;
  const completedCount = issues.filter((issue) => {
    const state = String(
      (typeof issue.state === "string"
        ? issue.state
        : issue.state?.name || issue.state?.key) ||
        issue.status ||
        "",
    ).toLowerCase();
    return state.includes("done") || state.includes("complete") || state.includes("passed");
  }).length;
  const percent = scope === 0
    ? 0
    : typeof progress === "number"
      ? Math.round(progress * (progress <= 1 ? 100 : 1))
      : Math.round((completedCount / scope) * 100);

  const assigneeGroups = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    for (const issue of issues) {
      const name = typeof issue.assignee === "string"
        ? issue.assignee
        : userName(issue.assignee) || "Unassigned";
      const state = String(
        (typeof issue.state === "string"
          ? issue.state
          : issue.state?.name || issue.state?.key) ||
          issue.status ||
          "",
      ).toLowerCase();
      const done = state.includes("done") || state.includes("complete") || state.includes("passed");
      const record = map.get(name) || { name, total: 0, done: 0 };
      record.total += 1;
      if (done) record.done += 1;
      map.set(name, record);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [issues]);

  const labelGroups = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    for (const issue of issues) {
      const labels = (issue.labels || []) as Array<{ name?: string } | string>;
      const names = labels.map((label) => (typeof label === "string" ? label : label?.name)).filter(Boolean) as string[];
      const state = String(
        (typeof issue.state === "string"
          ? issue.state
          : issue.state?.name || issue.state?.key) ||
          issue.status ||
          "",
      ).toLowerCase();
      const done = state.includes("done") || state.includes("complete") || state.includes("passed");
      for (const name of names.length ? names : ["No label"]) {
        const record = map.get(name) || { name, total: 0, done: 0 };
        record.total += 1;
        if (done) record.done += 1;
        map.set(name, record);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [issues]);

  return (
    <section className="rounded-xl border border-border bg-background p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]" data-testid="project-progress">
      <button
        type="button"
        className="flex w-full items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6f6f6f] transition-colors hover:text-foreground"
        onClick={() => setProgressOpen((value) => !value)}
      >
        {progressOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Progress
      </button>
      {progressOpen && (
        <div className="mt-2 grid gap-2 px-2">
          <div className="flex items-center gap-3 rounded-md border border-border bg-card p-2">
            <ProgressRing percent={percent} />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Scope</div>
              <div className="text-sm font-medium text-foreground">
                {scope} issues · {completedCount} done
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab("assignees")}
              className={cn(
                "flex-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground",
                tab === "assignees" && "bg-background text-foreground shadow-sm",
              )}
            >
              Assignees
            </button>
            <button
              type="button"
              onClick={() => setTab("labels")}
              className={cn(
                "flex-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground",
                tab === "labels" && "bg-background text-foreground shadow-sm",
              )}
            >
              Labels
            </button>
          </div>
          <div className="grid gap-1">
            {(tab === "assignees" ? assigneeGroups : labelGroups).length === 0 && (
              <span className="px-1 text-xs text-muted-foreground">No data yet.</span>
            )}
            {(tab === "assignees" ? assigneeGroups : labelGroups).slice(0, 5).map((row) => (
              <div
                key={row.name}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-xs"
              >
                {tab === "assignees" ? (
                  <UserAvatar name={row.name} size={16} />
                ) : (
                  <span className="inline-block size-3 rounded-sm bg-muted-foreground/40" />
                )}
                <span className="flex-1 truncate text-foreground">{row.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.done}/{row.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r={radius}
        strokeWidth="3"
        stroke="hsl(var(--muted-foreground))"
        strokeOpacity="0.2"
        fill="none"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        strokeWidth="3"
        stroke="#5e6ad2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        fill="none"
        transform="rotate(-90 18 18)"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        className="fill-foreground"
      >
        {percent}%
      </text>
    </svg>
  );
}
