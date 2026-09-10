import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

/**
 * Retained GPS evidence for a walked boundary. Resolves the track's entity
 * to its farm and enforces the same read access as the entity itself.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ captureId: string }> }
) {
  try {
    const { captureId } = await params;
    const track = await prisma.walkTrack.findUnique({ where: { id: captureId } });
    if (!track) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    const farmId =
      track.entityType === "FARM"
        ? track.entityId
        : (await prisma.plot.findUnique({ where: { id: track.entityId }, select: { farmId: true } }))?.farmId;
    if (!farmId) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    let canManage = false;
    try {
      const actor = await requireFarmAccess(farmId);
      canManage = actor.role === "SUPER_ADMIN" || (await prisma.farmAccess.findUnique({
        where: { userId_farmId: { userId: actor.id, farmId } },
      }).then((a) => a?.canManage ?? false));
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    return NextResponse.json({
      id: track.id,
      entityType: track.entityType,
      entityId: track.entityId,
      quality: track.quality,
      acres: track.acres === null ? null : Number(track.acres),
      samplesKept: track.samplesKept,
      samplesDropped: track.samplesDropped,
      actorId: track.actorId,
      createdAt: track.createdAt.toISOString(),
      // Raw device fixes are evidence-grade detail: managers+ only.
      // Everyone with read access still sees the summary above.
      rawSamples: canManage ? track.rawSamples : null,
      cleanedSamples: canManage ? track.cleanedSamples : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
