import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { normalizeEmail, normalizePhone } from "@/components/hq/onboarding-schema";

// Live uniqueness probe for Step 1 (debounced client-side). Never leaks
// hashes; returns only taken flags plus the holding display name.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const sp = request.nextUrl.searchParams;
    const phone = normalizePhone(sp.get("phone"));
    const email = normalizeEmail(sp.get("email"));

    const [clientByPhone, clientByEmail, userByPhone, userByEmail] = await Promise.all([
      phone ? prisma.client.findUnique({ where: { phone }, select: { name: true } }) : null,
      email ? prisma.client.findUnique({ where: { email }, select: { name: true } }) : null,
      phone ? prisma.user.findUnique({ where: { phone }, select: { name: true } }) : null,
      email ? prisma.user.findUnique({ where: { email }, select: { name: true } }) : null,
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
