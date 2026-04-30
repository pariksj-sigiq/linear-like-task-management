import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

export interface NavSecondaryItem {
  title: string;
  url: string;
  icon: LucideIcon;
  testId?: string;
  activePatterns?: string[];
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const location = useLocation();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
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
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function isItemActive(pathname: string, item: NavSecondaryItem) {
  if (pathname === item.url || pathname.startsWith(`${item.url}/`)) return true;
  return item.activePatterns?.some((pattern) => new RegExp(pattern).test(pathname)) ?? false;
}
