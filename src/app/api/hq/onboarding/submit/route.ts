import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { normalizeEmail, normalizePhone, submitSchema } from "@/components/hq/onboarding-schema";

// Single transactional activation for the HQ onboarding wizard.
// Idempotent on idempotencyKey: a retried double-click returns the stored
// result instead of creating a second client. Any farm/plot failure rolls
// back the whole batch and reports the failing row number.
type ActivationSummary = {
  client: { id: string; code: string; name: string };
  farms: { id: string; name: string }[];
  plots: { id: string; name: string; farmId: string }[];
  credential: { status: "ACTIVE" | "PENDING_INVITE"; loginEmail: string | null; loginUrl: string };
};

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const body = await request.json();
    const input = submitSchema.parse(body);

    const phone = normalizePhone(input.client.phone ?? null);
    const email = normalizeEmail(input.client.email ?? null);
    if (!phone && !email) {
      return NextResponse.json({ error: "Either mobile number or email address is required for client login." }, { status: 422 });
    }
    const teamEmail = input.team.mode === "create" ? normalizeEmail(input.team.email ?? null) : null;
    const teamPhone = input.team.mode === "create" ? normalizePhone(input.team.phone ?? null) : null;

    const result = await prisma.$transaction(async (tx) => {
      // Claim the idempotency key: exactly one submitter wins.
      const claimed = await tx.onboardingDraft.updateMany({
        where: { idempotencyKey: input.idempotencyKey, status: "DRAFT" },
        data: { status: "SUBMITTING" },
      });
      if (claimed.count === 0) {
        const existing = await tx.onboardingDraft.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing?.status === "SUBMITTED" && existing.resultJson) {
          return { ...(existing.resultJson as ActivationSummary), deduped: true };
        }
        if (existing) {
          throw new Error("Validation failed: this onboarding is already being submitted. Wait a moment, then check the resume list.");
        }
        await tx.onboardingDraft.create({
          data: {
            idempotencyKey: input.idempotencyKey,
            createdById: actor.id,
            payload: body,
            status: "SUBMITTING",
            clientName: input.client.name,
            farmCount: input.farms.length,
          },
        });
      }

      // Uniqueness pre-checks inside the tx so failures name the field.
      if (phone) {
        const holder = (await tx.client.findUnique({ where: { phone }, select: { name: true } })) ?? (await tx.user.findUnique({ where: { phone }, select: { name: true } }));
        if (holder) throw new Error(`Validation failed: phone number already belongs to ${holder.name}.`);
      }
      if (email) {
        const holder = (await tx.client.findUnique({ where: { email }, select: { name: true } })) ?? (await tx.user.findUnique({ where: { email }, select: { name: true } }));
        if (holder) throw new Error(`Validation failed: email address already belongs to ${holder.name}.`);
      }
      if (teamEmail && teamEmail !== email) {
        const holder = await tx.user.findUnique({ where: { email: teamEmail }, select: { name: true } });
        if (holder) throw new Error(`Validation failed: admin email already belongs to ${holder.name}.`);
      }
      if (teamPhone && teamPhone !== phone) {
        const holder = await tx.user.findUnique({ where: { phone: teamPhone }, select: { name: true } });
        if (holder) throw new Error(`Validation failed: admin phone already belongs to ${holder.name}.`);
      }

      // Client code: unique backstop with bounded retries.
      let clientCode = "";
      let client: { id: string; code: string | null; name: string } | null = null;
      for (let attempt = 0; attempt < 3 && !client; attempt += 1) {
        clientCode = `CLI-${randomBytes(3).toString("hex").toUpperCase().slice(0, 6)}`;
        try {
          client = await tx.client.create({
            data: {
              name: input.client.name.trim(),
              code: clientCode,
              companyName: input.client.companyName || null,
              email,
              phone,
              panNumber: input.client.panNumber ? input.client.panNumber.toUpperCase() : null,
              gstin: input.client.gstin ? input.client.gstin.toUpperCase() : null,
              billingAddress: input.client.billingAddress || null,
              state: input.client.state || null,
              district: input.client.district || null,
              status: "ACTIVE",
            },
            select: { id: true, code: true, name: true },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 2) continue;
          throw e;
        }
      }
      if (!client) throw new Error("Validation failed: could not assign a client ID. Please retry.");

      // Optional FARM_ADMIN login.
      let owner: { id: string; email: string; name: string } | null = null;
      if (input.team.mode === "create") {
        if (!input.team.password || !teamEmail) throw new Error("Validation failed: admin email and password are required.");
        owner = await tx.user.create({
          data: {
            name: (input.team.name ?? input.client.name).trim(),
            email: teamEmail,
            phone: teamPhone,
            passwordHash: await bcrypt.hash(input.team.password, 12),
            role: "FARM_ADMIN",
            clientId: client.id,
            active: true,
          },
          select: { id: true, email: true, name: true },
        });
      }

      // Farms: sequential so any failure names its row (single tx = all-or-nothing).
      const farms: { id: string; name: string }[] = [];
      for (let i = 0; i < input.farms.length; i += 1) {
        const f = input.farms[i];
        try {
          const created = await tx.farm.create({
            data: {
              clientId: client.id,
              name: f.name.trim(),
              ownerName: input.client.name.trim(),
              location: f.location.trim(),
              latitude: Number(f.latitude),
              longitude: Number(f.longitude),
              totalArea: Number(f.totalArea),
              cultivableArea: Number(f.cultivableArea),
              waterSource: f.waterSource.trim(),
              surveyNumber: f.surveyNumber || null,
              village: f.village || null,
              taluk: f.taluk || null,
              district: f.district || null,
              state: f.state || null,
              soilType: f.soilType || null,
              clientPhone: phone,
              status: "SETUP",
              setupStage: "SURVEY_SOIL_TEST",
              setupProgress: 0,
            },
            select: { id: true, name: true },
          });
          farms.push(created);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Validation failed")) throw e;
          throw new Error(`Validation failed: farm row ${i + 1} ("${f.name.trim() || "unnamed"}") could not be saved. Fix it and retry.`);
        }
      }

      if (owner) {
        await tx.farmAccess.createMany({
          data: farms.map((f) => ({ userId: owner!.id, farmId: f.id, canManage: true })),
        });
      }

      // Plots: map wizard rowIds to real farm ids.
      const farmIdByRow = new Map<string, string>();
      input.farms.forEach((f, i) => farmIdByRow.set(f.rowId ?? `index:${i}`, farms[i].id));
      const plots: { id: string; name: string; farmId: string }[] = [];
      for (let i = 0; i < input.plots.length; i += 1) {
        const p = input.plots[i];
        const farmIndex = input.farms.findIndex((f, fi) => (f.rowId ?? `index:${fi}`) === p.farmRowId);
        const farmId = farmIdByRow.get(p.farmRowId);
        if (!farmId || farmIndex === -1) throw new Error(`Validation failed: plot row ${i + 1} refers to a missing farm.`);
        const farm = input.farms[farmIndex];
        try {
          const created = await tx.plot.create({
            data: {
              farmId,
              name: p.name.trim(),
              area: Number(p.area),
              latitude: Number(farm.latitude),
              longitude: Number(farm.longitude),
              soilType: p.soilType || farm.soilType || null,
              status: "SETUP",
            },
            select: { id: true, name: true, farmId: true },
          });
          plots.push(created);
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            throw new Error(`Validation failed: plot row ${i + 1} duplicates a plot name on farm "${farm.name}".`);
          }
          throw new Error(`Validation failed: plot row ${i + 1} ("${p.name.trim() || "unnamed"}") could not be saved.`);
        }
      }

      const summary: ActivationSummary = {
        client: { id: client.id, code: client.code ?? clientCode, name: client.name },
        farms,
        plots,
        credential: owner
          ? { status: "ACTIVE", loginEmail: owner.email, loginUrl: "/login" }
          : { status: "PENDING_INVITE", loginEmail: null, loginUrl: "/login" },
      };
      await tx.onboardingDraft.update({
        where: { idempotencyKey: input.idempotencyKey },
        data: { status: "SUBMITTED", resultJson: summary },
      });
      return { ...summary, deduped: false };
    });

    if (!result.deduped) {
      await audit(actor.id, "HQ_ONBOARD_CLIENT", "Client", result.client.id, { farms: result.farms.length, plots: result.plots.length });
    }
    return NextResponse.json({ success: true, ...result }, { status: result.deduped ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
