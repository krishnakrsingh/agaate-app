import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { currentActor, requirePermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Prisma } from "@prisma/client";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";
import { normalizeEmail, normalizePhone, submitSchema } from "@modules/onboarding/ui/onboarding-schema";
import { parseBoundary, validatePlotGeometry, roundAcresForDb } from "@modules/spatial";
import { representativePoint } from "@modules/spatial";
import { commitBoundary } from "@modules/spatial";

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
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requirePermission(actor, "onboarding:manage");

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
        try {
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
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            const raced = await tx.onboardingDraft.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
            if (raced?.status === "SUBMITTED" && raced.resultJson) {
              return { ...(raced.resultJson as ActivationSummary), deduped: true };
            }
            throw new Error("Validation failed: duplicate submit detected. Wait a moment, then check the resume list.");
          }
          throw e;
        }
      }

      // Check if this onboarding belongs to an existing client (by phone or email)
      let client: { id: string; code: string | null; name: string } | null = null;

      if (phone) {
        client = await tx.client.findUnique({ where: { phone }, select: { id: true, code: true, name: true } });
      }
      if (!client && email) {
        client = await tx.client.findUnique({ where: { email }, select: { id: true, code: true, name: true } });
      }

      if (client) {
        // Update existing client record
        await tx.client.update({
          where: { id: client.id },
          data: {
            name: input.client.name.trim(),
            companyName: input.client.companyName || undefined,
            whatsappNo: input.client.whatsappNo || undefined,
            panNumber: input.client.panNumber ? input.client.panNumber.toUpperCase() : undefined,
            gstin: input.client.gstin ? input.client.gstin.toUpperCase() : undefined,
            billingAddress: input.client.billingAddress || undefined,
            village: input.client.village || undefined,
            city: input.client.city || undefined,
            state: input.client.state || undefined,
            district: input.client.district || undefined,
            pincode: input.client.pincode || undefined,
            financeConnect: input.contacts?.financeContact?.name
              ? `${input.contacts.financeContact.name} (${input.contacts.financeContact.phone})`
              : input.client.financeConnect || undefined,
            purchaserConnect: input.contacts?.purchaserContact?.name
              ? `${input.contacts.purchaserContact.name} (${input.contacts.purchaserContact.phone})`
              : input.client.purchaserConnect || undefined,
          },
        });
      } else {
        // Brand new client: run uniqueness pre-checks against existing clients and users
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
                whatsappNo: input.client.whatsappNo || null,
                panNumber: input.client.panNumber ? input.client.panNumber.toUpperCase() : null,
                gstin: input.client.gstin ? input.client.gstin.toUpperCase() : null,
                billingAddress: input.client.billingAddress || null,
                village: input.client.village || null,
                city: input.client.city || null,
                state: input.client.state || null,
                district: input.client.district || null,
                pincode: input.client.pincode || null,
                financeConnect: input.contacts?.financeContact?.name
                  ? `${input.contacts.financeContact.name} (${input.contacts.financeContact.phone})`
                  : input.client.financeConnect || null,
                purchaserConnect: input.contacts?.purchaserContact?.name
                  ? `${input.contacts.purchaserContact.name} (${input.contacts.purchaserContact.phone})`
                  : input.client.purchaserConnect || null,
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
      }

      // First-class ClientContact records
      if (input.contacts?.financeContact?.name) {
        await tx.clientContact.create({
          data: {
            clientId: client.id,
            name: input.contacts.financeContact.name.trim(),
            phone: input.contacts.financeContact.phone.trim(),
            email: input.contacts.financeContact.email?.trim() || null,
            role: "FINANCE",
            isPrimary: true,
          },
        });
      }
      if (input.contacts?.purchaserContact?.name) {
        await tx.clientContact.create({
          data: {
            clientId: client.id,
            name: input.contacts.purchaserContact.name.trim(),
            phone: input.contacts.purchaserContact.phone.trim(),
            email: input.contacts.purchaserContact.email?.trim() || null,
            role: "PURCHASER",
            isPrimary: false,
          },
        });
      }
      if (input.contacts?.additionalContacts?.length) {
        await tx.clientContact.createMany({
          data: input.contacts.additionalContacts.map((c) => ({
            clientId: client.id,
            name: c.name.trim(),
            phone: c.phone.trim(),
            email: c.email?.trim() || null,
            role: c.role || "OTHER",
            isPrimary: false,
          })),
        });
      }

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
      const farmGeoJsonByRow = new Map<string, string | null>();
      for (let i = 0; i < input.farms.length; i += 1) {
        const f = input.farms[i];
        const rowLabel = `farm row ${i + 1} ("${f.name.trim() || "unnamed"}")`;
        let geo: { geoJson: string; acres: number } | null = null;
        try {
          const parsed = parseBoundary((f as { boundaryRing?: unknown }).boundaryRing ?? null);
          if (parsed) geo = { geoJson: parsed.geoJson, acres: roundAcresForDb(parsed.acres) };
        } catch (e) {
          throw new Error(`Validation failed: ${rowLabel} fence is invalid — ${e instanceof Error ? e.message : "redraw the boundary."}`);
        }

        const localConnectVal = f.localConnectSameAsClient
          ? `${input.client.name} (${input.client.phone})`
          : f.localContactName
          ? `${f.localContactName}${f.localContactPhone ? ` (${f.localContactPhone})` : ""}`
          : f.localConnect || null;

        const effectiveTotalArea = Number(f.area) || Number(f.totalArea);
        const effectiveCultivableArea = Number(f.cultivableArea) || effectiveTotalArea;

        try {
          const created = await tx.farm.create({
            data: {
              clientId: client.id,
              name: f.name.trim(),
              ownerName: input.client.name.trim(),
              localConnect: localConnectVal,
              location: f.location.trim(),
              latitude: Number(f.latitude),
              longitude: Number(f.longitude),
              totalArea: effectiveTotalArea,
              cultivableArea: effectiveCultivableArea,
              waterSource: f.waterSource?.trim() || "Borewell",
              surveyNumber: f.surveyNumber || null,
              village: f.village || null,
              city: f.city || null,
              taluk: f.taluk || null,
              district: f.district || null,
              state: f.state || null,
              pincode: f.pincode || null,
              soilType: f.soilType || null,
              clientPhone: phone,
              status: "SETUP",
              setupStage: "SURVEY_SOIL_TEST",
              setupProgress: 0,
            },
            select: { id: true, name: true },
          });
          if (geo) {
            await commitBoundary(
              tx,
              { type: "FARM", id: created.id },
              { geoJson: geo.geoJson, acres: geo.acres },
              { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
              async (t) =>
                t.farm.update({
                  where: { id: created.id },
                  data: { boundaryGeoJson: geo.geoJson, measuredAcres: geo.acres },
                  select: { id: true },
                })
            );
          }
          farms.push(created);
          farmGeoJsonByRow.set(f.rowId ?? `index:${i}`, geo?.geoJson ?? null);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Validation failed")) throw e;
          throw new Error(`Validation failed: ${rowLabel} could not be saved. Fix it and retry.`);
        }
      }

      // Team Access assignments (Owner, Agronomist, Field Officer)
      const accessRecords: { userId: string; farmId: string; canManage: boolean }[] = [];
      if (owner) {
        farms.forEach((f) => accessRecords.push({ userId: owner.id, farmId: f.id, canManage: true }));
      }
      if (input.team.agronomistId) {
        farms.forEach((f) => accessRecords.push({ userId: input.team.agronomistId!, farmId: f.id, canManage: true }));
      }
      if (input.team.fieldOfficerId && input.team.fieldOfficerId !== input.team.agronomistId) {
        farms.forEach((f) => accessRecords.push({ userId: input.team.fieldOfficerId!, farmId: f.id, canManage: false }));
      }
      if (accessRecords.length > 0) {
        await tx.farmAccess.createMany({
          data: accessRecords,
          skipDuplicates: true,
        });
      }

      // Plots: map wizard rowIds to real farm ids.
      const farmIdByRow = new Map<string, string>();
      input.farms.forEach((f, i) => farmIdByRow.set(f.rowId ?? `index:${i}`, farms[i].id));
      const plots: { id: string; name: string; farmId: string }[] = [];
      const plotIdByRow = new Map<string, string>();
      const allocatedByFarm = new Map<string, number>();

      for (let i = 0; i < input.plots.length; i += 1) {
        const p = input.plots[i];
        const rowLabel = `plot row ${i + 1} ("${p.name.trim() || "unnamed"}")`;
        const farmIndex = input.farms.findIndex((f, fi) => (f.rowId ?? `index:${fi}`) === p.farmRowId);
        const farmId = farmIdByRow.get(p.farmRowId);
        if (!farmId || farmIndex === -1) throw new Error(`Validation failed: ${rowLabel} refers to a missing farm.`);
        const farm = input.farms[farmIndex];
        let geo: { geoJson: string; acres: number; ring: [number, number][] } | null = null;
        try {
          const v = validatePlotGeometry((p as { boundaryRing?: unknown }).boundaryRing ?? null, farmGeoJsonByRow.get(p.farmRowId) ?? null);
          if (v) geo = { geoJson: v.geoJson, acres: roundAcresForDb(v.acres), ring: v.ring as [number, number][] };
        } catch (e) {
          throw new Error(`Validation failed: ${rowLabel} fence rejected — ${e instanceof Error ? e.message : "redraw inside the farm fence."}`);
        }
        const finalArea = geo ? geo.acres : Number(p.area);
        const cap = Number(farm.cultivableArea) || Number(farm.area) || Number(farm.totalArea);
        const running = Math.round(((allocatedByFarm.get(farmId) ?? 0) + finalArea) * 100) / 100;
        if (Number.isFinite(cap) && cap > 0 && running > Math.round(cap * 100) / 100) {
          throw new Error(`Validation failed: ${rowLabel} pushes farm "${farm.name}" past its cultivable area.`);
        }
        let pinLat = Number(farm.latitude);
        let pinLng = Number(farm.longitude);
        if (geo) {
          try {
            const c = representativePoint(geo.ring);
            if (c) { pinLng = c[0]; pinLat = c[1]; }
          } catch { /* keep farm centroid */ }
        }

        const parsedValves = p.valves ? parseInt(p.valves, 10) : null;

        try {
          const data = {
            farmId,
            name: p.name.trim(),
            area: finalArea,
            latitude: pinLat,
            longitude: pinLng,
            soilType: p.soilType || farm.soilType || null,
            irrigationSetup: p.irrigationSetup || null,
            valvesCount: Number.isFinite(parsedValves) ? parsedValves : null,
            bedDetails: p.bedDetails || null,
            landPrepStatus: p.landPrepStatus || null,
            boundaryGeoJson: geo?.geoJson ?? null,
            measuredAcres: geo ? geo.acres : null,
            status: "SETUP" as const,
          };
          const created = geo
            ? (
                await commitBoundary(
                  tx,
                  { type: "PLOT" },
                  { geoJson: geo.geoJson, acres: geo.acres },
                  { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
                  async (t) => t.plot.create({ data, select: { id: true, name: true, farmId: true } })
                )
              ).result
            : await tx.plot.create({ data, select: { id: true, name: true, farmId: true } });

          plots.push(created);
          plotIdByRow.set(p.rowId ?? `index:${i}`, created.id);
          allocatedByFarm.set(farmId, running);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Validation failed")) throw e;
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            throw new Error(`Validation failed: ${rowLabel} duplicates a plot name on farm "${farm.name}".`);
          }
          throw new Error(`Validation failed: ${rowLabel} could not be saved.`);
        }
      }

      // Crop Cycles: attach crops to plots
      if (input.crops && input.crops.length > 0) {
        for (let i = 0; i < input.crops.length; i += 1) {
          const c = input.crops[i];
          const targetPlotId = plotIdByRow.get(c.plotRowId) || (plots.length > 0 ? plots[0].id : null);
          if (targetPlotId) {
            const isTransplant = !c.plantingMethod || c.plantingMethod.toLowerCase().includes("transplant");
            const estType = isTransplant ? "NURSERY_TRANSPLANTATION" : "DIRECT_SOWING";
            const pDate = c.plantingDate ? new Date(c.plantingDate) : new Date();
            const hDate = c.expectedHarvestDate ? new Date(c.expectedHarvestDate) : null;
            await tx.cropCycle.create({
              data: {
                plotId: targetPlotId,
                cropName: c.cropName.trim(),
                startDate: pDate,
                expectedFirstHarvestDate: hDate,
                establishmentType: estType,
                status: "PLANNED",
                plantingMethod: c.plantingMethod || null,
                spacing: c.spacing || null,
                basalDose: c.basalDose || null,
                mulching: c.mulching || null,
                keyDates: c.keyDates || null,
              },
            });
          }
        }
      }

      // Automatic First Task for the assigned Field Team
      if (input.team.createFirstTask !== false && farms.length > 0) {
        const primaryFarm = farms[0];
        const primaryPlot = plots.length > 0 ? plots[0] : null;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);

        await tx.task.create({
          data: {
            farmId: primaryFarm.id,
            plotId: primaryPlot?.id || null,
            origin: "SYSTEM",
            category: "SETUP",
            title: input.team.firstTaskTitle?.trim() || "Initial Demarcation & Soil Testing",
            description: `Conduct initial field setup for ${client.name} (${primaryFarm.name}). Demarcate plot boundaries, inspect water source, and collect baseline soil test samples.`,
            priority: "HIGH",
            dueDate,
            status: input.team.fieldOfficerId ? "ASSIGNED" : "AVAILABLE",
            assignedOfficerId: input.team.fieldOfficerId || null,
            createdById: actor.id,
          },
        });
      }

      const summary: ActivationSummary = {
        client: { id: client.id, code: client.code ?? client.id, name: client.name },
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
      try {
        await audit(actor.id, "HQ_ONBOARD_CLIENT", "Client", result.client.id, { farms: result.farms.length, plots: result.plots.length });
      } catch (e) {
        console.error("audit(HQ_ONBOARD_CLIENT) failed", e);
      }
    }
    return NextResponse.json({ success: true, ...result }, { status: result.deduped ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
