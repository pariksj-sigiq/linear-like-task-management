import * as React from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  InboxIcon,
  SearchIcon,
  SquarePenIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { readTool, collectionFrom } from "../api";
import type { LinearUser } from "../linearTypes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: (LinearUser & { role?: string }) | null;
  onLogout: () => void | Promise<void>;
  onOpenCommand: () => void;
  onQuickCreate: () => void;
}

export function AppSidebar({
  user: _user,
  onLogout: _onLogout,
  onOpenCommand,
  onQuickCreate,
  ...props
}: AppSidebarProps) {
  const location = useLocation();
  const [workspaceOpen, setWorkspaceOpen] = React.useState(true);
  const [teamsOpen, setTeamsOpen] = React.useState(true);
  const [teamOpen, setTeamOpen] = React.useState(true);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);
  const [workspaceSubmenuOpen, setWorkspaceSubmenuOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("eltsuh");
  const workspaceMenuRootRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    readTool("search_workspaces", { limit: 1 }).then((response) => {
      const workspace = collectionFrom<{ name?: string; url_key?: string }>(response.data, ["workspaces", "results"])[0];
      if (workspace?.name || workspace?.url_key) setWorkspaceName(workspace.name || workspace.url_key || "eltsuh");
    });
  }, []);

  React.useEffect(() => {
    if (!workspaceMenuOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (workspaceMenuRootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-workspace-menu-surface='true']")) return;
      setWorkspaceMenuOpen(false);
      setWorkspaceSubmenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [workspaceMenuOpen]);

  const workspaceMenu =
    workspaceMenuOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[80]"
              onPointerDown={() => {
                setWorkspaceMenuOpen(false);
                setWorkspaceSubmenuOpen(false);
              }}
            />
            <div
              role="menu"
              data-workspace-menu-surface="true"
              className="fixed left-3 top-12 z-[90] w-[228px] max-w-[calc(100vw-16px)] overflow-visible rounded-[10px] border border-[#d9d9d6] bg-[#fbfbfa] p-0 text-[13px] text-[#242424] shadow-[0_14px_32px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.08)]"
              data-testid="workspace-menu-content"
            >
              <WorkspaceMenuButton
                onClick={() => {
                  setWorkspaceMenuOpen(false);
                  navigate("/settings/account/preferences");
                }}
              >
                Settings
              </WorkspaceMenuButton>
              <WorkspaceMenuButton
                onClick={() => {
                  setWorkspaceMenuOpen(false);
                  navigate("/settings/members");
                }}
              >
                Invite and manage members
              </WorkspaceMenuButton>
              <WorkspaceMenuSeparator />
              <WorkspaceMenuButton>Download desktop app</WorkspaceMenuButton>
              <WorkspaceMenuSeparator />
              <div
                className="relative"
                onPointerEnter={() => setWorkspaceSubmenuOpen(true)}
                onPointerLeave={() => setWorkspaceSubmenuOpen(false)}
                onFocus={() => setWorkspaceSubmenuOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setWorkspaceSubmenuOpen(false);
                  }
                }}
              >
                <WorkspaceMenuButton>
                  <span className="flex-1 text-left">Switch workspace</span>
                  <ChevronRightIcon className="size-3.5 text-[#9a9a96]" />
                </WorkspaceMenuButton>
                {workspaceSubmenuOpen && (
                  <div
                    role="menu"
                    data-workspace-menu-surface="true"
                    className="absolute left-[calc(100%+4px)] top-[-5px] w-[192px] rounded-[10px] border border-[#d9d9d6] bg-[#fbfbfa] p-1.5 shadow-[0_14px_32px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.08)]"
                  >
                    <WorkspaceMenuButton>Eltsuh</WorkspaceMenuButton>
                  </div>
                )}
              </div>
              <WorkspaceMenuButton
                onClick={() => {
                  setWorkspaceMenuOpen(false);
                  void _onLogout();
                }}
                testId="logout-button"
              >
                Log out
              </WorkspaceMenuButton>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <Sidebar collapsible="offcanvas" {...props} className="linear-sidebar" data-testid="linear-sidebar">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div ref={workspaceMenuRootRef} className="flex min-w-0 items-center gap-1.5 px-1">
              <SidebarMenuButton
                className="h-8 min-w-0 flex-1 overflow-hidden rounded-lg px-1.5 py-1.5 text-[#262626] hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
                data-state={workspaceMenuOpen ? "open" : "closed"}
                data-testid="workspace-menu-trigger"
                onClick={() => {
                  setWorkspaceMenuOpen((open) => !open);
                  setWorkspaceSubmenuOpen(false);
                }}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#111111] text-[10px] font-semibold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left text-[14px] font-medium text-[#1f1f1f]">{workspaceName}</span>
                <ChevronDownIcon className="ml-auto size-4 shrink-0 text-sidebar-foreground/70" />
              </SidebarMenuButton>
              {workspaceMenu}
              <SidebarMenuButton
                className="size-7 justify-center rounded-full p-0 hover:bg-sidebar-accent"
                tooltip="Search workspace"
                onClick={onOpenCommand}
                data-testid="command-palette-button"
              >
                <SearchIcon className="size-4" />
              </SidebarMenuButton>
              <SidebarMenuButton
                className="size-7 justify-center rounded-full bg-background p-0 shadow-sm hover:bg-sidebar-accent"
                tooltip="Create issue"
                onClick={onQuickCreate}
                data-testid="quick-create-button"
              >
                <SquarePenIcon className="size-4" />
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3">
        {/* Primary Nav */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isPathActive(location.pathname, "/inbox", ["^/inbox"])}
                  tooltip="Inbox"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <NavLink to="/inbox" data-testid="nav-inbox">
                    <InboxIcon className="size-4" />
                    <span>Inbox</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isPathActive(location.pathname, "/my-issues/activity", ["^/my-issues"])}
                  tooltip="My issues"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <NavLink to="/my-issues/activity" data-testid="nav-my-issues">
                    <UserRoundCheckIcon className="size-4" />
                    <span>My issues</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workspace */}
        <Collapsible.Root open={workspaceOpen} onOpenChange={setWorkspaceOpen} asChild>
          <SidebarGroup className="p-0 pt-5">
            <Collapsible.Trigger asChild>
              <SidebarGroupLabel className="flex h-7 cursor-pointer items-center gap-1 px-2 pt-0 text-[13px] font-medium normal-case text-sidebar-foreground hover:text-sidebar-accent-foreground">
                Workspace <ChevronDownIcon className={`size-3 transition-transform ${workspaceOpen ? "" : "-rotate-90"}`} />
              </SidebarGroupLabel>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <SidebarGroupContent>
                <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isPathActive(location.pathname, "/projects/all", ["^/projects", "^/project/"])}
                  tooltip="Projects"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <NavLink to="/projects/all" data-testid="nav-projects">
                    <ProjectNavIcon />
                    <span>Projects</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </Collapsible.Content>
          </SidebarGroup>
        </Collapsible.Root>

        {/* Your teams */}
        <Collapsible.Root open={teamsOpen} onOpenChange={setTeamsOpen} asChild>
          <SidebarGroup className="p-0 pt-5">
            <Collapsible.Trigger asChild>
              <SidebarGroupLabel className="flex h-7 cursor-pointer items-center gap-1 px-2 pt-0 text-[13px] font-medium normal-case text-sidebar-foreground hover:text-sidebar-accent-foreground">
                Your teams <ChevronDownIcon className={`size-3 transition-transform ${teamsOpen ? "" : "-rotate-90"}`} />
              </SidebarGroupLabel>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <SidebarGroupContent>
                <SidebarMenu>
              <Collapsible.Root open={teamOpen} onOpenChange={setTeamOpen} asChild>
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton
                      tooltip="Eltsuh"
                      className="h-7 rounded-md px-2 text-[14px] font-medium data-[state=open]:bg-transparent data-[state=open]:hover:bg-sidebar-accent"
                      data-testid="team-eng-nav"
                    >
                      <div className="flex size-4 items-center justify-center text-[#5d85ff]">
                        <ShopIcon />
                      </div>
                      <span>Eltsuh</span>
                      <ChevronRightIcon className={`ml-auto size-4 text-sidebar-foreground/70 transition-transform ${teamOpen ? "rotate-90" : ""}`} />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isPathActive(location.pathname, "/team/eng/active", ["^/team/eng/active"])}
                          className="h-7 rounded-md px-2 text-[14px] font-medium"
                        >
                          <NavLink to="/team/eng/active" data-testid="team-eng-active-nav">
                            <IssueNavIcon />
                            <span>Issues</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isPathActive(location.pathname, "/team/eng/projects", ["^/team/eng/projects"])}
                          className="h-7 rounded-md px-2 text-[14px] font-medium"
                        >
                          <NavLink to="/team/eng/projects" data-testid="team-eng-projects-nav">
                            <ProjectNavIcon />
                            <span>Projects</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </Collapsible.Content>
                </SidebarMenuItem>
              </Collapsible.Root>
                </SidebarMenu>
              </SidebarGroupContent>
            </Collapsible.Content>
          </SidebarGroup>
        </Collapsible.Root>

      </SidebarContent>
    </Sidebar>
  );
}

