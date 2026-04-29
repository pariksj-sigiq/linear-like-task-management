import { ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Boxes,
  ChevronRight,
  CircleDashed,
  FolderKanban,
  HelpCircle,
  History,
  Inbox,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  SquarePen,
  UserRoundCheck,
  View,
} from "lucide-react";
import type { LinearUser } from "../linearTypes";
import { Button, Kbd } from "./ui";
import { QuickCreateModal } from "./QuickCreateModal";
import { CommandPalette } from "./CommandPalette";

interface ShellUser extends LinearUser {
  role?: string;
}

interface LinearShellProps {
  user: ShellUser | null;
  onLogout: () => void;
  children: ReactNode;
}

const primaryNav = [
  { label: "Inbox", path: "/inbox", icon: Inbox, testId: "nav-inbox", badge: "99+" },
  { label: "My issues", path: "/my-issues/activity", icon: UserRoundCheck, testId: "nav-my-issues" },
];

const workspaceNav = [
  { label: "Projects", path: "/projects/all", icon: FolderKanban, testId: "nav-projects" },
  { label: "Views", path: "/views", icon: View, testId: "nav-views" },
  { label: "More", path: "/roadmap", icon: MoreHorizontal, testId: "nav-roadmap" },
];

const teamNav = [
  { label: "Issues", segment: "active", icon: CircleDashed },
  { label: "Projects", segment: "projects", icon: FolderKanban },
  { label: "Views", segment: "views", icon: View },
];

const teams = [{ key: "ELT", name: "Eltsuh" }];

export function LinearShell({ children }: LinearShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const openQuickCreate = () => setQuickCreateOpen(true);
    window.addEventListener("linear:quick-create", openQuickCreate);
    return () => window.removeEventListener("linear:quick-create", openQuickCreate);
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

  const pageLabel = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "My Issues";
    return parts
      .map((part) => part.toUpperCase() === part ? part : part.replace(/-/g, " "))
      .join(" / ");
  }, [location.pathname]);
  const hideNewIssueButton =
    location.pathname.startsWith("/team/") ||
    location.pathname.startsWith("/my-issues") ||
    location.pathname.startsWith("/inbox");

  return (
    <div className="linear-app app-layout">
      <aside className="sidebar" data-testid="linear-sidebar">
        <div className="sidebar-header">
          <button className="workspace-menu" type="button" aria-label="Workspace menu">
            <span className="workspace-mark">EL</span>
            <span className="workspace-name truncate">eltsuh</span>
            <ChevronRight size={12} className="workspace-chevron" />
          </button>
          <Button variant="ghost" iconOnly onClick={() => setCommandOpen(true)} aria-label="Search workspace" data-testid="command-palette-button">
            <Search size={15} />
          </Button>
          <Button variant="ghost" iconOnly onClick={() => setQuickCreateOpen(true)} aria-label="Create issue" data-testid="quick-create-button">
            <SquarePen size={15} />
          </Button>
        </div>

        <div className="sidebar-scroll">
          <nav className="sidebar-section" aria-label="Primary">
            {primaryNav.map((item) => (
              <SidebarLink key={item.path} {...item} />
            ))}
          </nav>

          <section className="sidebar-section" aria-label="Workspace">
            <div className="sidebar-section-title">Workspace</div>
            {workspaceNav.map((item) => (
              <SidebarLink key={item.path} {...item} />
            ))}
          </section>

          <section className="sidebar-section" aria-label="Teams">
            <div className="sidebar-section-title">Your teams</div>
            {teams.map((team) => (
              <div key={team.key}>
                <NavLink to={`/team/${team.key.toLowerCase()}/active`} className="nav-item team-root" data-testid={`team-${team.key.toLowerCase()}-nav`}>
                  <span className="team-key">{team.key[0]}</span>
                  <span>{team.name}</span>
                  <ChevronRight size={13} className="team-root-chevron" />
                </NavLink>
                {teamNav.map((item) => (
                  <NavLink
                    key={`${team.key}-${item.segment}-${item.label}`}
                    to={`/team/${team.key.toLowerCase()}/${item.segment}`}
                    className="nav-item nav-subitem"
                    data-testid={`team-${team.key.toLowerCase()}-${item.segment}-nav`}
                  >
                    {item.icon && <item.icon size={14} />}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </section>

          <section className="sidebar-section" aria-label="Try">
            <div className="sidebar-section-title">Try</div>
            <SidebarLink label="Import issues" path="/import" icon={Boxes} testId="try-import-issues" />
          </section>
        </div>

        <div className="whats-new-card">
          <div>What's new</div>
          <strong>Linear Agent MCP support</strong>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar" aria-label="Workspace toolbar">
          <div className="topbar-title">
            <span>{pageLabel}</span>
          </div>
          <div className="topbar-actions">
            <Button onClick={() => setCommandOpen(true)} data-testid="command-palette-topbar-button">
              <Search size={14} />
              Search
              <Kbd>⌘K</Kbd>
            </Button>
            {!hideNewIssueButton && (
              <Button variant="primary" onClick={() => setQuickCreateOpen(true)} data-testid="quick-create-topbar-button">
                <Plus size={14} />
                New issue
              </Button>
            )}
            <Button variant="ghost" iconOnly onClick={() => navigate("/inbox")} aria-label="Inbox notifications" data-testid="topbar-inbox-button">
              <Inbox size={15} />
            </Button>
            <Button variant="ghost" iconOnly onClick={() => navigate("/settings/account")} aria-label="Account settings" data-testid="topbar-settings-button">
              <Settings size={15} />
            </Button>
          </div>
        </header>
        {children}
        <div className="bottom-bar">
          <div className="bottom-bar-left">
            <Button variant="ghost" iconOnly aria-label="Help">
              <HelpCircle size={14} />
            </Button>
            <div className="plan-badge">Free plan</div>
          </div>
          <div className="bottom-bar-right">
            <Button variant="ghost" className="ask-linear-button">
              <MessageSquare size={14} />
              Ask Linear
            </Button>
            <Button variant="ghost" iconOnly aria-label="History">
              <History size={14} />
            </Button>
          </div>
        </div>
      </main>

      <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onQuickCreate={() => setQuickCreateOpen(true)}
      />
    </div>
  );
}

function SidebarLink({
  label,
  path,
  icon: Icon,
  testId,
  badge,
}: {
  label: string;
  path: string;
  icon: typeof Inbox | typeof Boxes;
  testId: string;
  badge?: string;
}) {
  return (
    <NavLink to={path} className="nav-item" data-testid={testId}>
      <Icon size={15} />
      <span>{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );
}
