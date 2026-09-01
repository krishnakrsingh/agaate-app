import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users";
  roles: Role[];
  // custom active matcher, otherwise exact or prefix
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Farms",
    icon: "Farm",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"],
    isActive: (p) => p === "/dashboard" || p.startsWith("/farms") || p.startsWith("/plots"),
  },
  {
    href: "/officer/day",
    label: "My Day",
    icon: "Sun",
    roles: ["FARM_OFFICER", "SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
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
  // Mobile shows 4-5 most relevant per role, in priority order
  const all = getNavForRole(role);
  // For SUPER_ADMIN show all 6 but cap at 5 (drop least critical if needed)
  // Priority order already defined in NAV_ITEMS: Farms, My Day, Planner, Reports, Approvals, People
  // For small screens we show max 5
  if (role === "SUPER_ADMIN") {
    // Farms, My Day, Planner, Reports, Approvals (People accessible via profile menu fallback + still in dock as 5th)
    // keep order but truncate to 5
    return all.slice(0, 5);
  }
  if (role === "FARM_ADMIN") {
    return all; // Farms, Planner, Reports, Approvals (4)
  }
  if (role === "AGRONOMIST") {
    return all; // Farms, Planner, Reports (3)
  }
  // FARM_OFFICER
  return all; // Farms, My Day, Reports (3)
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
