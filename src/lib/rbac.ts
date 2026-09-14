import type { Role } from "@prisma/client";

/** Platform permissions — resource:action pairs used across API routes and UI. */
export type Permission =
  | "platform:admin"
  | "internal_team:manage"
  | "clients:read"
  | "clients:write"
  | "onboarding:manage"
  | "farms:read_all"
  | "farms:write"
  | "analytics:read"
  | "tasks:create"
  | "tasks:read"
  | "incidents:read"
  | "incidents:write"
  | "attendance:manage"
  | "farm_team:manage"
  | "farm_settings:manage"
  | "field_ops:execute";

export type RoleTier = "hq" | "client" | "field";
export type AccessScope = "platform" | "assigned" | "client" | "self";

export type RoleMeta = {
  value: Role;
  label: string;
  shortLabel: string;
  description: string;
  tier: RoleTier;
  scope: AccessScope;
  /** Shown in role picker and access drawers. */
  capabilities: string[];
};

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "AGRONOMIST",
  "FARM_ADMIN",
  "FARM_OFFICER",
];

/** Internal Agaate HQ staff — managed on /hq/people. */
export const INTERNAL_ROLES: Role[] = ["SUPER_ADMIN", "OPERATIONS_MANAGER", "AGRONOMIST"];

/** Client-side roles — provisioned via onboarding or farm owner consoles. */
export const CLIENT_ROLES: Role[] = ["FARM_ADMIN", "FARM_OFFICER"];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    "platform:admin",
    "internal_team:manage",
    "clients:read",
    "clients:write",
    "onboarding:manage",
    "farms:read_all",
    "farms:write",
    "analytics:read",
    "tasks:create",
    "tasks:read",
    "incidents:read",
    "incidents:write",
    "attendance:manage",
    "farm_team:manage",
    "farm_settings:manage",
    "field_ops:execute",
  ],
  OPERATIONS_MANAGER: [
    "clients:read",
    "clients:write",
    "onboarding:manage",
    "farms:read_all",
    "farms:write",
    "analytics:read",
    "tasks:read",
    "incidents:read",
    "attendance:manage",
  ],
  AGRONOMIST: [
    "farms:read_all",
    "analytics:read",
    "tasks:create",
    "tasks:read",
    "incidents:read",
    "incidents:write",
    "field_ops:execute",
  ],
  FARM_ADMIN: [
    "farms:read_all",
    "tasks:read",
    "incidents:read",
    "incidents:write",
    "attendance:manage",
    "farm_team:manage",
    "farm_settings:manage",
  ],
  FARM_OFFICER: [
    "tasks:read",
    "incidents:read",
    "incidents:write",
    "field_ops:execute",
  ],
};

export const ROLE_CATALOG: Record<Role, RoleMeta> = {
  SUPER_ADMIN: {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    shortLabel: "Super Admin",
    description: "Full platform control — clients, onboarding, internal team, and all estates.",
    tier: "hq",
    scope: "platform",
    capabilities: [
      "Manage internal team & roles",
      "Onboard clients and estates",
      "Full read/write across platform",
      "System configuration",
    ],
  },
  OPERATIONS_MANAGER: {
    value: "OPERATIONS_MANAGER",
    label: "Operations Manager",
    shortLabel: "Ops Manager",
    description: "HQ operations — client portfolio, onboarding, and estate setup. No internal team admin.",
    tier: "hq",
    scope: "platform",
    capabilities: [
      "Manage clients & onboarding",
      "Configure estates platform-wide",
      "View analytics & attendance",
      "Cannot manage internal team",
    ],
  },
  AGRONOMIST: {
    value: "AGRONOMIST",
    label: "Agronomist",
    shortLabel: "Agronomist",
    description: "Technical specialist — crop planning, diagnostics, and field task assignment.",
    tier: "hq",
    scope: "assigned",
    capabilities: [
      "Read all estates (platform view)",
      "Create agronomy tasks & prescriptions",
      "Lead estates when marked LEAD",
      "Field diagnostics & reports",
    ],
  },
  FARM_ADMIN: {
    value: "FARM_ADMIN",
    label: "Farm Owner",
    shortLabel: "Farm Owner",
    description: "Client portal administrator for their estates, team, and operations.",
    tier: "client",
    scope: "client",
    capabilities: [
      "Manage assigned estates",
      "Appoint farm managers (officers)",
      "Attendance & roster control",
      "Estate settings & records",
    ],
  },
  FARM_OFFICER: {
    value: "FARM_OFFICER",
    label: "Farm Manager",
    shortLabel: "Farm Manager",
    description: "On-site operator — daily tasks, incidents, boundary walks, and field logs.",
    tier: "field",
    scope: "self",
    capabilities: [
      "Execute assigned daily tasks",
      "Log incidents & field reports",
      "GPS boundary walks",
      "Self attendance check-in",
    ],
  },
};

