import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar";

interface NavSubItem {
  name: string;
  url: string;
  testId?: string;
  activePatterns?: string[];
}

export interface NavDocumentItem extends NavSubItem {
  icon: LucideIcon;
  items?: NavSubItem[];
}

export function NavDocuments({
  label,
  items,
}: {
  label: string;
  items: NavDocumentItem[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              isActive={isItemActive(location.pathname, item)}
              tooltip={item.name}
            >
              <NavLink to={item.url} data-testid={item.testId}>
                <item.icon />
                <span>{item.name}</span>
              </NavLink>
            </SidebarMenuButton>
            {item.items?.length ? (
              <SidebarMenuSub>
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.name}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isItemActive(location.pathname, subItem)}
                    >
                      <NavLink to={subItem.url} data-testid={subItem.testId}>
                        <span>{subItem.name}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function isItemActive(pathname: string, item: NavSubItem) {
  if (pathname === item.url || pathname.startsWith(`${item.url}/`)) return true;
  return item.activePatterns?.some((pattern) => new RegExp(pattern).test(pathname)) ?? false;
}
