import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore } from "@/lib/api";

const updateClientSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  companyName: z.string().max(180).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).max(20).optional().nullable(),
  entityType: z.string().max(50).optional().nullable(),
  panNumber: z.string().max(20).optional().nullable(),
  gstin: z.string().max(25).optional().nullable(),
  billingAddress: z.string().max(300).optional().nullable(),
  secondaryContact: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { clientId } = await params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        farms: {
          include: {
            plots: {
              where: { deletedAt: null },
              select: { id: true, name: true, area: true, status: true },
            },
            access: {
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const totalAcreage = client.farms.reduce(
      (acc, f) => acc + Number(f.totalArea || 0),
      0
    );
    const totalCultivable = client.farms.reduce(
      (acc, f) => acc + Number(f.cultivableArea || 0),
      0
    );
    const activeFarms = client.farms.filter((f) => f.status === "ACTIVE").length;
    const setupFarms = client.farms.filter((f) => f.status === "SETUP").length;
    const totalPlots = client.farms.reduce((acc, f) => acc + f.plots.length, 0);

    return NextResponse.json(
      {
        ...client,
        metrics: {
          totalAcreage,
          totalCultivable,
          activeFarms,
          setupFarms,
          totalFarms: client.farms.length,
          totalPlots,
          totalUsers: client.users.length,
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { clientId } = await params;
    const input = updateClientSchema.parse(await request.json());

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: input,
    });

    await audit(actor.id, "UPDATE", "Client", clientId, input);
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
