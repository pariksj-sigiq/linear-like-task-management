import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircleIcon, HistoryIcon, MessageSquareIcon } from "lucide-react";
import type { LinearUser } from "../linearTypes";
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
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => {
    const openQuickCreate = () => setQuickCreateOpen(true);
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
        <AppSidebar
          user={user}
          onLogout={onLogout}
          onOpenCommand={() => setCommandOpen(true)}
          onQuickCreate={() => setQuickCreateOpen(true)}
        />
        <SidebarInset className="min-w-0 bg-sidebar py-2 pl-0 pr-2 pb-0">
          <div className="linear-workspace-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-[0_1px_2px_rgba(15,15,15,0.04),0_12px_28px_rgba(15,15,15,0.05)]">
            <SiteHeader
              title={pageTitle}
              hideNewIssueButton={hideNewIssueButton}
              onOpenCommand={() => setCommandOpen(true)}
              onQuickCreate={() => setQuickCreateOpen(true)}
            />
            <div className="min-h-0 flex-1 overflow-auto">
              {children}
            </div>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-20 flex h-9 shrink-0 items-center justify-between border-t border-[var(--shell-divider)] bg-background px-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Help">
                <HelpCircleIcon />
              </Button>
              <div className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Free plan</div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="gap-1.5">
                <MessageSquareIcon />
                Ask Linear
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="History">
                <HistoryIcon />
              </Button>
            </div>
          </div>
        </SidebarInset>

        <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
        <CommandPalette
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          onQuickCreate={() => setQuickCreateOpen(true)}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}
