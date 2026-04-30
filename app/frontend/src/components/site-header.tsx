import { BellIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "./ui/button";

export function SiteHeader({
  title,
  // Kept for API compatibility; ignored (global New issue moved to sidebar + `c` shortcut).
  hideNewIssueButton: _hideNewIssueButton,
  onOpenCommand: _onOpenCommand,
  onQuickCreate: _onQuickCreate,
}: {
  title: string;
  hideNewIssueButton?: boolean;
  onOpenCommand: () => void;
  onQuickCreate: () => void;
}) {
  const isTeamIssues = title === "Issues";
  const isIssueDetail = title.startsWith("ELT-");

  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isTeamIssues && (
            <span className="mr-1 flex size-4 items-center justify-center text-[#5d85ff]">
              <ShopIcon />
            </span>
          )}
          <h1 className="truncate text-[14px] font-medium text-[var(--text-primary)]">{title}</h1>
          {isIssueDetail && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="More issue actions"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <MoreHorizontalIcon className="size-[14px]" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {isTeamIssues && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Notifications"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <BellIcon className="size-[14px]" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function ShopIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path d="M4.929 7.495C4.997 7.227 5.214 7 5.49 7s.493.227.561.495a2 2 0 0 0 3.877 0c.068-.268.285-.495.562-.495.276 0 .493.227.561.495a2 2 0 0 0 3.925-.26.8.8 0 0 0-.092-.446l-2.618-5.236A1 1 0 0 0 11.373 1H4.609a1 1 0 0 0-.895.553L1.096 6.789a.8.8 0 0 0-.092.447 2 2 0 0 0 3.925.259" />
      <path d="M3.01 10a3 3 0 0 0 2.5-1.342A3 3 0 0 0 8.01 10a3 3 0 0 0 2.5-1.342 2.996 2.996 0 0 0 3.48 1.179V13.5a1.5 1.5 0 0 1-1.5 1.5H10.5a.5.5 0 0 1-.5-.5V13a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1.5a.5.5 0 0 1-.5.5H3.49a1.5 1.5 0 0 1-1.5-1.5V9.822A3 3 0 0 0 3.01 10" />
    </svg>
  );
}
