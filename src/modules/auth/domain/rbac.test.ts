import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_INTERNAL_ROLES,
  describeUserAccess,
  hasPermission,
  normalizePermissions,
  resolveManageFarmIds,
  INTERNAL_ROLES,
  PERMISSION_GROUPS,
  ROLE_CATALOG,
  getRoleMeta,
} from "./rbac";
import { buildActor, actorHasPermission, parseRoleDefinition } from "./actorPolicy";
import { slugifyRoleName, legacyRoleForDefinition, SYSTEM_ROLE_DEFINITIONS } from "./rolePolicy";

describe("auth domain: rbac", () => {
  it("grants SUPER_ADMIN all permissions", () => {
    expect(hasPermission("SUPER_ADMIN", "internal_team:manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "platform:admin")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "field_ops:execute")).toBe(true);
  });

  it("scopes OPERATIONS_MANAGER to HQ ops without internal team admin", () => {
    expect(hasPermission("OPERATIONS_MANAGER", "onboarding:manage")).toBe(true);
    expect(hasPermission("OPERATIONS_MANAGER", "clients:write")).toBe(true);
    expect(hasPermission("OPERATIONS_MANAGER", "internal_team:manage")).toBe(false);
    expect(hasPermission("OPERATIONS_MANAGER", "platform:admin")).toBe(false);
  });

  it("allows agronomist platform read and task creation", () => {
    expect(hasPermission("AGRONOMIST", "farms:read_all")).toBe(true);
    expect(hasPermission("AGRONOMIST", "tasks:create")).toBe(true);
    expect(hasPermission("AGRONOMIST", "onboarding:manage")).toBe(false);
  });

  it("resolves manage farm ids for agronomists and farm admins only", () => {
    expect(resolveManageFarmIds("AGRONOMIST", ["f1", "f2"])).toEqual(["f1", "f2"]);
    expect(resolveManageFarmIds("FARM_ADMIN", ["f1"])).toEqual(["f1"]);
    expect(resolveManageFarmIds("FARM_OFFICER", ["f1"])).toEqual([]);
    expect(resolveManageFarmIds("SUPER_ADMIN", ["f1"])).toEqual([]);
  });

  it("describes HQ platform access for super admin and ops manager", () => {
    expect(describeUserAccess("SUPER_ADMIN", []).label).toBe("All Estates (HQ)");
    expect(describeUserAccess("OPERATIONS_MANAGER", []).label).toBe("All Estates (HQ)");
  });

  it("describes agronomist lead vs assigned estates", () => {
    const withLead = describeUserAccess("AGRONOMIST", [{ canManage: true }, { canManage: false }]);
    expect(withLead.label).toBe("2 estates");
    expect(withLead.detail).toContain("lead agronomist");

    const platformOnly = describeUserAccess("AGRONOMIST", []);
    expect(platformOnly.label).toBe("Platform view");
  });

  it("lists internal roles for HQ directory", () => {
    expect(INTERNAL_ROLES).toContain("OPERATIONS_MANAGER");
    expect(ASSIGNABLE_INTERNAL_ROLES).toEqual(["AGRONOMIST", "OPERATIONS_MANAGER", "SUPER_ADMIN"]);
  });

  it("checks permissions from a dynamic permission list", () => {
    const perms = ["clients:read", "farms:read_all"] as const;
    expect(hasPermission([...perms], "clients:read")).toBe(true);
    expect(hasPermission([...perms], "internal_team:manage")).toBe(false);
    expect(hasPermission([...perms, "platform:admin"], "internal_team:manage")).toBe(true);
  });

  it("normalizes permission input and drops unknown keys", () => {
    expect(normalizePermissions(["clients:read", "not-a-perm", "farms:read_all"])).toEqual([
      "clients:read",
      "farms:read_all",
    ]);
  });

  it("exposes grouped permission checklist metadata", () => {
    const allGrouped = PERMISSION_GROUPS.flatMap((g) => g.permissions);
    expect(allGrouped.length).toBeGreaterThan(0);
    expect(new Set(allGrouped).size).toBe(allGrouped.length);
  });

  it("describes access using role definition scope", () => {
    expect(describeUserAccess("custom-role", [], "platform").label).toBe("All Estates (HQ)");
    expect(describeUserAccess("AGRONOMIST", [{ canManage: true }], "assigned").detail).toContain("lead agronomist");
  });

  it("returns fallback for unknown roles in getRoleMeta", () => {
    const meta = getRoleMeta("UNKNOWN_ROLE");
    expect(meta.label).toBe("UNKNOWN ROLE");
    expect(meta.scope).toBe("assigned");
  });
});

describe("auth domain: actorPolicy", () => {
  it("builds actor with standard role fallback", () => {
    const actor = buildActor({
      id: "u1",
      name: "Officer Dave",
      email: "dave@example.com",
      role: "FARM_OFFICER",
      active: true,
      clientId: "c1",
      roleDefinitionId: null,
      roleDefinition: null,
    });
    expect(actor.id).toBe("u1");
    expect(actor.roleLabel).toBe("Farm Manager");
    expect(actor.tier).toBe("field");
    expect(actor.scope).toBe("self");
    expect(actorHasPermission(actor, "field_ops:execute")).toBe(true);
    expect(actorHasPermission(actor, "platform:admin")).toBe(false);
  });

  it("parses role definition and overrides role label/permissions", () => {
    const def = parseRoleDefinition({
      id: "rd1",
      slug: "custom-scout",
      label: "Lead Scout",
      description: "Custom scout role",
      tier: "field",
      scope: "assigned",
      permissions: JSON.stringify(["tasks:read", "field_ops:execute"]),
      isSystem: false,
      active: true,
    });
    expect(def).not.toBeNull();
    expect(def?.label).toBe("Lead Scout");
    expect(def?.permissions).toEqual(["tasks:read", "field_ops:execute"]);

    const actor = buildActor({
      id: "u2",
      name: "Lead Scout Bob",
      email: "bob@example.com",
      role: "FARM_OFFICER",
      active: true,
      clientId: "c1",
      roleDefinitionId: "rd1",
      roleDefinition: {
        id: "rd1",
        slug: "custom-scout",
        label: "Lead Scout",
        description: "Custom scout role",
        tier: "field",
        scope: "assigned",
        permissions: JSON.stringify(["tasks:read", "field_ops:execute"]),
        isSystem: false,
        active: true,
      },
    });
    expect(actor.roleLabel).toBe("Lead Scout");
    expect(actor.roleSlug).toBe("custom-scout");
    expect(actorHasPermission(actor, "tasks:read")).toBe(true);
  });
});

describe("auth domain: rolePolicy", () => {
  it("slugifies role names correctly", () => {
    expect(slugifyRoleName("Senior Field Lead")).toBe("senior-field-lead");
    expect(slugifyRoleName("  Admin -- Level 2! ")).toBe("admin-level-2");
  });

  it("maps legacy roles for custom definitions", () => {
    expect(legacyRoleForDefinition("custom-hq", "hq")).toBe("AGRONOMIST");
    expect(legacyRoleForDefinition("custom-client", "client")).toBe("FARM_ADMIN");
    expect(legacyRoleForDefinition("custom-field", "field")).toBe("FARM_OFFICER");
    expect(legacyRoleForDefinition("SUPER_ADMIN", "hq")).toBe("SUPER_ADMIN");
  });

  it("seeds system role definitions covering all role catalog entries", () => {
    expect(SYSTEM_ROLE_DEFINITIONS.length).toBe(Object.keys(ROLE_CATALOG).length);
  });
});
