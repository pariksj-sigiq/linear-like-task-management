import { Check, ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";

export const PROJECT_STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog", shortcut: "1" },
  { value: "planned", label: "Planned", shortcut: "2" },
  { value: "started", label: "In Progress", shortcut: "3" },
  { value: "qa_requested", label: "QA Requested", shortcut: "4" },
  { value: "in_qa", label: "In QA", shortcut: "5" },
  { value: "changes_requested", label: "Changes Requested", shortcut: "6" },
  { value: "qa_passed", label: "QA Passed", shortcut: "7" },
  { value: "completed", label: "Completed", shortcut: "8" },
  { value: "canceled", label: "Canceled", shortcut: "9" },
] as const;

export type ProjectStatusOption = (typeof PROJECT_STATUS_OPTIONS)[number];
export type ProjectStatusValue = ProjectStatusOption["value"];

export function normalizeProjectStatus(value: unknown): ProjectStatusValue {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  const directOption = PROJECT_STATUS_OPTIONS.find((option) => option.value === normalized);
  if (directOption) return directOption.value;
  if (normalized === "started" || normalized === "active" || normalized === "in_progress") {
    return "started";
  }
  if (normalized === "qa_request" || normalized === "qa_requested" || normalized === "review_requested") {
    return "qa_requested";
  }
  if (normalized === "qa" || normalized === "in_qa" || normalized === "in_review") {
    return "in_qa";
  }
  if (normalized === "changes_requested" || normalized === "change_requested" || normalized === "needs_changes") {
    return "changes_requested";
  }
  if (normalized === "qa_passed" || normalized === "review_passed" || normalized === "passed") {
    return "qa_passed";
  }
  if (normalized === "completed" || normalized === "complete" || normalized === "done") {
    return "completed";
  }
  if (normalized === "canceled" || normalized === "cancelled") {
    return "canceled";
  }
  if (normalized === "planned") {
    return "planned";
  }
  return "backlog";
}

export function getProjectStatusOption(value: unknown): ProjectStatusOption {
  const normalized = normalizeProjectStatus(value);
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === normalized) ?? PROJECT_STATUS_OPTIONS[0];
}

