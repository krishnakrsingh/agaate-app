import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const input = schema.parse(await request.json());

    const data: { name?: string; phone?: string | null } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 400 });
  }
}
