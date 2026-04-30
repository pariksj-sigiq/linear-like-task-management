import type { ReactNode } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { cn } from "../lib/utils";

export function LinearBoard({
  children,
  className,
  testId,
  label,
}: {
  children: ReactNode;
  className?: string;
  testId: string;
  label: string;
}) {
  return (
    <div
      className={cn("flex h-full min-h-[480px] gap-0 overflow-x-auto", className)}
      data-testid={testId}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function LinearBoardColumn({
  children,
  label,
  count,
  icon,
  testId,
  createLabel,
  menuLabel,
  onCreate,
}: {
  children: ReactNode;
  label: string;
  count: number | string;
  icon?: ReactNode;
  testId: string;
  createLabel?: string;
  menuLabel?: string;
  onCreate?: () => void;
}) {
  return (
    <section
      className="flex w-[320px] shrink-0 flex-col border-r border-border/70 last:border-r-0"
      data-testid={testId}
    >
      <div className="flex h-9 items-center gap-2 px-3">
        {icon}
        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{label}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">{count}</span>
        <span className="flex-1" />
        <button
          type="button"
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted/60"
          aria-label={menuLabel || `${label} options`}
          tabIndex={-1}
        >
          <MoreHorizontal size={14} />
        </button>
        <button
          type="button"
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted/60"
          aria-label={createLabel || `Create in ${label}`}
          onClick={onCreate}
          tabIndex={onCreate ? 0 : -1}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto px-2 pb-4 pt-1">{children}</div>
    </section>
  );
}

export function LinearBoardCard({
  children,
  className,
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-muted/40",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
