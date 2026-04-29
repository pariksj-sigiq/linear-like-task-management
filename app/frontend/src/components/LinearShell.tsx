import { ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Boxes,
  ChevronRight,
  CircleDashed,
  Clock3,
  FolderKanban,
  Inbox,
  Layers3,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Star,
  UserRoundCheck,
  View,
} from "lucide-react";
import type { LinearUser } from "../linearTypes";
import { initials, userName } from "../linearTypes";
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

const teams = [
  { key: "ENGG", name: "Engg" },
];

const primaryNav = [
  { label: "Inbox", path: "/inbox", icon: Inbox, testId: "nav-inbox", badge: "99+" },
  { label: "My issues", path: "/my-issues/activity", icon: UserRoundCheck, testId: "nav-my-issues" },
  { label: "Drafts", path: "/drafts", icon: CircleDashed, testId: "nav-drafts", badge: "3" },
];

const workspaceNav = [
  { label: "Initiatives", path: "/initiatives", icon: Layers3, testId: "nav-initiatives" },
  { label: "Projects", path: "/projects", icon: FolderKanban, testId: "nav-projects" },
  { label: "Views", path: "/views", icon: View, testId: "nav-views" },
  { label: "More", path: "/roadmap", icon: MoreHorizontal, testId: "nav-roadmap" },
];

const teamNav = [
  { label: "Issues", segment: "active", icon: CircleDashed },
  { label: "Cycles", segment: "cycles", icon: Clock3 },
  { label: "Current", segment: "active", nested: true },
  { label: "Upcoming", segment: "backlog", nested: true },
  { label: "Projects", segment: "projects", icon: FolderKanban },
  { label: "Views", segment: "views", icon: View },
];

export function LinearShell({ user, onLogout, children }: LinearShellProps) {
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

  return (
    <div className="linear-app app-layout">
      <aside className="sidebar" data-testid="linear-sidebar">
        <div className="sidebar-header">
          <button className="workspace-menu" type="button" aria-label="Workspace menu">
            <span className="workspace-mark">S</span>
            <span className="workspace-name truncate">SigIQ</span>
            <ChevronRight size={12} className="workspace-chevron" />
          </button>
          <Button variant="ghost" iconOnly onClick={() => setCommandOpen(true)} aria-label="Search workspace" data-testid="command-palette-button">
            <Search size={15} />
          </Button>
          <Button variant="ghost" iconOnly onClick={() => setQuickCreateOpen(true)} aria-label="Create issue" data-testid="quick-create-button">
            <Plus size={15} />
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
                  <ChevronRight size={13} style={{ marginLeft: "auto", color: "var(--sidebar-muted)" }} />
                </NavLink>
                {teamNav.map((item) => (
                  <NavLink
                    key={`${team.key}-${item.segment}-${item.label}`}
                    to={`/team/${team.key.toLowerCase()}/${item.segment}`}
                    className={`nav-item nav-subitem ${item.nested ? "nav-nested" : ""}`}
                    data-testid={`team-${team.key.toLowerCase()}-${item.segment}-nav`}
                  >
                    {item.icon && <item.icon size={14} />}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </section>

          <section className="sidebar-section" aria-label="Favorites">
            <div className="sidebar-section-title">
              Favorites
              <Star size={12} />
            </div>
            <SidebarLink label="Active Issues" path="/team/eng/active" icon={CircleDashed} testId="favorite-active" />
            <SidebarLink label="Current Cycles" path="/team/eng/cycles" icon={Clock3} testId="favorite-cycles" />
            <SidebarLink label="Archive" path="/archive" icon={Archive} testId="favorite-archive" />
          </section>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{initials(userName(user))}</div>
          <div className="truncate" style={{ flex: 1 }}>
            <div className="truncate" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {userName(user)}
            </div>
            <div className="truncate" style={{ color: "var(--sidebar-muted)", fontSize: 12 }}>
              {user?.role || "Member"}
            </div>
          </div>
          <Button variant="ghost" iconOnly onClick={onLogout} aria-label="Sign out" data-testid="logout-button">
            <LogOut size={14} />
          </Button>
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
            <Button variant="primary" onClick={() => setQuickCreateOpen(true)} data-testid="quick-create-topbar-button">
              <Plus size={14} />
              New issue
            </Button>
            <Button variant="ghost" iconOnly onClick={() => navigate("/inbox")} aria-label="Inbox notifications" data-testid="topbar-inbox-button">
              <Inbox size={15} />
            </Button>
            <Button variant="ghost" iconOnly onClick={() => navigate("/settings/account")} aria-label="Account settings" data-testid="topbar-settings-button">
              <Settings size={15} />
            </Button>
          </div>
        </header>
        {children}
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
