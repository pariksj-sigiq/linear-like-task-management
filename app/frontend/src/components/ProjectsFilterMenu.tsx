import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  BarChart3,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Tag,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Label, LinearUser, Project } from "../linearTypes";
import { avatarColor, initials, userName } from "../linearTypes";
import { cn } from "../lib/utils";
import { PriorityIcon } from "./IssueExplorer";
import {
  PROJECT_STATUS_OPTIONS as PROJECT_STATUS_FILTER_OPTIONS,
  ProjectStatusGlyph,
  getProjectStatusOption,
} from "./project/ProjectStatusPicker";

export interface ProjectFilters {
  status: string[];
  priority: string[];
  leadId: string[];
  memberId: string[];
  dates: string[];
  team: string[];
  label: string[];
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  status: [],
  priority: [],
  leadId: [],
  memberId: [],
  dates: [],
  team: [],
  label: [],
};

export const PROJECT_PRIORITY_OPTIONS = [
  { value: "no priority", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type Panel = "status" | "lead" | "members" | "priority" | "dates" | "teams" | "labels";
type FilterOption = { value: string; label: string; count?: string; icon: ReactNode; disabled?: boolean };

type MenuTriggerProps = HTMLAttributes<HTMLElement> & {
  onClick?: (event: ReactMouseEvent) => void;
  onKeyDown?: (event: ReactKeyboardEvent) => void;
};

export function projectFiltersCount(filters: ProjectFilters) {
  return filters.status.length
    + filters.priority.length
    + filters.leadId.length
    + filters.memberId.length
    + filters.dates.length
    + filters.team.length
    + filters.label.length;
}

export function ProjectsFilterMenu({
  filters,
  onChange,
  projects,
  children,
}: {
  filters: ProjectFilters;
  onChange: (next: ProjectFilters) => void;
  projects: Project[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("status");
  const menuId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  const closeMenu = () => {
    setOpen(false);
    setPanel("status");
  };

  useEffect(() => {
    if (!open) return;

    const dismissOnOutsidePointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && rootRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointer, true);
    document.addEventListener("mousedown", dismissOnOutsidePointer, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer, true);
      document.removeEventListener("mousedown", dismissOnOutsidePointer, true);
    };
  }, [open]);

  const optionCounts = useMemo(() => projectFilterOptionCounts(projects), [projects]);

  const people = useMemo(() => {
    const leads = new Map<string, string>();
    const members = new Map<string, string>();
    projects.forEach((project) => {
      const leadId = projectLeadId(project);
      if (leadId && !leads.has(leadId)) leads.set(leadId, projectLeadName(project) || leadId);
      projectMembers(project).forEach((member) => {
        const id = memberId(member);
        if (id && !members.has(id)) members.set(id, userName(member) || id);
      });
    });
    return {
      leads: Array.from(leads, ([id, name]) => ({ id, name })),
      members: Array.from(members, ([id, name]) => ({ id, name })),
    };
  }, [projects]);

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      const id = projectTeamId(project);
      const name = projectTeamName(project);
      if (id && !map.has(id)) map.set(id, name || id);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [projects]);

  const labels = useMemo(() => {
    const map = new Map<string, Label>();
    projects.forEach((project) => {
      (project.labels || []).forEach((label) => {
        const id = label.id || label.name || "";
        if (id && !map.has(id)) map.set(id, label);
      });
    });
    return Array.from(map.values());
  }, [projects]);

  const toggle = (key: keyof ProjectFilters, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  let trigger = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<MenuTriggerProps>;
    trigger = cloneElement(child, {
      "aria-controls": open ? menuId : undefined,
      "aria-expanded": open,
      onClick: (event: ReactMouseEvent) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen((value) => {
            const next = !value;
            if (!next) setPanel("status");
            return next;
          });
        }
      },
      onKeyDown: (event: ReactKeyboardEvent) => {
        child.props.onKeyDown?.(event);
        if (event.key === "Escape") {
          event.stopPropagation();
          closeMenu();
        }
      },
    });
  }

  return (
    <span ref={rootRef} className="relative inline-flex">
      {trigger}
      {open && (
        <>
          <div
            role="menu"
            aria-label={`${panel} project filter options`}
            className="absolute right-[292px] top-[calc(100%+6px)] z-[70] w-[286px] overflow-hidden rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.22)] dark:border-[#2a2a2e] dark:bg-[#1c1c1f]"
            data-testid="projects-filter-options-menu"
          >
            <OptionPanel
              options={projectPanelOptions(panel, {
                leads: people.leads,
                members: people.members,
                teams,
                labels,
                counts: optionCounts,
              })}
              selected={projectSelectedFilters(panel, filters)}
              onToggle={(value) => {
                if (panel === "status") toggle("status", value);
                if (panel === "lead") toggle("leadId", value);
                if (panel === "members") toggle("memberId", value);
                if (panel === "priority") toggle("priority", value);
                if (panel === "dates") toggle("dates", value);
                if (panel === "teams") toggle("team", value);
                if (panel === "labels") toggle("label", value);
              }}
            />
          </div>
          <div
            id={menuId}
            role="dialog"
            className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[280px] overflow-hidden rounded-xl border border-border/90 bg-popover p-0 text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.22)] dark:border-[#2a2a2e] dark:bg-[#1c1c1f]"
            data-testid="projects-filter-menu"
          >
          <RootPanel
            activePanel={panel}
            onSelect={(next) => setPanel(next)}
          />
          </div>
        </>
      )}
    </span>
  );
}

