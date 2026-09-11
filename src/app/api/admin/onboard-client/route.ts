import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";
import { parseBoundary, roundAcresForDb } from "@/lib/geo-server";
import { commitBoundary } from "@/lib/geo-versions";

const onboardSchema = z.object({
  // Client Legal Entity & Profile
  clientId: z.string().optional().nullable(),
  entityType: z.string().max(50).optional().nullable(),
  panNumber: z.string().max(20).optional().nullable(),
  gstin: z.string().max(25).optional().nullable(),
  billingAddress: z.string().max(300).optional().nullable(),
  secondaryContact: z.string().max(100).optional().nullable(),
  ownerName: z.string().min(2).max(100),
  ownerPhone: z.string().max(30).optional().nullable(),
  ownerDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD.").optional().nullable(),
  ownerEmail: z.string().email().max(254).optional().nullable(),
  ownerPassword: z.string().min(12).max(128).optional().nullable(),

  // Estate / Farm Cadastral & Geo Details
  farmName: z.string().min(2).max(120),
  surveyNumber: z.string().max(100).optional().nullable(),
  village: z.string().max(100).optional().nullable(),
  taluk: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  terrainType: z.string().max(100).optional().nullable(),
  location: z.string().min(2).max(150),
  address: z.string().max(250).optional().nullable(),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  totalArea: z.coerce.number().positive(),
  cultivableArea: z.coerce.number().positive(),
  boundaryGeoJson: z.any().optional().nullable(),
  geofenceRadiusMeters: z.coerce.number().int().min(100).max(5000).default(500),

  // Soil Baseline & Water / Power Infrastructure
  soilType: z.string().max(100).optional().nullable(),
  soilPh: z.coerce.number().min(0).max(14).optional().nullable(),
  soilEc: z.coerce.number().min(0).max(50).optional().nullable(),
  soilOrganicCarbon: z.coerce.number().min(0).max(20).optional().nullable(),
  waterSource: z.string().max(300).optional().nullable(),
  borewellCount: z.coerce.number().int().min(0).max(50).optional().nullable(),
  borewellDepthFeet: z.coerce.number().int().min(0).max(3000).optional().nullable(),
  waterYieldGph: z.coerce.number().int().min(0).max(50000).optional().nullable(),
  electricitySupply: z.string().max(100).optional().nullable(),
  fencingType: z.string().max(100).optional().nullable(),

  // Commercials & Cropping Plan
  proposedCrops: z.string().max(250).optional().nullable(),
  contractValue: z.coerce.number().positive().optional().nullable(),
  targetHandoverDate: z.string().optional().nullable(),

  // Assigned Central Agronomist
  agronomistId: z.string().optional().nullable(),

  // Optional Initial Plot
  initialPlotName: z.string().max(100).optional().nullable(),
  initialPlotArea: z.coerce.number().positive().optional().nullable(),
  initialIrrigationType: z.enum(["Drip", "Sprinkler", "Rain Pipe", "Flood", "Other"]).default("Drip"),
}).superRefine((data, ctx) => {
  if (!data.ownerEmail && !data.ownerPhone) {
    ctx.addIssue({
      code: "custom",
      path: ["ownerPhone"],
      message: "Either mobile number or email address is required for client login.",
    });
  }
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
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const body = await request.json();
    const input = onboardSchema.parse(body);

    const email = (input.ownerEmail && input.ownerEmail.trim())
      ? input.ownerEmail.trim().toLowerCase()
      : `${(input.ownerPhone || "client").replace(/[^\d]/g, "")}@client.agaate.ag`;
    const rawPhone = input.ownerPhone ? input.ownerPhone.replace(/[^\d+]/g, "") : null;
    const digits = rawPhone?.replace(/[^\d]/g, "") ?? "";
    const phone = rawPhone && digits.length >= 10 && digits.length <= 15 ? rawPhone : null;
    if (!input.ownerEmail && !phone) {
      return NextResponse.json({ error: "Either mobile number or email address is required for client login." }, { status: 422 });
    }
    let ownerDob: Date | null = null;
    let clientDob: Date | null = null;
    if (input.ownerDob) {
      const parsed = new Date(`${input.ownerDob}T00:00:00Z`);
      if (isNaN(parsed.getTime()) || parsed > new Date()) {
        return NextResponse.json({ error: "Date of birth must be a valid past date (YYYY-MM-DD)." }, { status: 422 });
      }
      ownerDob = parsed;
      clientDob = parsed;
    }
    const passwordHash = input.ownerPassword ? await bcrypt.hash(input.ownerPassword, 12) : "";

    // Normalize-on-write: validate polygon server-side, never trust client math.
    // Accepts canonical GeoJSON Polygon string OR legacy [{lat,lng}] (stringified or raw).
    let normalizedBoundary: string | null = null;
    let measuredAcres: number | null = null;
    const rawBoundary = (input as { boundaryGeoJson?: unknown }).boundaryGeoJson;
    const hasBoundary =
      rawBoundary !== undefined &&
      rawBoundary !== null &&
      !(typeof rawBoundary === "string" && rawBoundary.trim() === "") &&
      !(Array.isArray(rawBoundary) && rawBoundary.length === 0);
    if (hasBoundary) {
      try {
        const parsed = parseBoundary(rawBoundary);
        if (parsed) {
          normalizedBoundary = parsed.geoJson;
          measuredAcres = roundAcresForDb(parsed.acres);
        }
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Invalid farm boundary." },
          { status: 422 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or retrieve Client Organization & Owner User
      let client: any = null;
      let owner: any = null;

      if (input.clientId) {
        client = await tx.client.findUnique({
          where: { id: input.clientId },
          include: { users: { where: { role: "FARM_ADMIN" } } },
        });
        if (!client) throw new Error("The specified client account does not exist.");
        owner = client.users[0] || null;
      }

      if (!client) {
        owner = await tx.user.findFirst({
          where: {
            OR: [
              { email },
              ...(phone ? [{ phone }] : []),
            ],
          },
          include: { client: true },
        });

        if (owner) {
          client =
            owner.client ||
            (await tx.client.findFirst({ where: { name: owner.name } }));
          if (!client) {
            client = await tx.client.create({
              data: {
                name: owner.name,
                code: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
                email: owner.email,
                phone: owner.phone,
                status: "ACTIVE",
              },
            });
            await tx.user.update({
              where: { id: owner.id },
              data: { clientId: client.id },
            });
          }
        }
      }

      if (!owner) {
        if (!input.ownerPassword) {
          throw new Error("Password is required for a new client account.");
        }
        const passwordHash = await bcrypt.hash(input.ownerPassword, 12);

        client = await tx.client.create({
          data: {
            name: input.ownerName,
            code: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
            email,
            phone,
            entityType: input.entityType || null,
            panNumber: input.panNumber || null,
            gstin: input.gstin || null,
            billingAddress: input.billingAddress || null,
            secondaryContact: input.secondaryContact || null,
            state: input.state || null,
            district: input.district || null,
            status: "ACTIVE",
          },
        });

        owner = await tx.user.create({
          data: {
            name: input.ownerName,
            email,
            phone,
            dateOfBirth: ownerDob,
            passwordHash,
            role: "FARM_ADMIN",
            clientId: client.id,
            active: true,
          },
        });
      }

      // 2. Create the Farm with 5-stage setup initialized and comprehensive parameters.
      // Geometry (when drawn) is versioned as v1 MANUAL_DRAW in the same tx.
      const farmData: Prisma.FarmUncheckedCreateInput = {
          clientId: client.id,
          name: input.farmName,
          surveyNumber: input.surveyNumber || null,
          village: input.village || null,
          taluk: input.taluk || null,
          district: input.district || null,
          state: input.state || null,
          pincode: input.pincode || null,
          terrainType: input.terrainType || null,
          ownerName: input.ownerName,
          location: input.location,
          address: input.address || null,
          latitude: input.latitude,
          longitude: input.longitude,
          totalArea: input.totalArea,
          cultivableArea: input.cultivableArea,
          waterSource: input.waterSource || "Borewell / General",
          borewellCount: input.borewellCount || null,
          borewellDepthFeet: input.borewellDepthFeet || null,
          waterYieldGph: input.waterYieldGph || null,
          electricitySupply: input.electricitySupply || null,
          soilType: input.soilType || "Red Sandy Loam",
          soilPh: input.soilPh !== undefined && input.soilPh !== null ? new Prisma.Decimal(input.soilPh) : null,
          soilEc: input.soilEc !== undefined && input.soilEc !== null ? new Prisma.Decimal(input.soilEc) : null,
          soilOrganicCarbon: input.soilOrganicCarbon !== undefined && input.soilOrganicCarbon !== null ? new Prisma.Decimal(input.soilOrganicCarbon) : null,
          fencingType: input.fencingType || null,
          proposedCrops: input.proposedCrops || null,
          contractValue: input.contractValue ? new Prisma.Decimal(input.contractValue) : null,
          targetHandoverDate: input.targetHandoverDate ? new Date(input.targetHandoverDate) : null,
          boundaryGeoJson: normalizedBoundary,
          measuredAcres,
          clientPhone: phone,
          clientDob,
          geofenceRadiusMeters: input.geofenceRadiusMeters,
          setupStage: "SURVEY_SOIL_TEST",
          setupProgress: 15,
          status: "SETUP",
      };
      const farm = normalizedBoundary
        ? (
            await commitBoundary(
              tx,
              { type: "FARM" },
              { geoJson: normalizedBoundary, acres: measuredAcres ?? 0 },
              { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
              async (t) => t.farm.create({ data: farmData })
            )
          ).result
        : await tx.farm.create({ data: farmData });

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
          select: { id: true, name: true, email: true, role: true, active: true },
        });
        if (input.agronomistId && !assignedAgronomist) {
          throw new Error("The selected agronomist no longer exists.");
        }
        if (assignedAgronomist && (assignedAgronomist.role !== "AGRONOMIST" || !assignedAgronomist.active)) {
          throw new Error("The selected agronomist is not available.");
        }

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
      secondaryContact: input.secondaryContact || undefined,
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
        farmId: result.farm.id,
        clientName: result.owner.name,
        clientEmail: result.owner.email,
        clientPhone: phone,
        loginIdentifier: phone || result.owner.email,
        loginUrl: "/login",
      },
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
