import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ChartNoAxesGantt, Check, ChevronDown, LayoutGrid, List } from "lucide-react";
import { cn } from "../lib/utils";

export type ProjectsView = "list" | "board" | "timeline";

export const PROJECT_DISPLAY_PROPERTY_KEYS = [
  "health",
  "priority",
  "lead",
  "target_date",
  "issues",
  "status",
] as const;

export type ProjectDisplayProperty = (typeof PROJECT_DISPLAY_PROPERTY_KEYS)[number];

export type ProjectsDisplayProps = Record<ProjectDisplayProperty, boolean>;

export const DEFAULT_PROJECT_DISPLAY_PROPS: ProjectsDisplayProps = {
  health: true,
  priority: true,
  lead: true,
  target_date: true,
  issues: true,
  status: true,
};

const DISPLAY_PROPERTY_OPTIONS = [
  { key: "milestones", label: "Milestones", defaultActive: true },
  { key: "description", label: "Description", defaultActive: true },
  { key: "priority", label: "Priority", defaultActive: true },
  { key: "status", label: "Status", defaultActive: true },
  { key: "health", label: "Health", defaultActive: true },
  { key: "teams", label: "Teams", defaultActive: false },
  { key: "initiatives", label: "Initiatives", defaultActive: false },
  { key: "lead", label: "Lead", defaultActive: true },
  { key: "members", label: "Members", defaultActive: false },
  { key: "dependencies", label: "Dependencies", defaultActive: false },
  { key: "start_date", label: "Start date", defaultActive: false },
  { key: "target_date", label: "Target date", defaultActive: true },
  { key: "issues", label: "Issues", defaultActive: true },
  { key: "created", label: "Created", defaultActive: false },
  { key: "updated", label: "Updated", defaultActive: false },
  { key: "completed", label: "Completed", defaultActive: false },
  { key: "labels", label: "Labels", defaultActive: false },
] as const;

type ExtraDisplayProperty = Exclude<
  (typeof DISPLAY_PROPERTY_OPTIONS)[number]["key"],
  ProjectDisplayProperty
>;

const DEFAULT_EXTRA_DISPLAY_PROPS = DISPLAY_PROPERTY_OPTIONS.reduce<Record<ExtraDisplayProperty, boolean>>(
  (acc, option) => {
    if (!PROJECT_DISPLAY_PROPERTY_KEYS.includes(option.key as ProjectDisplayProperty)) {
      acc[option.key as ExtraDisplayProperty] = option.defaultActive;
    }
    return acc;
  },
  {} as Record<ExtraDisplayProperty, boolean>,
);

type MenuTriggerProps = HTMLAttributes<HTMLElement> & {
  onClick?: (event: ReactMouseEvent) => void;
  onKeyDown?: (event: ReactKeyboardEvent) => void;
};

