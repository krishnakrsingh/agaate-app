# ADR-004 — Authorization: permissions over roles, scope at the edge

- Status: accepted. Date: 2026-09-16.
- Context: WHO (auth/actor) / WHAT (rbac pure catalog) / WHICH (access farm
  scope) already separated — but routes check raw roles (`requireRole`).
- Decision: new code uses `requirePermission(actor, "resource:action")`;
  farm scoping via `requireFarmAccess`/`accessibleFarmWhere` at the route
  edge. `rbac.ts` stays pure (tested). Role trees collapse only after
  domains own logic.
- Rejected: role-based modules; weakening checks during refactor.
- Consequences: adding a permission = catalog + tests, not 90 route edits.
