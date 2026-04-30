import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

export interface NavMainItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  testId?: string;
  activePatterns?: string[];
}

export function NavMain({
  items,
}: {
  items: NavMainItem[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(location.pathname, item)}
                tooltip={item.title}
              >
                <NavLink to={item.url} data-testid={item.testId}>
                  <item.icon />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
              {item.badge ? (
                <SidebarMenuBadge className="text-sidebar-foreground/70">
                  {item.badge}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function isItemActive(pathname: string, item: NavMainItem) {
  if (pathname === item.url || pathname.startsWith(`${item.url}/`)) return true;
  return item.activePatterns?.some((pattern) => new RegExp(pattern).test(pathname)) ?? false;
}