export function ProjectsDisplayMenu({
  view,
  onViewChange,
  displayProps,
  onDisplayPropsChange,
  children,
}: {
  view: ProjectsView;
  onViewChange: (view: ProjectsView) => void;
  displayProps: ProjectsDisplayProps;
  onDisplayPropsChange: (next: ProjectsDisplayProps) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showEmptyColumns, setShowEmptyColumns] = useState(true);
  const [extraDisplayProps, setExtraDisplayProps] = useState<Record<ExtraDisplayProperty, boolean>>({
    ...DEFAULT_EXTRA_DISPLAY_PROPS,
  });
  const menuId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const dismissOnOutsidePointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointer, true);
    document.addEventListener("mousedown", dismissOnOutsidePointer, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer, true);
      document.removeEventListener("mousedown", dismissOnOutsidePointer, true);
    };
  }, [open]);

  let trigger = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<MenuTriggerProps>;
    trigger = cloneElement(child, {
          "aria-controls": open ? menuId : undefined,
          "aria-expanded": open,
          onClick: (event: ReactMouseEvent) => {
            child.props.onClick?.(event);
            if (!event.defaultPrevented) setOpen((value) => !value);
          },
          onKeyDown: (event: ReactKeyboardEvent) => {
            child.props.onKeyDown?.(event);
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          },
    });
  }

  const toggle = (key: (typeof DISPLAY_PROPERTY_OPTIONS)[number]["key"]) => {
    if (PROJECT_DISPLAY_PROPERTY_KEYS.includes(key as ProjectDisplayProperty)) {
      const prop = key as ProjectDisplayProperty;
      onDisplayPropsChange({ ...displayProps, [prop]: !displayProps[prop] });
      return;
    }
    setExtraDisplayProps((current) => ({
      ...current,
      [key as ExtraDisplayProperty]: !current[key as ExtraDisplayProperty],
    }));
  };

  const reset = () => {
    setShowEmptyColumns(true);
    setExtraDisplayProps({ ...DEFAULT_EXTRA_DISPLAY_PROPS });
    onDisplayPropsChange({ ...DEFAULT_PROJECT_DISPLAY_PROPS });
  };

  const isPropertyActive = (key: (typeof DISPLAY_PROPERTY_OPTIONS)[number]["key"]) => {
    if (PROJECT_DISPLAY_PROPERTY_KEYS.includes(key as ProjectDisplayProperty)) {
      return displayProps[key as ProjectDisplayProperty];
    }
    return extraDisplayProps[key as ExtraDisplayProperty];
  };

  return (
    <span ref={rootRef} className="relative inline-flex">
      {trigger}
      {open && (
        <div
          id={menuId}
          role="dialog"
          className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-popover p-0 text-[13px] text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.03] dark:border-[#2d2d2d]"
          data-testid="projects-display-menu"
        >
          <div className="flex gap-2 px-4 pb-4 pt-4">
            <ViewTab
              active={view === "list"}
              onClick={() => onViewChange("list")}
              icon={List}
              label="List"
              testId="projects-view-list"
            />
            <ViewTab
              active={view === "board"}
              onClick={() => onViewChange("board")}
              icon={LayoutGrid}
              label="Board"
              testId="projects-view-board"
            />
            <ViewTab
              active={view === "timeline"}
              onClick={() => onViewChange("timeline")}
              icon={ChartNoAxesGantt}
              label="Timeline"
              testId="projects-view-timeline"
            />
          </div>

          <div className="space-y-3 px-4 pb-4">
            <OptionRow label="Columns" value="Status" />
            <OptionRow label="Rows" value="No grouping" />
            <OptionRow label="Ordering" value="Manual" />
          </div>

          <div className="border-t border-[#e5e5e5] px-4 py-3 dark:border-[#2d2d2d]">
            <OptionRow label="Show closed projects" value="All" />
          </div>

          <div className="border-t border-[#e5e5e5] px-4 pb-4 pt-3 dark:border-[#2d2d2d]">
            <div className="mb-3 text-[13px] font-medium text-foreground">Board options</div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-[#6f6f6f] dark:text-[#a3a3a3]">Show empty columns</span>
              <Switch checked={showEmptyColumns} onClick={() => setShowEmptyColumns((value) => !value)} />
            </div>
            <div className="mb-2 text-[13px] text-[#6f6f6f] dark:text-[#a3a3a3]">Display properties</div>
            <div className="flex flex-wrap gap-1.5">
              {DISPLAY_PROPERTY_OPTIONS.map((option) => {
                const active = isPropertyActive(option.key);
                const knownKey = PROJECT_DISPLAY_PROPERTY_KEYS.includes(option.key as ProjectDisplayProperty)
                  ? (option.key as ProjectDisplayProperty)
                  : null;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggle(option.key)}
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-2.5 text-[13px] font-medium leading-none transition-colors",
                      active
                        ? "border-[#d9d9d9] bg-[#eeeeee] text-[#303030] dark:border-[#3a3a3a] dark:bg-[#303030] dark:text-[#eeeeee]"
                        : "border-[#e5e5e5] bg-background text-[#6f6f6f] hover:bg-muted dark:border-[#333333] dark:text-[#a3a3a3]",
                    )}
                    data-testid={knownKey ? `projects-display-toggle-${knownKey}` : `projects-display-toggle-${option.key}`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-5 border-t border-[#e5e5e5] px-4 py-3 text-[13px] dark:border-[#2d2d2d]">
            <button type="button" onClick={reset} className="text-[#303030] hover:text-foreground dark:text-[#eeeeee]">
              Reset
            </button>
            <button type="button" className="font-medium text-[#5e6ad2] hover:text-[#4f5acb]">
              Set default for everyone
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        "flex h-8 min-w-[92px] flex-1 items-center justify-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-[#dcdcdc] bg-[#eeeeee] text-[#303030] shadow-sm dark:border-[#3a3a3a] dark:bg-[#303030] dark:text-[#eeeeee]"
          : "border-[#e7e7e7] bg-background text-[#5f6368] hover:bg-muted dark:border-[#333333] dark:text-[#b3b3b3]",
      )}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function OptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <span className="text-[13px] text-[#6f6f6f] dark:text-[#a3a3a3]">{label}</span>
      <button
        type="button"
        className="inline-flex h-8 min-w-[96px] items-center justify-between gap-2 rounded-lg border border-[#e5e5e5] bg-background px-2.5 text-[13px] text-[#303030] shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-[#333333] dark:text-[#eeeeee]"
      >
        <span>{value}</span>
        <ChevronDown size={14} className="text-[#6f6f6f] dark:text-[#a3a3a3]" />
      </button>
    </div>
  );
}

function Switch({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-checked={checked}
      role="switch"
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-[#6c72d8]" : "bg-[#d1d5db] dark:bg-[#4a4a4a]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
      {checked && <Check size={10} className="absolute left-1 top-[5px] text-white/80" />}
    </button>
  );
}
