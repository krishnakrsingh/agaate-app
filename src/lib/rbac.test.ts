import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_INTERNAL_ROLES,
  describeUserAccess,
  hasPermission,
  resolveManageFarmIds,
  INTERNAL_ROLES,
} from "./rbac";

describe("rbac", () => {
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
});
