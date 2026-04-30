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
import { LayoutGrid, List } from "lucide-react";
import { cn } from "../lib/utils";

export type ProjectsView = "list" | "board";

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

const PROPERTY_LABELS: Record<ProjectDisplayProperty, string> = {
  health: "Health",
  priority: "Priority",
  lead: "Lead",
  target_date: "Target date",
  issues: "Issues",
  status: "Status",
};

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

  const toggle = (key: ProjectDisplayProperty) =>
    onDisplayPropsChange({ ...displayProps, [key]: !displayProps[key] });

  const reset = () => onDisplayPropsChange({ ...DEFAULT_PROJECT_DISPLAY_PROPS });

  return (
    <span ref={rootRef} className="relative inline-flex">
      {trigger}
      {open && (
        <div
          id={menuId}
          role="dialog"
          className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[340px] overflow-hidden rounded-xl bg-popover p-0 text-sm text-popover-foreground shadow-[0_18px_54px_rgba(0,0,0,0.22)] ring-1 ring-foreground/10"
          data-testid="projects-display-menu"
        >
        <div className="p-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
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
          </div>
        </div>

        <div className="border-t border-border/70 px-3 pb-3 pt-2">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {view === "list" ? "List options" : "Board options"}
          </div>
          <div className="mt-1 mb-1.5 text-[12px] font-medium text-foreground">Display properties</div>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_DISPLAY_PROPERTY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "h-6 rounded-md border px-2 text-[12px] font-medium transition-colors",
                  displayProps[key]
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
                data-testid={`projects-display-toggle-${key}`}
                aria-pressed={displayProps[key]}
              >
                {PROPERTY_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 px-3 py-2 text-[13px]">
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
          >
            Reset
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
        "flex h-8 items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}
