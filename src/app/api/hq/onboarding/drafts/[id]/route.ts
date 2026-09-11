import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { id } = await params;
    const draft = await prisma.onboardingDraft.findFirst({ where: { id, createdById: actor.id } });
    if (!draft) {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        id: draft.id,
        idempotencyKey: draft.idempotencyKey,
        status: draft.status,
        payload: draft.payload,
        result: draft.resultJson,
        clientName: draft.clientName,
        farmCount: draft.farmCount,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { id } = await params;
    const deleted = await prisma.onboardingDraft.deleteMany({ where: { id, createdById: actor.id, status: "DRAFT" } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
