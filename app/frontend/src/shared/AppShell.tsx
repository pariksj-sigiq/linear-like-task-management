import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LucideIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface AppShellProps {
  appName: string;
  navItems: NavItem[];
  children: ReactNode;
  user?: { full_name: string; role: string; username: string } | null;
  onLogout?: () => void;
}

export function AppShell({ appName, navItems, children, user, onLogout }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        data-testid="sidebar"
      >
        <div className="px-5 py-4 text-lg font-semibold tracking-tight">
          {appName}
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3">
              <div
                className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground"
                data-testid="user-avatar"
              >
                {user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-accent-foreground" data-testid="user-name">
                  {user.full_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
              {onLogout && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onLogout}
                  title="Sign out"
                  data-testid="logout-button"
                >
                  <LogOut size={16} />
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex h-12 shrink-0 items-center border-b border-border bg-background px-6"
          data-testid="topbar"
        >
          <div className="flex-1" />
          {user && (
            <span className="text-sm text-muted-foreground" data-testid="topbar-user">
              {user.full_name}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6" data-testid="content">
          {children}
        </main>
      </div>
    </div>
  );
}
