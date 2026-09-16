import { NextRequest, NextResponse } from "next/server";
import { currentActor, requirePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { normalizeEmail, normalizePhone } from "@modules/onboarding/ui/onboarding-schema";

// Live uniqueness probe for Step 1 (debounced client-side). Never leaks
// hashes; returns only taken flags plus the holding display name.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requirePermission(actor, "onboarding:manage");
    const sp = request.nextUrl.searchParams;
    const phone = normalizePhone(sp.get("phone"));
    const email = normalizeEmail(sp.get("email"));
    const clientId = sp.get("clientId")?.trim();

    const clientFilter = clientId ? { NOT: { OR: [{ id: clientId }, { code: clientId }] } } : {};
    const userFilter = clientId ? { NOT: { OR: [{ clientId }, { client: { code: clientId } }] } } : {};

    const [clientByPhone, clientByEmail, userByPhone, userByEmail] = await Promise.all([
      phone ? prisma.client.findFirst({ where: { phone, ...clientFilter }, select: { name: true } }) : null,
      email ? prisma.client.findFirst({ where: { email, ...clientFilter }, select: { name: true } }) : null,
      phone ? prisma.user.findFirst({ where: { phone, ...userFilter }, select: { name: true } }) : null,
      email ? prisma.user.findFirst({ where: { email, ...userFilter }, select: { name: true } }) : null,
    ]);

    const phoneHolder = clientByPhone?.name ?? userByPhone?.name ?? null;
    const emailHolder = clientByEmail?.name ?? userByEmail?.name ?? null;
    return NextResponse.json(
      {
        phoneTaken: phoneHolder !== null,
        phoneHolder,
        emailTaken: emailHolder !== null,
        emailHolder,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