function RootPanel({ activePanel, onSelect }: { activePanel: Panel; onSelect: (panel: Panel) => void }) {
  return (
    <div role="menu" aria-label="Project filters" className="overflow-hidden rounded-xl">
      <div className="flex h-10 items-center gap-2 border-b border-border/70 px-3 text-[13px] text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">Add Filter...</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          F
        </kbd>
      </div>
      <div className="py-1">
        <FilterRow
          active={activePanel === "status"}
          label="Status"
          icon={CircleDashed}
          onClick={() => onSelect("status")}
        />
        <FilterRow
          active={activePanel === "lead"}
          label="Lead"
          icon={User}
          onClick={() => onSelect("lead")}
        />
        <FilterRow
          active={activePanel === "members"}
          label="Members"
          icon={Users}
          onClick={() => onSelect("members")}
        />
        <FilterRow
          active={activePanel === "priority"}
          label="Priority"
          icon={BarChart3}
          iconOverride={<PriorityFilterIcon />}
          onClick={() => onSelect("priority")}
        />
        <FilterRow
          active={activePanel === "dates"}
          label="Dates"
          icon={CalendarDays}
          onClick={() => onSelect("dates")}
        />
        <FilterRow
          active={activePanel === "teams"}
          label="Teams"
          icon={Box}
          onClick={() => onSelect("teams")}
        />
        <FilterRow
          active={activePanel === "labels"}
          label="Labels"
          icon={Tag}
          onClick={() => onSelect("labels")}
        />
      </div>
    </div>
  );
}