export function ProjectStatusGlyph({
  status,
  size = 16,
  className,
}: {
  status: unknown;
  size?: number;
  className?: string;
}) {
  const normalized = normalizeProjectStatus(status);
  const qaLike = ["started", "qa_requested", "in_qa", "changes_requested", "qa_passed"].includes(normalized);

  if (normalized === "planned") {
    return (
      <svg
        aria-hidden="true"
        className={cn("shrink-0", className)}
        focusable="false"
        height={size}
        viewBox="0 0 16 16"
        width={size}
      >
        <path
          d="M8 1.8 13.25 4.75v6.5L8 14.2l-5.25-2.95v-6.5z"
          fill="none"
          stroke="#9ca3af"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (qaLike) {
    return (
      <svg
        aria-hidden="true"
        className={cn("shrink-0", className)}
        focusable="false"
        height={size}
        viewBox="0 0 16 16"
        width={size}
      >
        <path
          d="M8 1.8 13.25 4.75v6.5L8 14.2l-5.25-2.95v-6.5z"
          fill="none"
          stroke="#f2c400"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M8 4.1v3.95l2.55-1.55"
          fill="none"
          stroke="#f2c400"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.45"
        />
      </svg>
    );
  }

  if (normalized === "completed") {
    return (
      <svg
        aria-hidden="true"
        className={cn("shrink-0", className)}
        focusable="false"
        height={size}
        viewBox="0 0 16 16"
        width={size}
      >
        <circle cx="8" cy="8" r="6.25" fill="#5e6ad2" />
        <path
          d="M5 8.1 7.05 10.1 11.2 5.9"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (normalized === "canceled") {
    return (
      <svg
        aria-hidden="true"
        className={cn("shrink-0", className)}
        focusable="false"
        height={size}
        viewBox="0 0 16 16"
        width={size}
      >
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="#9297a0" strokeWidth="1.8" />
        <path
          d="m5.85 5.85 4.3 4.3m0-4.3-4.3 4.3"
          fill="none"
          stroke="#9297a0"
          strokeLinecap="round"
          strokeWidth="1.65"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      focusable="false"
      height={size}
      viewBox="0 0 16 16"
      width={size}
    >
      <path
        clipRule="evenodd"
        d="m14.94 8.914-1.982-.258a5 5 0 0 0 0-1.312l1.983-.258a7 7 0 0 1 0 1.828M14.47 5.32a7 7 0 0 0-.915-1.581l-1.586 1.218q.4.52.653 1.13zm-2.207-2.874-1.22 1.586a5 5 0 0 0-1.129-.653l.767-1.848c.569.236 1.1.545 1.582.915M8.914 1.06l-.258 1.983a5 5 0 0 0-1.312 0L7.086 1.06a7 7 0 0 1 1.828 0m-3.594.472.767 1.848a5 5 0 0 0-1.13.653L3.74 2.446a7 7 0 0 1 1.581-.915M2.446 3.74l1.586 1.218a5 5 0 0 0-.653 1.13L1.53 5.32a7 7 0 0 1 .915-1.581M1.06 7.086a7 7 0 0 0 0 1.828l1.983-.258a5 5 0 0 1 0-1.312zm.472 3.594 1.848-.767q.254.61.653 1.13l-1.586 1.219a7 7 0 0 1-.915-1.582m2.208 2.874 1.218-1.586q.52.4 1.13.653L5.32 14.47a7 7 0 0 1-1.581-.915m3.347 1.387.258-1.983a5 5 0 0 0 1.312 0l.258 1.983a7 7 0 0 1-1.828 0m3.594-.472-.767-1.848a5 5 0 0 0 1.13-.653l1.219 1.586a7 7 0 0 1-1.582.915m2.874-2.207-1.586-1.22c.265-.344.485-.723.653-1.129l1.848.767a7 7 0 0 1-.915 1.582"
        fill="#f59e0b"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function ProjectStatusMenu({
  selected,
  onSelect,
  disabled,
  testId,
  optionTestIdPrefix,
  className,
  surface = true,
  showHeader = false,
  showCommandHeader = false,
  onBack,
}: {
  selected: unknown;
  onSelect: (option: ProjectStatusOption) => void | Promise<void>;
  disabled?: boolean;
  testId?: string;
  optionTestIdPrefix?: string;
  className?: string;
  surface?: boolean;
  showHeader?: boolean;
  showCommandHeader?: boolean;
  onBack?: () => void;
}) {
  const selectedOption = getProjectStatusOption(selected);

  return (
    <div
      className={cn(
        "overflow-hidden text-[15px] text-popover-foreground",
        surface &&
          "rounded-[18px] border border-border/80 bg-popover shadow-[0_18px_54px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-testid={testId}
      role="menu"
    >
      {showHeader && (
        <div className="flex h-[46px] items-center gap-2.5 border-b border-border/70 px-3.5">
          <button
            type="button"
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
            onClick={onBack}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <ProjectStatusGlyph status="backlog" size={16} />
          <span className="text-[15px] font-semibold text-foreground">Status</span>
        </div>
      )}
      {showCommandHeader && (
        <div className="flex h-[46px] items-center justify-between gap-3 border-b border-border/70 px-4">
          <span className="min-w-0 truncate text-[15px] text-muted-foreground">Change status...</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-border/75 bg-muted/25 px-1.5 font-sans text-[13px] leading-none">
              P
            </kbd>
            <span>then</span>
            <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-border/75 bg-muted/25 px-1.5 font-sans text-[13px] leading-none">
              S
            </kbd>
          </span>
        </div>
      )}
      <div className="p-1.5">
        {PROJECT_STATUS_OPTIONS.map((option) => {
          const selectedRow = option.value === selectedOption.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-checked={selectedRow}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] leading-none text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60",
                selectedRow && "bg-muted",
              )}
              data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}-${option.value}` : undefined}
              disabled={disabled}
              onClick={() => void onSelect(option)}
              role="menuitemradio"
            >
              <ProjectStatusGlyph status={option.value} size={16} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {selectedRow && (
                <Check
                  className="text-foreground"
                  data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}-${option.value}-check` : undefined}
                  size={17}
                  strokeWidth={2.2}
                />
              )}
              <span className="w-4 shrink-0 text-right text-[14px] tabular-nums text-muted-foreground">
                {option.shortcut}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
