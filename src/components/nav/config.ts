import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users" | "Camera" | "Activity" | "Package" | "Coins" | "Truck" | "Stethoscope" | "TrendingUp" | "Zap" | "User" | "AlertTriangle" | "Plot" | "Settings" | "Navigation";
  roles: Role[];
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // ── 1. FARM OWNER (FARM_ADMIN) — Their Land, Their People, Their Estate ──
  {
    href: "/owner/dashboard",
    label: "Home",
    icon: "Farm",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p === "/owner/dashboard" || p === "/dashboard",
  },
  {
    href: "/owner/farm",
    label: "My Farm",
    icon: "Plot",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/farm"),
  },
  {
    href: "/owner/land",
    label: "Land",
    icon: "TrendingUp",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/land") || p.startsWith("/owner/plots") || p.startsWith("/plots"),
  },
  {
    href: "/owner/operations",
    label: "Operations",
    icon: "ClipboardList",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/operations") || p.startsWith("/tasks"),
  },
  {
    href: "/owner/people",
    label: "People",
    icon: "Users",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/people") || p.startsWith("/owner/team") || p.startsWith("/admin/attendance"),
  },
  {
    href: "/owner/records",
    label: "Records",
    icon: "Truck",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/records") || p.startsWith("/owner/harvest") || p.startsWith("/owner/inventory") || p.startsWith("/owner/financials"),
  },
  {
    href: "/owner/insights",
    label: "Insights",
    icon: "Activity",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/insights") || p.startsWith("/owner/reports"),
  },
  {
    href: "/owner/settings",
    label: "Settings",
    icon: "Settings",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/settings"),
  },

  // ── 2. ON-SITE FARM MANAGER (FARM_OFFICER) ──
  {
    href: "/officer/day",
    label: "Tasks",
    icon: "ClipboardList",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
  },
  {
    href: "/officer/reports",
    label: "Incidents",
    icon: "AlertTriangle",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/reports"),
  },
  {
    href: "/officer/boundary",
    label: "Walk",
    icon: "Navigation",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/boundary"),
  },
  {
    href: "/officer/profile",
    label: "Profile",
    icon: "User",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/profile"),
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

  // ── 4. SUPER ADMIN (AGAATE HQ ECOSYSTEM OPERATIONS) ──
  {
    href: "/hq",
    label: "Overview",
    icon: "Activity",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p === "/hq" || p === "/dashboard" || p === "/operations",
  },
  {
    href: "/hq/clients",
    label: "Clients",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/clients") || p.startsWith("/clients"),
  },
  {
    href: "/hq/farms",
    label: "Farms",
    icon: "Farm",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/farms") || p.startsWith("/farms"),
  },
  {
    href: "/hq/onboarding",
    label: "Onboarding",
    icon: "Zap",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/onboarding") || p.startsWith("/onboarding"),
  },
  {
    href: "/hq/people",
    label: "People",
    icon: "User",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/people") || p.startsWith("/people") || p.startsWith("/attendance"),
  },
];


export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavForRole(role: Role): NavItem[] {
  const all = getNavForRole(role);
  if (role === "SUPER_ADMIN") {
    return all.filter((i) => ["/hq", "/hq/clients", "/hq/farms", "/hq/onboarding", "/hq/people"].includes(i.href));
  }
  if (role === "FARM_ADMIN") {
    return all.filter((i) => ["/owner/dashboard", "/owner/land", "/owner/operations", "/owner/records", "/owner/insights"].includes(i.href));
  }
  if (role === "FARM_OFFICER") {
    return all.filter((i) => ["/officer/day", "/officer/reports", "/officer/boundary", "/officer/profile"].includes(i.href));
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
  SUPER_ADMIN: "/hq",
  FARM_ADMIN: "/owner/dashboard",
  AGRONOMIST: "/agronomy/radar",
  FARM_OFFICER: "/officer/day",
};
