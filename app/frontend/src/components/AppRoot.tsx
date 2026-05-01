import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { readTool } from "../api";
import type { LinearUser } from "../linearTypes";
import { PREFERENCE_EVENT, applyUserPreferences, normalizePreferences, type UserPreferences } from "../preferences";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./CommandPalette";
import { QuickCreateModal } from "./QuickCreateModal";
import { Button } from "./ui/button";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { TooltipProvider } from "./ui/tooltip";
import { SiteHeader } from "./site-header";

interface ShellUser extends LinearUser {
  role?: string;
}

interface AppRootProps {
  user: ShellUser | null;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}

const routeLabels: Array<[RegExp, string]> = [
  [/^\/inbox/, "Inbox"],
  [/^\/my-issues/, "My issues"],
  [/^\/projects|^\/project\//, "Projects"],
  [/^\/views/, "Views"],
  [/^\/team\/[^/]+\/projects/, "Projects"],
  [/^\/team\/[^/]+\/views/, "Views"],
  [/^\/team\/[^/]+\/cycles/, "Cycles"],
  [/^\/team\/[^/]+\/settings/, "Team Settings"],
  [/^\/team\/[^/]+/, "Issues"],
  [/^\/roadmap/, "Roadmap"],
  [/^\/search/, "Search"],
  [/^\/settings/, "Settings"],
  [/^\/archive/, "Archive"],
];

export function AppRoot({ user, onLogout, children }: AppRootProps) {
  const location = useLocation();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateInitialProjectId, setQuickCreateInitialProjectId] = useState<string>("");
  const [commandOpen, setCommandOpen] = useState(false);
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const isProjectRoute = location.pathname.startsWith("/project/");
  const isIssueRoute = location.pathname.startsWith("/issue/");
  const isMyIssuesRoute = location.pathname === "/" || location.pathname.startsWith("/my-issues");
  useEffect(() => {
    const openQuickCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      setQuickCreateInitialProjectId(detail?.projectId ?? "");
      setQuickCreateOpen(true);
    };
    const openCommandPalette = () => setCommandOpen(true);

    window.addEventListener("linear:quick-create", openQuickCreate);
    window.addEventListener("linear:command-palette", openCommandPalette);
    return () => {
      window.removeEventListener("linear:quick-create", openQuickCreate);
      window.removeEventListener("linear:command-palette", openCommandPalette);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (!isTyping && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setQuickCreateOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const userId = user?.id && user.id !== "dev-admin" ? user.id : "user_001";
    readTool<{ preferences?: unknown }>("get_user_preferences", { id: userId }).then((response) => {
      if (response.data?.preferences) applyUserPreferences(normalizePreferences(response.data.preferences));
    });

    const onPreferencesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<UserPreferences>).detail;
      if (detail) applyUserPreferences(normalizePreferences(detail));
    };

    window.addEventListener(PREFERENCE_EVENT, onPreferencesUpdated);
    return () => window.removeEventListener(PREFERENCE_EVENT, onPreferencesUpdated);
  }, [user?.id]);

  const pageTitle = useMemo(() => {
    if (location.pathname === "/issue/ELT-21") return "ELT-21 Task verifier zero-state scoring gap";

    const match = routeLabels.find(([pattern]) => pattern.test(location.pathname));
    if (match) return match[1];
    if (location.pathname === "/") return "My Issues";

    return location.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => part.replace(/-/g, " "))
      .join(" / ");
  }, [location.pathname]);

  const hideNewIssueButton =
    location.pathname.startsWith("/team/") ||
    location.pathname.startsWith("/my-issues") ||
    location.pathname.startsWith("/inbox");

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        className="min-h-svh bg-sidebar text-foreground [--header-height:2.75rem]"
      >
        {!isSettingsRoute && (
          <AppSidebar
            user={user}
            onLogout={onLogout}
            onOpenCommand={() => setCommandOpen(true)}
            onQuickCreate={() => setQuickCreateOpen(true)}
          />
        )}
        <SidebarInset className={isSettingsRoute ? "min-w-0 bg-sidebar" : "min-w-0 bg-sidebar py-2 pl-0 pr-2 pb-0"}>
          {isSettingsRoute ? (
            children
          ) : (
            <div className="linear-workspace-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-[0_1px_2px_rgba(15,15,15,0.04),0_12px_28px_rgba(15,15,15,0.05)]">
              {!isProjectRoute && !isIssueRoute && !isMyIssuesRoute && (
                <SiteHeader
                  title={pageTitle}
                  hideNewIssueButton={hideNewIssueButton}
                  onOpenCommand={() => setCommandOpen(true)}
                  onQuickCreate={() => setQuickCreateOpen(true)}
                />
              )}
              <div className="min-h-0 flex-1 overflow-auto">
                {children}
              </div>
            </div>
          )}
          {!isSettingsRoute && <div className="fixed inset-x-0 bottom-0 z-20 flex h-9 shrink-0 items-center justify-between border-t border-[var(--shell-divider)] bg-background px-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Help">
                <LinearHelpIcon />
              </Button>
              <div className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Free plan</div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="gap-1.5">
                <LinearAskIcon />
                Ask Linear
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="History">
                <LinearHistoryIcon />
              </Button>
            </div>
          </div>}
        </SidebarInset>

        {!isSettingsRoute && (
          <>
            <QuickCreateModal
              open={quickCreateOpen}
              onClose={() => {
                setQuickCreateOpen(false);
                setQuickCreateInitialProjectId("");
              }}
              initialProjectId={quickCreateInitialProjectId}
            />
            <CommandPalette
              open={commandOpen}
              onClose={() => setCommandOpen(false)}
              onQuickCreate={() => setQuickCreateOpen(true)}
            />
          </>
        )}
      </SidebarProvider>
    </TooltipProvider>
  );
}

function LinearAskIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" focusable="false">
      <path d="M3.25 2.75h9.5a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5H7.2L3.75 14v-2.75h-.5a1.5 1.5 0 0 1-1.5-1.5v-5.5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinearHistoryIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" focusable="false">
      <path d="M3.2 4.55A5.75 5.75 0 1 1 2.25 8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 1.9v2.65H.55" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 4.75v3.4l2.35 1.45" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinearHelpIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" focusable="false">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.45" />
      <path d="M6.35 6.15a1.78 1.78 0 0 1 1.8-1.45c1.06 0 1.84.66 1.84 1.62 0 .83-.48 1.28-1.22 1.72-.56.34-.75.62-.75 1.18v.18" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11.4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
