import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";

const onboardSchema = z.object({
  // Estate / Farm Details
  farmName: z.string().min(2).max(120),
  location: z.string().min(2).max(150),
  address: z.string().max(250).optional().nullable(),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  totalArea: z.coerce.number().positive(),
  cultivableArea: z.coerce.number().positive(),
  waterSource: z.string().max(300).optional().nullable(),
  geofenceRadiusMeters: z.coerce.number().int().min(100).max(5000).default(500),

  // Client Owner Credentials
  ownerName: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(128),

  // Assigned Central Agronomist
  agronomistId: z.string().optional().nullable(),

  // Optional Initial Plot
  initialPlotName: z.string().max(100).optional().nullable(),
  initialPlotArea: z.coerce.number().positive().optional().nullable(),
  initialIrrigationType: z.enum(["Drip", "Sprinkler", "Rain Pipe", "Flood", "Other"]).default("Drip"),
}).superRefine((data, ctx) => {
  if (data.cultivableArea > data.totalArea) {
    ctx.addIssue({
      code: "custom",
      path: ["cultivableArea"],
      message: "Cultivable area cannot exceed total estate area.",
    });
  }
  if (data.initialPlotArea && data.initialPlotArea > data.cultivableArea) {
    ctx.addIssue({
      code: "custom",
      path: ["initialPlotArea"],
      message: "Initial plot area cannot exceed farm cultivable area.",
    });
  }
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const body = await request.json();
    const input = onboardSchema.parse(body);

    const email = input.ownerEmail.toLowerCase();
    const passwordHash = await bcrypt.hash(input.ownerPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or retrieve Client Owner user
      let owner = await tx.user.findUnique({
        where: { email },
      });

      if (!owner) {
        owner = await tx.user.create({
          data: {
            name: input.ownerName,
            email,
            passwordHash,
            role: "FARM_ADMIN",
            active: true,
          },
        });
      }

      // 2. Create the Farm (Activated directly as requested)
      const farm = await tx.farm.create({
        data: {
          name: input.farmName,
          ownerName: input.ownerName,
          location: input.location,
          address: input.address || null,
          latitude: input.latitude,
          longitude: input.longitude,
          totalArea: input.totalArea,
          cultivableArea: input.cultivableArea,
          waterSource: input.waterSource || "Borewell / General",
          geofenceRadiusMeters: input.geofenceRadiusMeters,
          status: "ACTIVE",
        },
      });

      // 3. Grant Owner Management Access
      await tx.farmAccess.create({
        data: {
          userId: owner.id,
          farmId: farm.id,
          canManage: true,
        },
      });

      // 4. Assign Dedicated Central Agronomist if selected
      let assignedAgronomist: any = null;
      if (input.agronomistId) {
        assignedAgronomist = await tx.user.findUnique({
          where: { id: input.agronomistId },
          select: { id: true, name: true, email: true, role: true },
        });

        if (assignedAgronomist) {
          await tx.farmAccess.create({
            data: {
              userId: assignedAgronomist.id,
              farmId: farm.id,
              canManage: false,
            },
          });
        }
      }

      // 5. Demarcate Initial Plot if specified
      let plot: any = null;
      if (input.initialPlotName && input.initialPlotArea) {
        plot = await tx.plot.create({
          data: {
            farmId: farm.id,
            name: input.initialPlotName,
            area: input.initialPlotArea,
            latitude: input.latitude,
            longitude: input.longitude,
            status: "ACTIVE",
            irrigation: {
              create: [
                {
                  type: input.initialIrrigationType,
                  details: "Standard initial setup",
                },
              ],
            },
          },
          include: { irrigation: true },
        });
      }

      return {
        farm,
        owner: { id: owner.id, name: owner.name, email: owner.email },
        agronomist: assignedAgronomist,
        plot,
      };
    });

    await audit(actor.id, "CREATE", "Farm", result.farm.id, {
      onboarding: true,
      ownerId: result.owner.id,
      agronomistId: result.agronomist?.id,
    });

    // Dispatch instant client credential handover alert
    await sendNotification({
      type: "CLIENT_CREDENTIALS",
      recipientEmail: result.owner.email,
      recipientName: result.owner.name,
      title: `Welcome to Agaate — Your Farm "${result.farm.name}" is Provisioned`,
      message: `Your agricultural operations portal is ready. Login at /login with email: ${result.owner.email} using your secure credentials.`,
      metadata: {
        farmId: result.farm.id,
        farmName: result.farm.name,
        cultivableAcreage: result.farm.cultivableArea,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
      handover: {
        estateName: result.farm.name,
        clientName: result.owner.name,
        clientEmail: result.owner.email,
        initialPassword: input.ownerPassword,
        loginUrl: "/login",
      },
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