function WorkspaceMenuButton({
  children,
  onClick,
  testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      className="flex h-[40px] w-full items-center px-3.5 text-left text-[13px] font-normal leading-none text-[#242424] outline-none hover:bg-[#f2f2f0] focus:bg-[#f2f2f0] focus:text-[#1f1f1f]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WorkspaceMenuSeparator() {
  return <div role="separator" className="h-px bg-[#e3e3e0]" />;
}

function isPathActive(pathname: string, url: string, patterns?: string[]): boolean {
  if (pathname === url || pathname.startsWith(`${url}/`)) return true;
  return patterns?.some((pattern) => new RegExp(pattern).test(pathname)) ?? false;
}

function ShopIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path d="M4.929 7.495C4.997 7.227 5.214 7 5.49 7s.493.227.561.495a2 2 0 0 0 3.877 0c.068-.268.285-.495.562-.495.276 0 .493.227.561.495a2 2 0 0 0 3.925-.26.8.8 0 0 0-.092-.446l-2.618-5.236A1 1 0 0 0 11.373 1H4.609a1 1 0 0 0-.895.553L1.096 6.789a.8.8 0 0 0-.092.447 2 2 0 0 0 3.925.259" />
      <path d="M3.01 10a3 3 0 0 0 2.5-1.342A3 3 0 0 0 8.01 10a3 3 0 0 0 2.5-1.342 2.996 2.996 0 0 0 3.48 1.179V13.5a1.5 1.5 0 0 1-1.5 1.5H10.5a.5.5 0 0 1-.5-.5V13a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1.5a.5.5 0 0 1-.5.5H3.49a1.5 1.5 0 0 1-1.5-1.5V9.822A3 3 0 0 0 3.01 10" />
    </svg>
  );
}

function IssueNavIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.25 5.25C14.2165 5.25 15 6.0335 15 7V11.75C15 13.5449 13.5449 15 11.75 15H6.75C5.7835 15 5 14.2165 5 13.25C5 12.8358 5.33579 12.5 5.75 12.5C6.16421 12.5 6.5 12.8358 6.5 13.25C6.5 13.3881 6.61193 13.5 6.75 13.5H11.75C12.7165 13.5 13.5 12.7165 13.5 11.75V7C13.5 6.86193 13.3881 6.75 13.25 6.75C12.8358 6.75 12.5 6.41421 12.5 6C12.5 5.58579 12.8358 5.25 13.25 5.25Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M8.1543 1.00391C9.73945 1.08421 11 2.39489 11 4V8L10.9961 8.1543C10.9184 9.68834 9.68834 10.9184 8.1543 10.9961L8 11H4L3.8457 10.9961C2.31166 10.9184 1.08163 9.68834 1.00391 8.1543L1 8V4C1 2.39489 2.26055 1.08421 3.8457 1.00391L4 1H8L8.1543 1.00391ZM4 2.5C3.17157 2.5 2.5 3.17157 2.5 4V8C2.5 8.82843 3.17157 9.5 4 9.5H8C8.82843 9.5 9.5 8.82843 9.5 8V4C9.5 3.17157 8.82843 2.5 8 2.5H4Z" />
    </svg>
  );
}

function ProjectNavIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.331 1.07a3.2 3.2 0 0 1 1.338 0c.498.106.967.377 1.904.917l1.354.78c.937.541 1.406.812 1.747 1.19.301.334.53.728.669 1.156.157.484.157 1.025.157 2.107v1.56l-.003.718c-.007.63-.036 1.026-.154 1.389l-.057.158a3.2 3.2 0 0 1-.612.998l-.135.138c-.33.312-.792.578-1.612 1.051l-1.354.78-.623.357c-.55.309-.907.481-1.281.56l-.166.032a3.2 3.2 0 0 1-1.006 0l-.166-.031c-.374-.08-.73-.252-1.281-.561l-.623-.356-1.354-.78c-.82-.474-1.281-.74-1.612-1.052l-.135-.138a3.2 3.2 0 0 1-.612-.998l-.057-.158c-.118-.363-.147-.758-.154-1.39L1.5 8.78V7.22c0-.946 0-1.479.105-1.921l.052-.186c.122-.374.312-.723.56-1.028l.11-.128c.255-.284.583-.507 1.126-.83l.62-.36 1.354-.78c.82-.473 1.281-.739 1.718-.869zM3 7.22v1.56c0 1.183.018 1.439.084 1.643l.064.167q.11.246.292.449l.059.06c.151.143.427.318 1.323.835l1.354.78.632.36c.188.104.33.178.442.233V8.482l-4.247-1.93zm5.75 1.262v4.826c.212-.106.533-.282 1.074-.594l1.354-.78.628-.368c.499-.297.646-.407.754-.527l.113-.14q.158-.218.243-.476l.022-.081c.035-.144.051-.351.058-.835L13 8.78V7.22l-.004-.668zM7.82 2.51l-.177.027c-.159.034-.328.106-.835.39l-.632.359-1.354.78c-.896.517-1.172.692-1.323.834l-.059.06q-.046.051-.086.104l4.645 2.112 4.645-2.112-.084-.103c-.109-.12-.255-.23-.754-.528l-.628-.367-1.354-.78c-.897-.517-1.186-.668-1.386-.728l-.08-.021a1.7 1.7 0 0 0-.538-.027" />
    </svg>
  );
}
