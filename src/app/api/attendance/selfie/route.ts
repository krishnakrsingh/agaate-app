import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function canViewFarmMedia(actorId: string, farmId: string, viewerRole: string, ownerId: string) {
  if (ownerId === actorId) return true;
  if (viewerRole === "SUPER_ADMIN" || viewerRole === "AGRONOMIST") return true;
  const access = await prisma.farmAccess.findUnique({ where: { userId_farmId: { userId: actorId, farmId } } });
  return !!access?.canManage;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const params = request.nextUrl.searchParams;
    const mediaId = params.get("mediaId");
    const attendanceId = params.get("attendanceId");
    const slot = params.get("slot") === "end" ? "end" : "start";
    // Legacy `key` param removed: arbitrary S3 keys must never be signable.
    if (mediaId) {
      const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
      if (!media?.farmId || !media.verifiedAt) {
        return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      }
      const viewer = await requireFarmAccess(media.farmId);
      if (!(await canViewFarmMedia(actor.id, media.farmId, viewer.role, media.uploadedById))) {
        return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      }
      const url = await downloadUrl(media.storageKey);
      return NextResponse.json({ url, expiresInSeconds: 300 });
    }
    if (attendanceId) {
      const att = await prisma.attendance.findUnique({ where: { id: attendanceId } });
      if (!att?.startSelfieKey && slot === "start") return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      if (!att) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      const viewer = await requireFarmAccess(att.farmId);
      if (!(await canViewFarmMedia(actor.id, att.farmId, viewer.role, att.userId))) {
        return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      }
      const key = slot === "end" ? att.endSelfieKey ?? att.startSelfieKey : att.startSelfieKey;
      if (!key) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      const url = await downloadUrl(key);
      return NextResponse.json({ url, expiresInSeconds: 300 });
    }
    return NextResponse.json({ error: "Storage key required." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
