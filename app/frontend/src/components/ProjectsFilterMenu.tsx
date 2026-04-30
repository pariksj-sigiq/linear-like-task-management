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
  Check,
  ChevronRight,
  CircleDashed,
  User,
} from "lucide-react";
import type { Project } from "../linearTypes";
import { userName } from "../linearTypes";
import { cn } from "../lib/utils";

export interface ProjectFilters {
  status: string[];
  priority: string[];
  leadId: string[];
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  status: [],
  priority: [],
  leadId: [],
};

export const PROJECT_STATUS_OPTIONS = [
  "Backlog",
  "Planned",
  "In Progress",
  "Completed",
  "Canceled",
];

export const PROJECT_PRIORITY_OPTIONS = [
  { value: "no priority", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type Panel = "root" | "status" | "priority" | "lead";

type MenuTriggerProps = HTMLAttributes<HTMLElement> & {
  onClick?: (event: ReactMouseEvent) => void;
  onKeyDown?: (event: ReactKeyboardEvent) => void;
};

export function projectFiltersCount(filters: ProjectFilters) {
  return filters.status.length + filters.priority.length + filters.leadId.length;
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
  const [panel, setPanel] = useState<Panel>("root");
  const menuId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  const closeMenu = () => {
    setOpen(false);
    setPanel("root");
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

  const leads = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      const id = projectLeadId(project);
      const name = projectLeadName(project);
      if (id && !map.has(id)) map.set(id, name || id);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
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
            if (!next) setPanel("root");
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
        <div
          id={menuId}
          role="dialog"
          className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[280px] overflow-hidden rounded-xl bg-popover p-0 text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.20)] ring-1 ring-foreground/10"
          data-testid="projects-filter-menu"
        >
        {panel === "root" && (
          <RootPanel
            onSelect={(next) => setPanel(next)}
          />
        )}
        {panel === "status" && (
          <OptionPanel
            title="Status"
            back={() => setPanel("root")}
            options={PROJECT_STATUS_OPTIONS.map((value) => ({ value, label: value }))}
            selected={filters.status}
            onToggle={(value) => toggle("status", value)}
            icon={CircleDashed}
          />
        )}
        {panel === "priority" && (
          <OptionPanel
            title="Priority"
            back={() => setPanel("root")}
            options={PROJECT_PRIORITY_OPTIONS}
            selected={filters.priority}
            onToggle={(value) => toggle("priority", value)}
            icon={BarChart3}
          />
        )}
        {panel === "lead" && (
          <OptionPanel
            title="Lead"
            back={() => setPanel("root")}
            options={
              leads.length > 0
                ? leads.map((lead) => ({ value: lead.id, label: lead.name }))
                : [{ value: "__none__", label: "No leads available", disabled: true }]
            }
            selected={filters.leadId}
            onToggle={(value) => toggle("leadId", value)}
            icon={User}
          />
        )}
        </div>
      )}
    </span>
  );
}

function RootPanel({ onSelect }: { onSelect: (panel: Panel) => void }) {
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
          label="Status"
          icon={CircleDashed}
          onClick={() => onSelect("status")}
        />
        <FilterRow
          label="Priority"
          icon={BarChart3}
          iconOverride={<PriorityFilterIcon />}
          onClick={() => onSelect("priority")}
        />
        <FilterRow
          label="Lead"
          icon={User}
          onClick={() => onSelect("lead")}
        />
      </div>
    </div>
  );
}

function FilterRow({
  label,
  icon: Icon,
  iconOverride,
  onClick,
}: {
  label: string;
  icon: typeof CircleDashed;
  iconOverride?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] font-medium text-foreground hover:bg-muted/70"
      data-testid={`projects-filter-row-${label.toLowerCase()}`}
    >
      {iconOverride || <Icon size={15} strokeWidth={2} className="shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
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
  title,
  back,
  options,
  selected,
  onToggle,
  icon: Icon,
}: {
  title: string;
  back: () => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  selected: string[];
  onToggle: (value: string) => void;
  icon: typeof CircleDashed;
}) {
  return (
    <div role="menu" aria-label={`${title} filter`} className="overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={back}
        className="flex h-10 w-full items-center gap-2 border-b border-border/70 px-3 text-left text-[13px] text-muted-foreground hover:bg-muted/60"
      >
        <ChevronRight size={14} className="rotate-180 text-muted-foreground" />
        <Icon size={14} className="text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{title}</span>
      </button>
      <div className="max-h-[320px] overflow-y-auto py-1">
        {options.map(({ value, label, disabled }) => {
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
                  : "text-foreground hover:bg-muted/70",
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
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
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

export function matchesProjectFilters(project: Project, filters: ProjectFilters): boolean {
  if (filters.status.length) {
    const col = String(project.status || project.state || "Backlog");
    const match = filters.status.some((s) =>
      s.toLowerCase() === col.toLowerCase() ||
      col.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(col.toLowerCase()),
    );
    if (!match) return false;
  }
  if (filters.priority.length) {
    const p = String((project as Project & { priority?: string }).priority || "no priority").toLowerCase();
    if (!filters.priority.some((v) => v.toLowerCase() === p)) return false;
  }
  if (filters.leadId.length) {
    const leadId = projectLeadId(project).toLowerCase();
    if (!filters.leadId.some((v) => v.toLowerCase() === leadId)) return false;
  }
  return true;
}