function FilterRow({
  active,
  label,
  icon: Icon,
  iconOverride,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  iconOverride?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={onClick}
      onMouseMove={onClick}
      onPointerEnter={onClick}
      onFocus={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 px-3 text-left text-[13px] font-medium text-foreground hover:bg-muted/70 dark:text-[#c9c9ce] dark:hover:bg-[#252529]",
        active && "bg-muted/70 dark:bg-[#252529]",
      )}
      data-testid={`projects-filter-row-${label.toLowerCase()}`}
    >
      {iconOverride || <Icon size={15} strokeWidth={2} className="shrink-0 text-muted-foreground dark:text-[#9d9da4]" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground dark:text-[#85858c]" />
    </button>
  );
}

function PriorityFilterIcon() {
  return (
    <span className="flex size-[15px] shrink-0 items-end gap-[2px] text-muted-foreground">
      <span className="h-[5px] w-[3px] rounded-[1px] bg-current" />
      <span className="h-[8px] w-[3px] rounded-[1px] bg-current" />
      <span className="h-[11px] w-[3px] rounded-[1px] bg-current" />
    </span>
  );
}

function OptionPanel({
  options,
  selected,
  onToggle,
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex h-10 items-center border-b border-border/80 px-3 text-[13px] text-muted-foreground dark:border-[#29292d]">
        Filter...
      </div>
      <div className="max-h-[320px] overflow-y-auto py-1">
        {options.map(({ value, label, count, icon, disabled }) => {
          const isChecked = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onToggle(value)}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px]",
                disabled
                  ? "cursor-not-allowed text-muted-foreground"
                  : "text-foreground hover:bg-muted/70 dark:text-[#c9c9ce] dark:hover:bg-[#252529]",
              )}
              data-testid={`projects-filter-option-${value.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-sm border",
                  isChecked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background",
                )}
              >
                {isChecked && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="grid size-4 shrink-0 place-items-center text-muted-foreground dark:text-[#9d9da4]">{icon}</span>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {count && <span className="shrink-0 text-[12px] text-muted-foreground">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function projectPanelOptions(
  panel: Panel,
  data: {
    leads: Array<{ id: string; name: string }>;
    members: Array<{ id: string; name: string }>;
    teams: Array<{ id: string; name: string }>;
    labels: Label[];
    counts: Map<string, number>;
  },
): FilterOption[] {
  if (panel === "status") {
    return PROJECT_STATUS_FILTER_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      count: formatCount(data.counts.get(`status:${option.value}`), "project"),
      icon: <ProjectStatusGlyph status={option.value} size={13} />,
    }));
  }
  if (panel === "lead") {
    return data.leads.length
      ? data.leads.map((lead) => ({
        value: lead.id,
        label: lead.name,
        count: formatCount(data.counts.get(`lead:${lead.id}`), "project"),
        icon: <AvatarMini name={lead.name} />,
      }))
      : [{ value: "__none__", label: "No leads available", icon: <User size={13} />, disabled: true }];
  }
  if (panel === "members") {
    return data.members.length
      ? data.members.map((member) => ({
        value: member.id,
        label: member.name,
        count: formatCount(data.counts.get(`member:${member.id}`), "project"),
        icon: <AvatarMini name={member.name} />,
      }))
      : [{ value: "__none__", label: "No members available", icon: <Users size={13} />, disabled: true }];
  }
  if (panel === "priority") {
    return PROJECT_PRIORITY_OPTIONS.map((option) => ({
      ...option,
      count: formatCount(data.counts.get(`priority:${option.value}`), "project"),
      icon: option.value === "no priority"
        ? <NoPriorityMini />
        : option.value === "urgent"
          ? <span className="grid size-4 place-items-center rounded bg-[#ef5c42] text-[11px] font-bold text-white">!</span>
          : <PriorityIcon priority={option.label} />,
    }));
  }
  if (panel === "dates") {
    return [
      { value: "overdue", label: "Overdue", count: formatCount(data.counts.get("date:overdue"), "project"), icon: <Clock3 size={13} /> },
      { value: "this_week", label: "This week", count: formatCount(data.counts.get("date:this_week"), "project"), icon: <CalendarDays size={13} /> },
      { value: "this_month", label: "This month", count: formatCount(data.counts.get("date:this_month"), "project"), icon: <CalendarDays size={13} /> },
      { value: "later", label: "Later", count: formatCount(data.counts.get("date:later"), "project"), icon: <CalendarDays size={13} /> },
      { value: "no_date", label: "No target date", count: formatCount(data.counts.get("date:no_date"), "project"), icon: <CalendarDays size={13} /> },
    ];
  }
  if (panel === "teams") {
    return data.teams.length
      ? data.teams.map((team) => ({
        value: team.id,
        label: team.name,
        count: formatCount(data.counts.get(`team:${team.id}`), "project"),
        icon: <Box size={13} />,
      }))
      : [{ value: "__none__", label: "No teams available", icon: <Box size={13} />, disabled: true }];
  }
  return data.labels.length
    ? data.labels.map((label) => ({
      value: label.id || label.name || "",
      label: label.name || label.id || "Label",
      count: formatCount(data.counts.get(`label:${label.id || label.name}`), "project"),
      icon: <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color || "#5e6ad2" }} />,
    }))
    : [{ value: "__none__", label: "No labels available", icon: <Tag size={13} />, disabled: true }];
}

function projectSelectedFilters(panel: Panel, filters: ProjectFilters) {
  if (panel === "status") return filters.status;
  if (panel === "lead") return filters.leadId;
  if (panel === "members") return filters.memberId;
  if (panel === "priority") return filters.priority;
  if (panel === "dates") return filters.dates;
  if (panel === "teams") return filters.team;
  return filters.label;
}

function projectFilterOptionCounts(projects: Project[]) {
  const counts = new Map<string, number>();
  const add = (key: string) => counts.set(key, (counts.get(key) || 0) + 1);
  projects.forEach((project) => {
    add(`status:${getProjectStatusOption(project.state || project.status).value}`);
    add(`priority:${projectPriorityValue(project)}`);
    const leadId = projectLeadId(project);
    if (leadId) add(`lead:${leadId}`);
    projectMembers(project).forEach((member) => {
      const id = memberId(member);
      if (id) add(`member:${id}`);
    });
    projectDateBuckets(project).forEach((bucket) => add(`date:${bucket}`));
    const teamId = projectTeamId(project);
    if (teamId) add(`team:${teamId}`);
    (project.labels || []).forEach((label) => {
      const id = label.id || label.name;
      if (id) add(`label:${id}`);
    });
  });
  return counts;
}

function formatCount(count: number | undefined, noun: string) {
  if (!count) return undefined;
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function AvatarMini({ name }: { name: string }) {
  return (
    <span
      className="grid size-4 place-items-center rounded-full text-[7px] font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  );
}

function NoPriorityMini() {
  return (
    <span className="flex size-4 items-center justify-center gap-[2px] text-muted-foreground">
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
      <span className="h-[2px] w-[3px] rounded-full bg-current" />
    </span>
  );
}

function projectLeadId(project: Project): string {
  if (project.lead && typeof project.lead === "object") {
    const lead = project.lead as { id?: string; username?: string; email?: string };
    return lead.id || lead.username || lead.email || "";
  }
  return String(project.lead || project.lead_username || "");
}

function projectLeadName(project: Project): string {
  return userName(project.lead || project.lead_name || "");
}

function projectMembers(project: Project): LinearUser[] {
  return ((project as Project & { members?: LinearUser[] }).members || []).filter(Boolean);
}

function memberId(member: LinearUser): string {
  return member.id || member.username || member.email || userName(member);
}

function projectTeamId(project: Project): string {
  const team = (project as Project & { team?: { id?: string; key?: string; name?: string } | string | null; team_id?: string | null }).team;
  if (team && typeof team === "object") return team.id || team.key || team.name || "";
  return String(team || (project as Project & { team_id?: string }).team_id || "");
}

function projectTeamName(project: Project): string {
  const team = (project as Project & { team?: { id?: string; key?: string; name?: string } | string | null }).team;
  if (team && typeof team === "object") return team.name || team.key || team.id || "";
  return String(team || projectTeamId(project));
}

function projectPriorityValue(project: Project): string {
  const raw = String((project as Project & { priority?: string }).priority || "").trim().toLowerCase();
  if (!raw || raw === "none" || raw === "0") return "no priority";
  if (raw.includes("urgent") || raw === "1") return "urgent";
  if (raw.includes("high") || raw === "2") return "high";
  if (raw.includes("medium") || raw === "3") return "medium";
  if (raw.includes("low") || raw === "4") return "low";
  return raw;
}

function projectDateBuckets(project: Project): string[] {
  const date = parseProjectDate(project.target_date);
  if (!date) return ["no_date"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  if (date < today) return ["overdue"];
  if (date < endOfWeek) return ["this_week", "this_month"];
  if (date < endOfMonth) return ["this_month"];
  return ["later"];
}

function parseProjectDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function matchesProjectFilters(project: Project, filters: ProjectFilters): boolean {
  if (filters.status.length) {
    const status = getProjectStatusOption(project.state || project.status);
    const match = filters.status.some((s) =>
      s.toLowerCase() === status.value.toLowerCase() ||
      s.toLowerCase() === status.label.toLowerCase(),
    );
    if (!match) return false;
  }
  if (filters.priority.length) {
    const p = projectPriorityValue(project);
    if (!filters.priority.some((v) => v.toLowerCase() === p)) return false;
  }
  if (filters.leadId.length) {
    const leadId = projectLeadId(project).toLowerCase();
    if (!filters.leadId.some((v) => v.toLowerCase() === leadId)) return false;
  }
  if (filters.memberId.length) {
    const ids = projectMembers(project).map((member) => memberId(member).toLowerCase());
    if (!filters.memberId.some((value) => ids.includes(value.toLowerCase()))) return false;
  }
  if (filters.dates.length) {
    const buckets = projectDateBuckets(project);
    if (!filters.dates.some((value) => buckets.includes(value))) return false;
  }
  if (filters.team.length) {
    const teamId = projectTeamId(project).toLowerCase();
    if (!filters.team.some((value) => value.toLowerCase() === teamId)) return false;
  }
  if (filters.label.length) {
    const labels = (project.labels || []).map((label) => (label.id || label.name || "").toLowerCase());
    if (!filters.label.some((value) => labels.includes(value.toLowerCase()))) return false;
  }
  return true;
}
