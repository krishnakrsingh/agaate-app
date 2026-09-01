import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users" | "Camera";
  roles: Role[];
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/officer/day",
    label: "My Day",
    icon: "Sun",
    roles: ["FARM_OFFICER", "SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
  },
  {
    href: "/officer/reports",
    label: "Signals",
    icon: "Camera",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/reports"),
  },
  {
    href: "/dashboard",
    label: "Farms",
    icon: "Farm",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"],
    isActive: (p) => p === "/dashboard" || p.startsWith("/farms") || p.startsWith("/plots"),
  },
  {
    href: "/tasks",
    label: "Planner",
    icon: "Calendar",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"],
    isActive: (p) => p.startsWith("/tasks"),
  },
  {
    href: "/reports/daily",
    label: "Reports",
    icon: "FileText",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"],
    isActive: (p) => p.startsWith("/reports"),
  },
  {
    href: "/admin/approvals",
    label: "Approvals",
    icon: "Shield",
    roles: ["SUPER_ADMIN", "FARM_ADMIN"],
    isActive: (p) => p.startsWith("/admin/approvals"),
  },
  {
    href: "/admin/users",
    label: "People",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/users"),
  },
];

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavForRole(role: Role): NavItem[] {
  const all = getNavForRole(role);
  if (role === "SUPER_ADMIN") {
    return all.slice(0, 5);
  }
  return all;
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
