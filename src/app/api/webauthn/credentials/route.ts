import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await currentActor();
    const passkeys = await prisma.passkeyCredential.findMany({
      where: { userId: actor.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        credentialId: true,
        name: true,
        transports: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
        counter: true,
      },
    });
    const serialized = passkeys.map((p) => ({ ...p, counter: p.counter.toString() }));
    return NextResponse.json(serialized);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { credentialId } = z.object({ credentialId: z.string() }).parse(await request.json());
    const cred = await prisma.passkeyCredential.findUniqueOrThrow({ where: { credentialId } });
    if (cred.userId !== actor.id) {
      // Only owner or SUPER_ADMIN can revoke
      const { role } = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { role: true } });
      if (role !== "SUPER_ADMIN") throw new Error("You cannot revoke another user's passkey.");
    }
    const updated = await prisma.passkeyCredential.update({
      where: { credentialId },
      data: { revokedAt: new Date() },
    });
    await audit(actor.id, "WEBAUTHN_REVOKE", "PasskeyCredential", updated.id, { credentialId });
    return NextResponse.json({ revoked: true, credentialId });
  } catch (error) {
    return apiError(error);
  }
}
