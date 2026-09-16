import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { downloadUrl } from "@/lib/storage";
import { updateTask } from "@modules/operations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const actor = await currentActor();
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        milestone: { select: { id: true, name: true } },
        assignedOfficer: { select: { name: true } },
        executions: {
          include: {
            media: true,
          },
        },
      },
    });

    await requireFarmAccess(task.farmId);

    const allMedia = task.executions.flatMap((e) => e.media || []);
    const mediaWithUrls = await Promise.all(
      allMedia.map(async (m) => {
        try {
          const url = await downloadUrl(m.storageKey);
          return { id: m.id, url };
        } catch {
          return { id: m.id, url: null };
        }
      })
    );
    const primaryImageUrl = mediaWithUrls.find((m) => m.url)?.url || null;

    return NextResponse.json({
      ...task,
      primaryImageUrl,
      media: mediaWithUrls,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const actor = await currentActor();
    const { result } = await updateTask({ taskId, body: await request.json(), actor });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
