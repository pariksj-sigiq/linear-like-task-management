import { InboxIcon, PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export function SiteHeader({
  title,
  hideNewIssueButton,
  onOpenCommand,
  onQuickCreate,
}: {
  title: string;
  hideNewIssueButton?: boolean;
  onOpenCommand: () => void;
  onQuickCreate: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-4 px-6">
        {/* Left side: Page title */}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h1>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Search button with ⌘K */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenCommand}
            data-testid="command-palette-topbar-button"
            className="gap-2"
          >
            <SearchIcon className="size-[15px]" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-[var(--border)] bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] md:inline-flex">
              ⌘K
            </kbd>
          </Button>

          {/* New issue button - hidden on certain pages */}
          {!hideNewIssueButton && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onQuickCreate}
              data-testid="quick-create-topbar-button"
              className="gap-1.5 bg-[var(--primary)] text-[var(--primary-text)] hover:bg-[var(--primary-hover)]"
            >
              <PlusIcon className="size-[15px]" />
              <span className="hidden sm:inline">New issue</span>
            </Button>
          )}

          {/* Inbox icon button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/inbox")}
            aria-label="Inbox"
            data-testid="inbox-button"
          >
            <InboxIcon className="size-[15px]" />
          </Button>

          {/* Settings icon button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/settings/workspace")}
            aria-label="Settings"
            data-testid="settings-button"
          >
            <SettingsIcon className="size-[15px]" />
          </Button>
        </div>
      </div>
    </header>
  );
}
