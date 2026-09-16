# MIGRATION_PLAN (strangler order — risk-minimal)

1. ✅ **spatial (pilot, THIS PR):** re-export entrypoint only. Zero behavior
   change. Proves pattern + docs + enforcement. Next: migrate imports
   route-by-route, then physically move files.
2. ✅ **auth (re-export, THIS PR):** same treatment; `rbac.ts` purity locked.
3. **infrastructure/db + http (THIS PR):** new import paths established;
   old paths compat. Next: new routes use them; old routes migrate opportunistically.
4. **operations (task state machine):** extract `taskTransitions` +
   `canTransitionTask` behind `modules/operations`; thin one route
   (`tasks/[taskId]/complete`) as proof. Low risk, high value.
5. **attendance (state):** move check-in/out orchestration out of the fat
   route into use-cases; decision stays in spatial.
6. **estates → cropping → agronomy → incidents → harvest/inventory/finance
   → reporting/audit/media/organization:** in dependency order (leaves last).
7. **Role-tree collapse LAST:** only after domains own logic; `hq/officer/
   owner` become composition. Never before.

Checkpoint after every step: `npx tsc --noEmit` + `npm test` + relevant
E2E. Stop-and-document beats half-migrated silence (see MIGRATION_STATUS).
