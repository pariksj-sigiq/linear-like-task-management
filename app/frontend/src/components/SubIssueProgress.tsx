import type { Issue } from "../linearTypes";
import { issueCompletion } from "../linearTypes";
import { cn } from "../lib/utils";

export function SubIssueProgress({
  issue,
  childrenIssues,
  className,
  testId,
}: {
  issue?: Issue | null;
  childrenIssues?: Issue[];
  className?: string;
  testId?: string;
}) {
  const progress = issueCompletion(issue, childrenIssues);
  if (progress.total === 0) return null;

  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress.ratio);

  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2 text-[13px] font-medium tabular-nums text-muted-foreground",
        className,
      )}
      data-testid={testId}
      aria-label={`${progress.completed} of ${progress.total} sub-issues complete`}
    >
      <svg aria-hidden="true" className="size-4 -rotate-90" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r={radius} stroke="currentColor" strokeWidth="2" className="text-border" />
        <circle
          cx="9"
          cy="9"
          r={radius}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          className="text-[#5f6ad2]"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span>{progress.completed}/{progress.total}</span>
    </span>
  );
}
