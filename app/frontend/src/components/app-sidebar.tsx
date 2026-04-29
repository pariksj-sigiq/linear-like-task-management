import * as React from "react";
import { Link } from "react-router-dom";
import {
  CircleDotDashedIcon,
  FolderKanbanIcon,
  InboxIcon,
  KanbanIcon,
  MapIcon,
  SearchIcon,
  SettingsIcon,
  SquarePenIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from "lucide-react";
import type { LinearUser } from "../linearTypes";
import { NavDocuments } from "./nav-documents";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: (LinearUser & { role?: string }) | null;
  onLogout: () => void | Promise<void>;
  onOpenCommand: () => void;
  onQuickCreate: () => void;
}

const primaryNav = [
  {
    title: "Inbox",
    url: "/inbox",
    icon: InboxIcon,
    badge: "99+",
    testId: "nav-inbox",
    activePatterns: ["^/inbox"],
  },
  {
    title: "My issues",
    url: "/my-issues/activity",
    icon: UserRoundCheckIcon,
    testId: "nav-my-issues",
    activePatterns: ["^/my-issues"],
  },
];

const workspaceNav = [
  {
    name: "Initiatives",
    url: "/initiatives",
    icon: MapIcon,
    testId: "nav-initiatives",
    activePatterns: ["^/initiatives"],
  },
  {
    name: "Projects",
    url: "/projects/all",
    icon: FolderKanbanIcon,
    testId: "nav-projects",
    activePatterns: ["^/projects", "^/project/"],
  },
  {
    name: "Views",
    url: "/views",
    icon: KanbanIcon,
    testId: "nav-views",
    activePatterns: ["^/views"],
  },
  {
    name: "More",
    url: "/roadmap",
    icon: CircleDotDashedIcon,
    testId: "nav-roadmap",
    activePatterns: ["^/roadmap"],
  },
];

const teamNav = [
  {
    name: "Engg",
    url: "/team/engg/active",
    icon: UsersIcon,
    testId: "team-engg-nav",
    activePatterns: ["^/team/engg"],
    items: [
      { name: "Issues", url: "/team/engg/active", testId: "team-engg-active-nav" },
      { name: "Cycles", url: "/team/engg/cycles", testId: "team-engg-cycles-nav" },
      { name: "Projects", url: "/team/engg/projects", testId: "team-engg-projects-nav" },
      { name: "Views", url: "/team/engg/views", testId: "team-engg-views-nav" },
    ],
  },
];

const secondaryNav = [
  {
    title: "Search",
    url: "/search",
    icon: SearchIcon,
    testId: "nav-search",
    activePatterns: ["^/search"],
  },
  {
    title: "Settings",
    url: "/settings/account",
    icon: SettingsIcon,
    testId: "nav-settings",
    activePatterns: ["^/settings"],
  },
];

export function AppSidebar({
  user,
  onLogout,
  onOpenCommand,
  onQuickCreate,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <SidebarMenuButton asChild className="min-w-0 flex-1 data-[slot=sidebar-menu-button]:p-1.5">
                <Link to="/my-issues/activity" aria-label="Open workspace home">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#14b8d4] text-[10px] font-bold text-white">
                    EL
                  </span>
                  <span className="text-base font-semibold">eltsuh</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton
                className="size-8 justify-center"
                tooltip="Search workspace"
                onClick={onOpenCommand}
                data-testid="command-palette-button"
              >
                <SearchIcon />
              </SidebarMenuButton>
              <SidebarMenuButton
                className="size-8 justify-center"
                tooltip="Create issue"
                onClick={onQuickCreate}
                data-testid="quick-create-button"
              >
                <SquarePenIcon />
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={primaryNav}
        />
        <NavDocuments label="Workspace" items={workspaceNav} />
        <NavDocuments label="Teams" items={teamNav} />
        <NavSecondary items={secondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
