import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore, paginationParams } from "@/lib/api";

const createClientSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(30).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).max(20).optional().nullable(),
  companyName: z.string().max(180).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const search = sp.get("search")?.trim();
    const status = sp.get("status")?.trim();
    const state = sp.get("state")?.trim();

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (state && state !== "ALL") {
      where.state = state;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          farms: {
            select: {
              id: true,
              name: true,
              location: true,
              status: true,
              setupStage: true,
              setupProgress: true,
              totalArea: true,
              cultivableArea: true,
            },
          },
          users: {
            where: { role: "FARM_ADMIN" },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              active: true,
            },
          },
          _count: {
            select: { farms: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    const formatted = clients.map((c) => {
      const totalAcreage = c.farms.reduce(
        (acc, f) => acc + Number(f.totalArea || 0),
        0
      );
      const totalCultivable = c.farms.reduce(
        (acc, f) => acc + Number(f.cultivableArea || 0),
        0
      );
      const activeFarmsCount = c.farms.filter((f) => f.status === "ACTIVE").length;
      const setupFarmsCount = c.farms.filter((f) => f.status === "SETUP").length;

      return {
        id: c.id,
        code: c.code || `CLI-${c.id.slice(-4).toUpperCase()}`,
        name: c.name,
        companyName: c.companyName,
        email: c.email,
        phone: c.phone,
        state: c.state,
        district: c.district,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        totalFarms: c._count.farms,
        activeFarmsCount,
        setupFarmsCount,
        totalAcreage,
        totalCultivable,
        farms: c.farms,
        owners: c.users,
      };
    });

    return NextResponse.json(
      {
        clients: formatted,
        total,
        limit,
        offset,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const input = createClientSchema.parse(await request.json());
    const generatedCode =
      input.code || `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

    const client = await prisma.client.create({
      data: {
        ...input,
        code: generatedCode,
        status: "ACTIVE",
      },
    });

    await audit(actor.id, "CREATE", "Client", client.id, {
      name: client.name,
      code: client.code,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
