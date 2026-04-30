import { LayoutGrid, List } from "lucide-react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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
  children: React.ReactNode;
}) {
  const toggle = (key: ProjectDisplayProperty) =>
    onDisplayPropsChange({ ...displayProps, [key]: !displayProps[key] });

  const reset = () => onDisplayPropsChange({ ...DEFAULT_PROJECT_DISPLAY_PROPS });

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[340px] p-0"
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
      </PopoverContent>
    </Popover>
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
