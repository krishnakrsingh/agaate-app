import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users" | "Camera" | "Activity" | "Package" | "Coins" | "Truck" | "Stethoscope" | "TrendingUp" | "Zap";
  roles: Role[];
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // ── 1. FARM OWNER (FARM_ADMIN) ──
  {
    href: "/owner/dashboard",
    label: "Cockpit",
    icon: "Farm",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/dashboard") || p === "/dashboard",
  },
  {
    href: "/owner/plots",
    label: "Plots & Crops",
    icon: "TrendingUp",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/plots") || p.startsWith("/plots"),
  },
  {
    href: "/owner/team",
    label: "Team & Labor",
    icon: "Users",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/team"),
  },
  {
    href: "/owner/calendar",
    label: "Ops Calendar",
    icon: "Calendar",
    roles: ["FARM_ADMIN", "SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/owner/calendar"),
  },
  {
    href: "/owner/harvest",
    label: "Harvest",
    icon: "Truck",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/harvest"),
  },
  {
    href: "/owner/financials",
    label: "Financials",
    icon: "Coins",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/financials"),
  },
  {
    href: "/owner/inventory",
    label: "Shed Stock",
    icon: "Package",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/inventory"),
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    icon: "Activity",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/admin/attendance"),
  },
  {
    href: "/reports/daily",
    label: "Reports",
    icon: "FileText",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/reports"),
  },

  // ── 2. ON-SITE FARM MANAGER (FARM_OFFICER) ──
  {
    href: "/officer/day",
    label: "My Day",
    icon: "Sun",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
  },
  {
    href: "/officer/quick-log",
    label: "Quick Log",
    icon: "Zap",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/quick-log"),
  },
  {
    href: "/officer/harvest",
    label: "Log Harvest",
    icon: "Truck",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/harvest"),
  },
  {
    href: "/officer/crew",
    label: "Crew Muster",
    icon: "Users",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/crew"),
  },
  {
    href: "/officer/reports",
    label: "Signals & Snaps",
    icon: "Camera",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/reports"),
  },

  // ── 3. CENTRAL AGRONOMIST ──
  {
    href: "/agronomy/radar",
    label: "Crop Radar",
    icon: "TrendingUp",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/agronomy/radar") || p === "/dashboard",
  },
  {
    href: "/agronomy/planning",
    label: "Weekly Plan",
    icon: "Calendar",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/agronomy/planning"),
  },
  {
    href: "/agronomy/diagnostics",
    label: "Diagnostics",
    icon: "Stethoscope",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/agronomy/diagnostics"),
  },
  {
    href: "/tasks",
    label: "All Tasks",
    icon: "ClipboardList",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/tasks"),
  },
  {
    href: "/reports/daily",
    label: "Field Reports",
    icon: "FileText",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/reports"),
  },

  // ── 4. SUPER ADMIN (AGAATE HQ) ──
  {
    href: "/dashboard",
    label: "Command",
    icon: "Farm",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p === "/dashboard" || p.startsWith("/farms"),
  },
  {
    href: "/admin/attendance",
    label: "Workforce",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/attendance"),
  },
  {
    href: "/admin/approvals",
    label: "Approvals",
    icon: "Shield",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/approvals"),
  },
  {
    href: "/tasks",
    label: "Planner",
    icon: "Calendar",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/tasks"),
  },
  {
    href: "/admin/users",
    label: "Clients & Team",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: "Activity",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/admin/audit"),
  },
  {
    href: "/reports/daily",
    label: "Reports",
    icon: "FileText",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/reports"),
  },
];

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavForRole(role: Role): NavItem[] {
  const all = getNavForRole(role);
  if (role === "SUPER_ADMIN") {
    return all.filter((i) => ["/dashboard", "/owner/calendar", "/admin/attendance", "/admin/approvals", "/admin/users"].includes(i.href));
  }
  if (role === "FARM_ADMIN") {
    return all.filter((i) => ["/owner/dashboard", "/owner/team", "/owner/calendar", "/owner/harvest", "/owner/financials"].includes(i.href));
  }
  if (role === "FARM_OFFICER") {
    return all.filter((i) => ["/officer/day", "/officer/quick-log", "/officer/harvest", "/officer/crew", "/officer/reports"].includes(i.href));
  }
  return all.slice(0, 5);
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "SUPER ADMIN",
  FARM_ADMIN: "FARM OWNER",
  AGRONOMIST: "AGRONOMIST",
  FARM_OFFICER: "FARM MANAGER",
};

export const ROLE_HOME_URLS: Record<string, string> = {
  SUPER_ADMIN: "/dashboard",
  FARM_ADMIN: "/owner/dashboard",
  AGRONOMIST: "/agronomy/radar",
  FARM_OFFICER: "/officer/day",
};

