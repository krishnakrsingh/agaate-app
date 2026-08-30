import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getRpConfig(request: Request) {
  const url = new URL(request.url);
  const envRpId = process.env.WEBAUTHN_RP_ID;
  const envRpName = process.env.WEBAUTHN_RP_NAME || "Agaate";
  const envOrigin = process.env.WEBAUTHN_ORIGIN;

  // Derive RP ID from host if not configured
  let rpId = envRpId;
  if (!rpId) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
    rpId = host.split(":")[0];
    // For localhost subdomains, SimpleWebAuthn requires effective domain
    // localhost is valid RP ID per spec for local dev
  }

  let origin = envOrigin;
  if (!origin) {
    const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
    origin = `${proto}://${host}`;
  }

  const rpName = envRpName;

  return { rpId, rpName, origin };
}

export async function storeChallenge(params: { userId: string; challenge: string; type: "registration" | "authentication" }) {
  const expiresAt = new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS);
  // Clean expired challenges for this user/type lazily
  await prisma.webAuthnChallenge.deleteMany({
    where: { userId: params.userId, type: params.type, expiresAt: { lt: new Date() } },
  });
  // Also enforce single active challenge per user+type: delete previous pending
  await prisma.webAuthnChallenge.deleteMany({
    where: { userId: params.userId, type: params.type },
  });
  await prisma.webAuthnChallenge.create({
    data: {
      userId: params.userId,
      challenge: params.challenge,
      type: params.type,
      expiresAt,
    },
  });
  return { challenge: params.challenge, expiresAt };
}

export async function consumeChallenge(params: { userId: string; challenge: string; type: "registration" | "authentication" }) {
  const record = await prisma.webAuthnChallenge.findUnique({
    where: { challenge: params.challenge },
  });
  if (!record) throw new Error("Challenge not found or already used.");
  if (record.userId !== params.userId) throw new Error("Challenge does not belong to this user.");
  if (record.type !== params.type) throw new Error("Challenge type mismatch.");
  if (record.expiresAt < new Date()) {
    await prisma.webAuthnChallenge.delete({ where: { id: record.id } });
    throw new Error("Challenge has expired. Please retry.");
  }
  // Single-use: delete after successful consumption
  await prisma.webAuthnChallenge.delete({ where: { id: record.id } });
  return record;
}

export async function cleanupExpiredChallenges() {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
