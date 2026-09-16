# ADDING_A_FEATURE — "I need to add a new crop operation"

Worked example: agronomist creates a "Fertigation" operation on a plot.

## 1. Name it (vocabulary first)

It is a TASK (canonical term) with `origin=AGRONOMIST`, `category=Fertigation`.
If you catch yourself saying "activity/work order", re-read
CANONICAL_DOMAIN_TERMS. Owner: `operations` (state) + `cropping` (target).

## 2. Domain rule (pure, testable)

```ts
// modules/operations/domain/transitions.ts (TARGET location)
import { canTransitionTask } from "@/lib/business"; // today; moves in step 4
if (!canTransitionTask("DRAFT", "ASSIGNED")) throw new HttpError(422, "...");
```

Pure: no Prisma, no Next. Add a `*.test.ts` next to it.

## 3. Use-case (orchestration)

```ts
// modules/operations/application/createTask.ts (TARGET)
export async function createTask(input, actor, db) {
  requirePermission(actor, "tasks:create");
  await requireFarmAccess(input.farmId); // resource scope
  return db.task.create({ ... });        // db injected; no global Prisma in domain
}
```

## 4. Validation (layered, deliberately)

- Transport: Zod schema in `route.ts` (shapes, ranges).
- Domain: invariants in the use-case (transitions, containment via `modules/spatial`).
- DB: constraints as backstop (unique/index), never as the only check.

## 5. Route (thin — today's actual pattern, slimmed)

```ts
import { createTask } from "@modules/operations"; // target; today: inline but same order
export async function POST(req: NextRequest) {
  try {
    const actor = await currentActor();
    const input = schema.parse(await req.json());
    const task = await createTask(input, actor, prisma); // prisma from @/infrastructure/db for NEW routes
    await audit(...);
    return NextResponse.json(task);
  } catch (e) { return apiError(e); }
}
```

## 6. UI

- Generic widgets → `components/ui/`. Business view → owning module's `ui/`
  (today: `components/ops/`). Role differences = composition in `app/(hq|officer|owner)/`,
  never duplicated rules.

## 7. Auth

New permission? Add to `ALL_PERMISSIONS` + `ROLE_PERMISSIONS` in `lib/rbac.ts`,
exposed via `modules/auth`. Check with `requirePermission`, not role strings.

## 8. Tests + docs

- Unit: domain rule. Application: use-case with fake db. Keep E2E green.
- Update MODULE_BOUNDARIES (ownership) + MIGRATION_STATUS if you moved code.

If you cannot answer "which module owns this?" in 30 seconds, stop and
update DOMAIN_MAP first. That confusion IS the architecture talking.
