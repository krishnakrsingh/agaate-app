import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getRpConfig, storeChallenge } from "@/lib/webauthn";
import { apiError } from "@/lib/api";

const schema = z.object({
  userId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Allow both authenticated user re-verification and unauthenticated login via passkey
    // If userId provided in body, use that; otherwise use currentActor if logged in
    let targetUserId: string | null = null;
    try {
      const actor = await currentActor();
      if (actor.active) targetUserId = actor.id;
    } catch {
      // not authenticated — ok, will try body userId
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (parsed.success && parsed.data.userId) {
      targetUserId = parsed.data.userId;
    }

    if (!targetUserId) throw new Error("Authentication requires a user context. Please log in first.");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
    if (!user.active) throw new Error("Account is unavailable");

    const passkeys = await prisma.passkeyCredential.findMany({
      where: { userId: targetUserId, revokedAt: null },
    });

    if (!passkeys.length) throw new Error("No passkeys registered for this account. Please register a device first.");

    const { rpId } = getRpConfig(request);

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: passkeys.map((pk) => ({
        id: pk.credentialId,
        transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransport[]) : undefined,
      })),
      userVerification: "preferred",
    });

    await storeChallenge({ userId: targetUserId, challenge: options.challenge, type: "authentication" });

    return NextResponse.json(options);
  } catch (error) {
    return apiError(error);
  }
}
