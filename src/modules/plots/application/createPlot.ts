/**
 * modules/plots/application/createPlot — use-case for creating a plot.
 *
 * Enforces farm access, input validation via schema, spatial boundary validation
 * and server-authoritative acreage calculation via Spatial, transactional
 * persistence under farm-row lock, and audit logging.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { validatePlotGeometry, roundAcresForDb } from "@modules/spatial";
import { plotCreateSchema, type PlotCreateInput } from "../schemas/plot";
import {
  findFarmForPlotCreation,
  createPlotWithBoundaryTransaction,
} from "../infrastructure/plotQueries";

export async function createPlot(args: {
  farmId: string;
  rawInput: unknown;
  actor: { id: string; name?: string | null };
}) {
  const { farmId, rawInput, actor } = args;
  const input: PlotCreateInput = plotCreateSchema.parse(rawInput);

  const farm = await findFarmForPlotCreation(prisma, farmId);

  const rawBoundary = input.boundary !== undefined ? input.boundary : input.boundaryGeoJson;
  const geo = validatePlotGeometry(rawBoundary ?? null, farm.boundaryGeoJson);
  const finalArea = geo ? roundAcresForDb(geo.acres) : input.area;
  const boundary = geo ? { geoJson: geo.geoJson, acres: roundAcresForDb(geo.acres) } : null;

  const plot = await createPlotWithBoundaryTransaction(prisma, {
    farmId,
    input,
    finalArea,
    boundary,
    actor,
  });

  await audit(actor.id, "CREATE", "Plot", plot.id, { farmId, name: plot.name });

  return plot;
}
