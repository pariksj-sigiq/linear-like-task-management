import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  InboxIcon,
  SearchIcon,
  SquarePenIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { LinearUser } from "../linearTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  const [tryOpen, setTryOpen] = React.useState(true);

  return (
    <Sidebar collapsible="offcanvas" {...props} className="linear-sidebar" data-testid="linear-sidebar">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-1.5 px-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="flex-1 px-1.5 py-1.5 hover:bg-sidebar-accent" data-testid="workspace-menu-trigger">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#16b7d7] text-[10px] font-semibold text-white">
                      EL
                    </span>
                    <span className="text-[14px] font-medium text-[#1f1f1f]">eltsuh</span>
                    <ChevronDownIcon className="ml-auto size-4 text-sidebar-foreground/70" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={4} className="w-[228px] rounded-lg border-border bg-background p-0 text-[14px] shadow-[0_14px_36px_rgb(0_0_0/0.18)]">
                  <DropdownMenuItem className="h-[39px] rounded-none px-3 text-[14px]" onClick={() => {}}>
                    <span className="flex-1">Settings</span>
                    <span className="text-muted-foreground">G then S</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="h-[39px] rounded-none px-3 text-[14px]" onClick={() => {}}>
                    Invite and manage members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="m-0" />
                  <DropdownMenuItem className="h-[39px] rounded-none px-3 text-[14px]" onClick={() => {}}>
                    Download desktop app
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="m-0" />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="relative h-[39px] rounded-none px-3 pr-8 text-[14px]">
                      <span className="shrink-0 whitespace-nowrap">Switch workspace</span>
                      <span className="absolute right-10 text-muted-foreground">O then W</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-48">
                      <DropdownMenuItem>Eltsuh</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem className="h-[39px] rounded-none px-3 text-[14px]" onClick={_onLogout} data-testid="logout-button">
                    <span className="flex-1">Log out</span>
                    <span className="text-muted-foreground">⌥ ⇧ Q</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isPathActive(location.pathname, "/views", ["^/views"])}
                  tooltip="Views"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <NavLink to="/views" data-testid="nav-views">
                    <ViewNavIcon />
                    <span>Views</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isPathActive(location.pathname, "/roadmap", ["^/roadmap"])}
                  tooltip="More"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <NavLink to="/roadmap" data-testid="nav-roadmap">
                    <MoreDotsIcon />
                    <span>More</span>
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
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isPathActive(location.pathname, "/team/eng/views", ["^/team/eng/views"])}
                          className="h-7 rounded-md px-2 text-[14px] font-medium"
                        >
                          <NavLink to="/team/eng/views" data-testid="team-eng-views-nav">
                            <ViewNavIcon />
                            <span>Views</span>
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

        {/* Try */}
        <Collapsible.Root open={tryOpen} onOpenChange={setTryOpen} asChild>
          <SidebarGroup className="p-0 pt-5">
            <Collapsible.Trigger asChild>
              <SidebarGroupLabel className="flex h-7 cursor-pointer items-center gap-1 px-2 pt-0 text-[13px] font-medium normal-case text-sidebar-foreground hover:text-sidebar-accent-foreground">
                Try <ChevronDownIcon className={`size-3 transition-transform ${tryOpen ? "" : "-rotate-90"}`} />
              </SidebarGroupLabel>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <SidebarGroupContent>
                <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Import issues"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <a href="#import">
                    <IssueNavIcon />
                    <span>Import issues</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Cycles"
                  className="h-7 rounded-md px-2 text-[14px] font-medium"
                >
                  <a href="#cycles">
                    <CycleNavIcon />
                    <span>Cycles</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </Collapsible.Content>
          </SidebarGroup>
        </Collapsible.Root>

      </SidebarContent>
    </Sidebar>
  );
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

function ViewNavIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path d="M6.932 2.214a2.77 2.77 0 0 1 2.282.066l5.066 2.467c.944.46.964 1.812.034 2.3L9.287 9.683a2.77 2.77 0 0 1-2.574 0L1.686 7.047c-.93-.488-.91-1.84.034-2.3L6.786 2.28zm1.62 1.457a1.26 1.26 0 0 0-.97-.057l-.133.057-4.61 2.243 4.576 2.398c.367.193.803.193 1.17 0l4.574-2.398z" />
      <path d="M13.905 10.077c.367-.173.82-.044 1.01.288s.048.74-.32.912L9.5 13.67a3.56 3.56 0 0 1-2.998 0l-5.097-2.392-.066-.034c-.318-.188-.432-.567-.253-.878s.588-.444.941-.317l.07.029 5.096 2.391.195.078c.461.156.978.13 1.42-.078z" />
    </svg>
  );
}

function MoreDotsIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path d="M3.25 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0M9.25 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0M15.25 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0" />
    </svg>
  );
}

function CycleNavIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 1.25A6.75 6.75 0 1 0 14.75 8a.75.75 0 0 0-1.5 0A5.25 5.25 0 1 1 8 2.75c1.3 0 2.49.472 3.407 1.254H9.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-1.5 0v1.475A6.72 6.72 0 0 0 8 1.25Zm.75 4.25a.75.75 0 0 0-1.5 0v2.74c0 .27.145.52.38.654l2.25 1.285a.75.75 0 1 0 .744-1.302L8.75 7.805V5.5Z" />
    </svg>
  );
}
