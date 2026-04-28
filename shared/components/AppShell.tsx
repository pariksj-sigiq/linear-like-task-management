import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LucideIcon, LogOut } from "lucide-react";

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
        className="flex flex-col shrink-0 overflow-y-auto"
        style={{
          width: "var(--sidebar-width)",
          backgroundColor: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
        }}
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
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: "var(--sidebar-active)", color: "#fff" }}
                data-testid="user-avatar"
              >
                {user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate" data-testid="user-name">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.role}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  title="Sign out"
                  data-testid="logout-button"
                >
                  <LogOut size={16} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="shrink-0 flex items-center px-6 border-b"
          style={{
            height: "var(--topbar-height)",
            backgroundColor: "var(--topbar-bg)",
            borderColor: "var(--topbar-border)",
          }}
          data-testid="topbar"
        >
          <div className="flex-1" />
          {user && (
            <span className="text-sm" style={{ color: "var(--text-secondary)" }} data-testid="topbar-user">
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