/** Roles a SUPER_ADMIN may assign on the internal team page. */
export const ASSIGNABLE_INTERNAL_ROLES: Role[] = [
  "AGRONOMIST",
  "OPERATIONS_MANAGER",
  "SUPER_ADMIN",
];

export function getRoleMeta(role: Role | string): RoleMeta {
  const key = role as Role;
  return ROLE_CATALOG[key] ?? {
    value: key,
    label: String(role).replaceAll("_", " "),
    shortLabel: String(role).replaceAll("_", " "),
    description: "",
    tier: "field",
    scope: "assigned",
    capabilities: [],
  };
}

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

/** Whether this role uses FarmAccess rows with canManage for lead/admin semantics. */
export function roleUsesFarmAccess(role: Role): boolean {
  return role === "FARM_ADMIN" || role === "AGRONOMIST" || role === "FARM_OFFICER";
}

/** Resolve which farm IDs get canManage=true when saving user access. */
export function resolveManageFarmIds(role: Role, managesFarmIds: string[]): string[] {
  if (role === "FARM_ADMIN" || role === "AGRONOMIST") {
    return managesFarmIds;
  }
  return [];
}

export type AccessLevelLabel = {
  label: string;
  detail: string;
  tone: "platform" | "lead" | "assigned" | "none" | "client";
};

/** Human-readable access summary for directory tables. */
export function describeUserAccess(
  role: Role,
  farmAccess: { canManage: boolean }[]
): AccessLevelLabel {
  if (role === "SUPER_ADMIN" || role === "OPERATIONS_MANAGER") {
    return {
      label: "All Estates (HQ)",
      detail: role === "SUPER_ADMIN" ? "Unrestricted platform access" : "Platform operations scope",
      tone: "platform",
    };
  }

  if (role === "FARM_ADMIN") {
    const managed = farmAccess.filter((f) => f.canManage).length;
    const total = farmAccess.length;
    if (total === 0) return { label: "No estates", detail: "Assign estate admin access", tone: "none" };
    return {
      label: `${total} estate${total === 1 ? "" : "s"}`,
      detail: managed > 0 ? `${managed} as estate admin` : "Observer access",
      tone: "client",
    };
  }

  if (role === "AGRONOMIST") {
    const leads = farmAccess.filter((f) => f.canManage).length;
    const total = farmAccess.length;
    if (total === 0) {
      return {
        label: "Platform view",
        detail: "Can read all estates; no lead assignments",
        tone: "assigned",
      };
    }
    return {
      label: `${total} estate${total === 1 ? "" : "s"}`,
      detail: leads > 0 ? `${leads} as lead agronomist` : "All assigned (observer)",
      tone: leads > 0 ? "lead" : "assigned",
    };
  }

  const total = farmAccess.length;
  if (total === 0) return { label: "No estates", detail: "Assign to an estate", tone: "none" };
  return {
    label: `${total} estate${total === 1 ? "" : "s"}`,
    detail: "Field operations scope",
    tone: "assigned",
  };
}
