import { NextResponse } from "next/server";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { headObject } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function POST(_: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  try {
    const { mediaId } = await params;
    const actor = await currentActor();
    const media = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: mediaId } });
    if (!media.farmId) throw new Error("Media is not attached to a farm record.");
    await requireFarmAccess(media.farmId);
    if (media.uploadedById !== actor.id && actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "You cannot confirm another user's upload." }, { status: 403 });
    const remote = await headObject(media.storageKey);
    if (!remote.ContentLength || remote.ContentLength > 10 * 1024 * 1024) return NextResponse.json({ error: "Uploaded file is missing or exceeds the size limit." }, { status: 422 });
    if (remote.ContentLength !== media.sizeBytes) return NextResponse.json({ error: "Uploaded file size does not match its declared metadata." }, { status: 422 });
    if (remote.ContentType && remote.ContentType !== media.mimeType) return NextResponse.json({ error: "Uploaded file type does not match its metadata." }, { status: 422 });
    const updated = await prisma.mediaAsset.update({ where: { id: mediaId }, data: { sizeBytes: Number(remote.ContentLength), verifiedAt: new Date() } });
    await audit(actor.id, "COMPLETE_UPLOAD", "MediaAsset", mediaId, { sizeBytes: remote.ContentLength });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
