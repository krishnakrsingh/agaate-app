import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users" | "Camera" | "Activity";
  roles: Role[];
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // 1. Officer-specific: My Day
  {
    href: "/officer/day",
    label: "My Day",
    icon: "Sun",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
  },
  {
    href: "/officer/reports",
    label: "Signals",
    icon: "Camera",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/reports"),
  },

  // 2. Executive Command & Cockpit
  {
    href: "/dashboard",
    label: "Command",
    icon: "Farm",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"],
    isActive: (p) => p === "/dashboard" || p.startsWith("/farms") || p.startsWith("/plots"),
  },

  // 3. Workforce & Live Attendance Roster (Executive & Managerial)
  {
    href: "/admin/attendance",
    label: "Workforce",
    icon: "Users",
    roles: ["SUPER_ADMIN", "FARM_ADMIN"],
    isActive: (p) => p.startsWith("/admin/attendance"),
  },

  // 4. Approvals & Operational Exception Authorization
  {
    href: "/admin/approvals",
    label: "Approvals",
    icon: "Shield",
    roles: ["SUPER_ADMIN", "FARM_ADMIN"],
    isActive: (p) => p.startsWith("/admin/approvals"),
  },

  // 5. Agronomy Planner & Operational Execution
  {
    href: "/tasks",
    label: "Planner",
    icon: "Calendar",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"],
    isActive: (p) => p.startsWith("/tasks"),
  },

  // 6. User Access Control & Farm Permissions (Super Admin only)
  {
    href: "/admin/users",
    label: "People",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/users"),
  },

  // 7. System Audit Trail (Super Admin & Farm Admin)
  {
    href: "/admin/audit",
    label: "Audit",
    icon: "Activity",
    roles: ["SUPER_ADMIN", "FARM_ADMIN"],
    isActive: (p) => p.startsWith("/admin/audit"),
  },

  // 8. Daily Operational Reports
  {
    href: "/reports/daily",
    label: "Reports",
    icon: "FileText",
    roles: ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"],
    isActive: (p) => p.startsWith("/reports"),
  },
];

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavForRole(role: Role): NavItem[] {
  const all = getNavForRole(role);
  if (role === "SUPER_ADMIN") {
    // Show top 5 priority items on mobile
    return all.filter((i) => ["/dashboard", "/admin/attendance", "/admin/approvals", "/admin/users", "/reports/daily"].includes(i.href));
  }
  return all.slice(0, 5);
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
