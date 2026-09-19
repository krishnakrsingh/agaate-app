import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: "Farm" | "Sun" | "Calendar" | "ClipboardList" | "FileText" | "Shield" | "Users" | "Camera" | "Activity" | "Package" | "Coins" | "Truck" | "Stethoscope" | "TrendingUp" | "Zap" | "User" | "AlertTriangle" | "Plot" | "Settings" | "Navigation" | "Key";
  roles: Role[];
  isActive?: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // ── 1. FARM OWNER (FARM_ADMIN) ──
  {
    href: "/owner/farms",
    label: "Farms",
    icon: "Farm",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/farms") || p === "/owner/farm",
  },
  {
    href: "/owner/crops",
    label: "Crops",
    icon: "TrendingUp",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/crops"),
  },
  {
    href: "/owner/operations",
    label: "Operations",
    icon: "ClipboardList",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/operations") || p.startsWith("/owner/calendar") || p.startsWith("/tasks"),
  },
  {
    href: "/owner/chat",
    label: "Chat",
    icon: "Users",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/chat"),
  },
  {
    href: "/owner/people",
    label: "Team",
    icon: "Shield",
    roles: ["FARM_ADMIN"],
    isActive: (p) => p.startsWith("/owner/people") || p.startsWith("/owner/team"),
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
    href: "/officer/chat",
    label: "Agronomist",
    icon: "Users",
    roles: ["FARM_OFFICER"],
    isActive: (p) => p.startsWith("/officer/chat"),
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
    href: "/agronomy/chat",
    label: "Field Messages",
    icon: "Users",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/agronomy/chat") || p.startsWith("/agronomy"),
  },
  {
    href: "/tasks",
    label: "All Tasks",
    icon: "ClipboardList",
    roles: ["AGRONOMIST"],
    isActive: (p) => p.startsWith("/tasks"),
  },

  // ── 4. HQ STAFF (SUPER ADMIN + OPERATIONS MANAGER) ──
  {
    href: "/hq/clients",
    label: "Clients",
    icon: "Users",
    roles: ["SUPER_ADMIN", "OPERATIONS_MANAGER"],
    isActive: (p) => p.startsWith("/hq/clients") || p.startsWith("/clients"),
  },
  {
    href: "/hq/farms",
    label: "Farms",
    icon: "Farm",
    roles: ["SUPER_ADMIN", "OPERATIONS_MANAGER"],
    isActive: (p) => p.startsWith("/hq/farms") || p.startsWith("/farms"),
  },
  {
    href: "/hq/onboarding",
    label: "Onboarding",
    icon: "Zap",
    roles: ["SUPER_ADMIN", "OPERATIONS_MANAGER"],
    isActive: (p) => p.startsWith("/hq/onboarding") || p.startsWith("/onboarding"),
  },
  {
    href: "/hq/people",
    label: "Internal Team",
    icon: "Shield",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/people") || p.startsWith("/people"),
  },
  {
    href: "/hq/agronomists",
    label: "Agronomists",
    icon: "Stethoscope",
    roles: ["SUPER_ADMIN"],
    isActive: (p) => p.startsWith("/hq/agronomists"),
  },
  {
    href: "/hq/profile",
    label: "Profile & Settings",
    icon: "Settings",
    roles: ["SUPER_ADMIN", "OPERATIONS_MANAGER"],
    isActive: (p) => p.startsWith("/hq/profile") || p.startsWith("/hq/settings") || p.startsWith("/hq/security"),
  },
];


export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavForRole(role: Role): NavItem[] {
  const all = getNavForRole(role);
  if (role === "SUPER_ADMIN") {
    return all.filter((i) => ["/hq/clients", "/hq/farms", "/hq/onboarding", "/hq/people", "/hq/agronomists"].includes(i.href));
  }
  if (role === "OPERATIONS_MANAGER") {
    return all.filter((i) => ["/hq/clients", "/hq/farms", "/hq/onboarding"].includes(i.href));
  }
  if (role === "FARM_ADMIN") {
    return all.filter((i) => ["/owner/farms", "/owner/crops", "/owner/operations", "/owner/chat", "/owner/people"].includes(i.href));
  }
  if (role === "FARM_OFFICER") {
    return all.filter((i) => ["/officer/day", "/officer/chat", "/officer/reports", "/officer/boundary", "/officer/profile"].includes(i.href));
  }
  if (role === "AGRONOMIST") {
    return all.filter((i) => ["/agronomy/chat", "/tasks"].includes(i.href));
  }
  return all.slice(0, 5);
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "SUPER ADMIN",
  OPERATIONS_MANAGER: "OPS MANAGER",
  FARM_ADMIN: "FARM OWNER",
  AGRONOMIST: "AGRONOMIST",
  FARM_OFFICER: "FARM MANAGER",
};

export const ROLE_HOME_URLS: Record<string, string> = {
  SUPER_ADMIN: "/hq/clients",
  OPERATIONS_MANAGER: "/hq/clients",
  FARM_ADMIN: "/owner/farms",
  AGRONOMIST: "/agronomy/chat",
  FARM_OFFICER: "/officer/day",
};
