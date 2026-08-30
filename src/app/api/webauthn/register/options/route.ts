import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getRpConfig, storeChallenge } from "@/lib/webauthn";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      include: { passkeys: { where: { revokedAt: null } } },
    });

    const { rpId, rpName } = getRpConfig(request);

    // Exclude already-registered credentials to prevent duplicate registration
    const excludeCredentials = user.passkeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransport[]) : undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName: user.email,
      userID: isoUint8Array.fromUTF8String(user.id),
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    await storeChallenge({ userId: actor.id, challenge: options.challenge, type: "registration" });

    await audit(actor.id, "WEBAUTHN_REGISTER_OPTIONS", "User", actor.id, {
      rpId,
      credentialCount: user.passkeys.length,
    });

    return NextResponse.json(options);
  } catch (error) {
    return apiError(error);
  }
}
