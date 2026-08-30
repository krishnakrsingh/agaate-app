import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getRpConfig, consumeChallenge } from "@/lib/webauthn";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const schema = z.object({
  credential: z.any(),
  userId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const { credential } = body;

    // Determine user from credential or provided userId
    // Passkey credentialId is unique, so we can look up owner
    const rawId: string | undefined = credential?.id ?? credential?.rawId;
    if (!rawId) throw new Error("Invalid authentication response: missing credential ID.");

    let credentialId = rawId;
    // Some clients send base64url id directly; normalize lookup
    let stored = await prisma.passkeyCredential.findUnique({ where: { credentialId } });
    if (!stored && body.userId) {
      // Fallback: lookup by userId + challenge
      stored = await prisma.passkeyCredential.findFirst({
        where: { userId: body.userId, revokedAt: null },
      });
      if (stored) credentialId = stored.credentialId;
    }
    if (!stored) throw new Error("Unknown passkey. Please register this device first.");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    if (!user.active) throw new Error("Account is unavailable");

    // Retrieve pending authentication challenge for this user
    const pending = await prisma.webAuthnChallenge.findFirst({
      where: { userId: stored.userId, type: "authentication" },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) throw new Error("No pending authentication challenge. Please restart verification.");
    if (pending.expiresAt < new Date()) {
      await prisma.webAuthnChallenge.delete({ where: { id: pending.id } });
      throw new Error("Authentication challenge has expired. Please retry.");
    }

    const { rpId, origin } = getRpConfig(request);

    // Decode publicKey from base64url stored
    const publicKey = Buffer.from(stored.publicKey, "base64url");

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: stored.credentialId,
        publicKey,
        counter: Number(stored.counter),
        transports: stored.transports ? (JSON.parse(stored.transports) as AuthenticatorTransport[]) : undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) throw new Error("Authentication verification failed.");

    // Consume challenge to prevent replay
    await consumeChallenge({ userId: stored.userId, challenge: pending.challenge, type: "authentication" });

    const newCounter = verification.authenticationInfo.newCounter;

    // Counter check: if newCounter <= stored counter, possible cloned authenticator
    if (newCounter <= Number(stored.counter) && newCounter !== 0) {
      // Log but still allow? For security, flag and require re-registration
      await audit(stored.userId, "WEBAUTHN_AUTH_COUNTER_ANOMALY", "PasskeyCredential", stored.id, {
        oldCounter: Number(stored.counter),
        newCounter,
      });
    }

    const updated = await prisma.passkeyCredential.update({
      where: { id: stored.id },
      data: { counter: BigInt(newCounter), lastUsedAt: new Date() },
    });

    await audit(stored.userId, "WEBAUTHN_AUTH_VERIFY", "PasskeyCredential", stored.id, {
      credentialId: stored.credentialId,
      newCounter,
    });

    // For attendance integration (Stage 4), the caller will also need to know webauthnVerified
    // For Stage 1, we simply return verified + set short-lived verification marker in DB via AuditLog
    // Attendance will check that a recent WEBAUTHN_AUTH_VERIFY exists within 5 minutes

    return NextResponse.json({
      verified: true,
      credentialId: stored.credentialId,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      authenticationInfo: verification.authenticationInfo,
    });
  } catch (error) {
    return apiError(error);
  }
}
