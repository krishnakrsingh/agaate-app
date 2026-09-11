import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { MAX_FARMS } from "@/components/hq/onboarding-schema";

const saveSchema = z.object({
  id: z.string().min(1).optional().nullable(),
  idempotencyKey: z.string().min(8).max(64),
  payload: z.record(z.any()),
  clientName: z.string().max(120).optional().nullable(),
  farmCount: z.number().int().min(0).max(MAX_FARMS).optional().nullable(),
});

export async function GET() {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const drafts = await prisma.onboardingDraft.findMany({
      where: { createdById: actor.id, status: "DRAFT" },
      select: { id: true, clientName: true, farmCount: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json(
      drafts.map((d) => ({
        id: d.id,
        clientName: d.clientName,
        farmCount: d.farmCount,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const input = saveSchema.parse(await request.json());

    const serialized = JSON.stringify(input.payload);
    if (serialized.length > 800_000) {
      return NextResponse.json({ error: "Validation failed: draft is too large to save." }, { status: 422 });
    }

    const data = {
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      clientName: input.clientName?.trim() || null,
      farmCount: input.farmCount ?? 0,
    };

    if (input.id) {
      const updated = await prisma.onboardingDraft.updateMany({
        where: { id: input.id, createdById: actor.id, status: "DRAFT" },
        data,
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
      }
      const row = await prisma.onboardingDraft.findUniqueOrThrow({ where: { id: input.id } });
      return NextResponse.json({ id: row.id, updatedAt: row.updatedAt.toISOString() });
    }

    const created = await prisma.onboardingDraft.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: { ...data },
      create: { ...data, createdById: actor.id, status: "DRAFT" },
    });
    return NextResponse.json({ id: created.id, updatedAt: created.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
