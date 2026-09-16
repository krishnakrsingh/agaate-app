/**
 * modules/estates/application/updateEstate — use-case for updating an estate.
 *
 * Handles transport input parsing, status transition invariants,
 * boundary validation + normalization via Spatial, farm-shrink orphan protection,
 * atomic database persistence with concurrency lock, and audit logging.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/lib/audit";
import {
  parseBoundary,
  roundAcresForDb,
  parseBoundaryToRing,
  plotsOutsideRing,
} from "@modules/spatial";
import {
  estatePatchSchema,
  type EstatePatchInput,
} from "../schemas/estate";
import {
  EstateFault,
  assertCultivableWithinTotal,
  assertValidEstateStatusTransition,
} from "../domain/estatePolicy";
import {
  findEstateForPatch,
  countEstateActivePlots,
  updateEstateWithBoundaryTransaction,
  type BoundaryIntent,
} from "../infrastructure/estateQueries";

export async function updateEstate(args: {
  estateId: string;
  rawInput: unknown;
  actor: { id: string; name?: string | null; role: string };
}) {
  const { estateId, rawInput, actor } = args;
  const input: EstatePatchInput = estatePatchSchema.parse(rawInput);

  const current = await findEstateForPatch(prisma, estateId);

  const total = input.totalArea ?? Number(current.totalArea);
  const cultivable = input.cultivableArea ?? Number(current.cultivableArea);

  assertCultivableWithinTotal(cultivable, total);

  if (input.status && input.status !== current.status) {
    assertValidEstateStatusTransition(current.status, input.status);
    if (input.status === "ACTIVE") {
      const plotCount = await countEstateActivePlots(prisma, estateId);
      if (!plotCount) {
        throw new EstateFault(422, { error: "Farm activation requires at least one plot." });
      }
    }
  }

  const { boundaryGeoJson: rawCanonical, boundary: rawAlias, force: _force, ...rest } = input;
  const rawBoundary = rawCanonical !== undefined ? rawCanonical : rawAlias;
  let boundaryIntent: BoundaryIntent = { kind: "keep" };

  if (rawBoundary !== undefined) {
    const isEmpty =
      rawBoundary === null ||
      (typeof rawBoundary === "string" && rawBoundary.trim() === "") ||
      (Array.isArray(rawBoundary) && rawBoundary.length === 0);

    if (isEmpty) {
      boundaryIntent = { kind: "clear" };
    } else {
      try {
        const parsed = parseBoundary(rawBoundary);
        if (!parsed) {
          boundaryIntent = { kind: "clear" };
        } else {
          boundaryIntent = {
            kind: "set",
            geoJson: parsed.geoJson,
            acres: roundAcresForDb(parsed.acres),
          };
        }
      } catch (e) {
        throw new EstateFault(422, {
          error: e instanceof Error ? e.message : "Invalid farm boundary.",
        });
      }
    }
  }

  let shrinkOrphans: string[] = [];
  if (boundaryIntent.kind !== "keep") {
    const newRing =
      boundaryIntent.kind === "set" ? parseBoundaryToRing(boundaryIntent.geoJson) : null;
    const check = await plotsOutsideRing(prisma, estateId, newRing);
    shrinkOrphans = [...check.outside, ...check.unverifiable];
    if (shrinkOrphans.length > 0 && input.force !== true) {
      throw new EstateFault(409, {
        error: `This fence change would leave ${shrinkOrphans.length} fenced plot(s) outside the farm: ${shrinkOrphans.slice(0, 5).join(", ")}${shrinkOrphans.length > 5 ? "…" : ""}. Move the plots first, or resend with force:true (audited).`,
        code: "FARM_SHRINK_ORPHANS",
        plots: shrinkOrphans,
      });
    }
  }

  const farm = await updateEstateWithBoundaryTransaction(prisma, {
    estateId,
    updateData: rest,
    boundaryIntent,
    cultivableArea: cultivable,
    actor,
  });

  await audit(
    actor.id,
    input.status ? "STATUS_CHANGE" : "UPDATE",
    "Farm",
    estateId,
    {
      ...rest,
      boundary: boundaryIntent.kind,
      ...(shrinkOrphans.length > 0 ? { forcedShrink: true, orphanedPlots: shrinkOrphans } : {}),
    }
  );

  return farm;
}
