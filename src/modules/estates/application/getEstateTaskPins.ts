/**
 * modules/estates/application/getEstateTaskPins — use-case for estate map task pins.
 *
 * Retrieves located open tasks pinned to fenced plots, bounded to 200 items,
 * with existence-oracle protection on farm access.
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@/lib/access";
import { EstateFault } from "../domain/estatePolicy";
import { findEstateTaskPinsData } from "../infrastructure/estateQueries";

export async function getEstateTaskPins(args: {
  estateId: string;
  statusParam?: string | null;
  actor?: { id: string };
}) {
  const { estateId, statusParam } = args;

  try {
    await (args.actor ?? requireFarmAccess(estateId));
  } catch {
    throw new EstateFault(404, { error: "The requested record was not found." });
  }

  const { farm, tasks } = await findEstateTaskPinsData(prisma, estateId, statusParam);

  const pins = tasks
    .filter((t) => t.plot && t.plot.boundaryGeoJson)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate.toISOString().slice(0, 10),
      officer: t.assignedOfficer?.name ?? null,
      plotId: t.plot!.id,
      plotName: t.plot!.name,
      boundaryGeoJson: t.plot!.boundaryGeoJson,
      latitude: Number(t.plot!.latitude),
      longitude: Number(t.plot!.longitude),
    }));

  return {
    farm: {
      id: farm.id,
      name: farm.name,
      boundaryGeoJson: farm.boundaryGeoJson,
      latitude: Number(farm.latitude),
      longitude: Number(farm.longitude),
    },
    pins,
    excluded: { unlocated: tasks.length - pins.length },
  };
}
