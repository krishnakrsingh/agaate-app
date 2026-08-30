import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getRpConfig, consumeChallenge } from "@/lib/webauthn";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const schema = z.object({
  credential: z.any(),
  deviceName: z.string().max(80).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    const body = schema.parse(await request.json());
    const { credential, deviceName } = body;

    const { rpId, origin } = getRpConfig(request);

    const expectedChallenge = credential?.response?.clientDataJSON
      ? undefined // will be extracted via consumeChallenge; we need to get challenge from DB before verify
      : undefined;

    // The challenge is inside clientDataJSON but we verify against stored challenge
    // Retrieve stored challenge by decoding clientDataJSON challenge or by querying latest for user
    // SimpleWebAuthn verifyRegistrationResponse expects expectedChallenge to compare
    // So we fetch the single pending registration challenge for this user (storeChallenge enforces one active)
    const pending = await prisma.webAuthnChallenge.findFirst({
      where: { userId: actor.id, type: "registration" },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) throw new Error("No pending registration challenge. Please restart enrollment.");
    if (pending.expiresAt < new Date()) {
      await prisma.webAuthnChallenge.delete({ where: { id: pending.id } });
      throw new Error("Registration challenge has expired. Please retry.");
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed. Authenticator response invalid.");
    }

    // Consume challenge after successful verification
    await consumeChallenge({ userId: actor.id, challenge: pending.challenge, type: "registration" });

    const regInfo = verification.registrationInfo;
    const regCred = regInfo.credential;

    // Normalize credentialID to base64url
    const credentialId = regCred.id;

    // Prevent duplicate credential ID
    const existing = await prisma.passkeyCredential.findUnique({ where: { credentialId } });
    if (existing) throw new Error("This authenticator is already registered.");

    const created = await prisma.passkeyCredential.create({
      data: {
        userId: actor.id,
        credentialId: regCred.id,
        publicKey: Buffer.from(regCred.publicKey).toString("base64url"),
        counter: BigInt(regCred.counter),
        transports: credential.response?.transports ? JSON.stringify(credential.response.transports) : null,
        deviceType: regInfo.credentialDeviceType,
        backedUp: regInfo.credentialBackedUp,
        name: deviceName ?? null,
      },
    });

    await audit(actor.id, "WEBAUTHN_REGISTER_VERIFY", "PasskeyCredential", created.id, {
      credentialId,
      deviceType: regInfo.credentialDeviceType,
      backedUp: regInfo.credentialBackedUp,
    });

    return NextResponse.json({ verified: true, credentialId, credential: created }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
