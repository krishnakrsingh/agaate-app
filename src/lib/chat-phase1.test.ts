import { describe, expect, it, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "@infrastructure/db";
import { clearRateLimitStore } from "@infrastructure/security";
import { testSessionContext } from "@modules/auth";

import { GET as listConversations, POST as createConversation } from "@/app/api/conversations/route";
import { GET as getConversation, PATCH as patchConversation } from "@/app/api/conversations/[conversationId]/route";
import {
  GET as listMessages,
  POST as sendMessage,
} from "@/app/api/conversations/[conversationId]/messages/route";
import { PATCH as markRead } from "@/app/api/conversations/[conversationId]/read/route";
import { GET as getContext } from "@/app/api/conversations/[conversationId]/context/route";
import { GET as getRoster } from "@/app/api/conversations/roster/route";
import { GET as listNotifications, PATCH as patchNotifications } from "@/app/api/notifications/route";
import { GET as unreadCount } from "@/app/api/notifications/unread-count/route";
import { POST as addParticipant } from "@/app/api/conversations/[conversationId]/participants/route";
import { GET as listAgronomists } from "@/app/api/agronomists/route";

const secret = new TextEncoder().encode(
  process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars"
);

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

async function withAuth<T>(cookie: string, fn: () => Promise<T>): Promise<T> {
  const token = cookie.replace("agaate_session=", "");
  return testSessionContext.run({ token }, fn);
}

function req(url: string, method: string, body?: any, cookie?: string) {
  return new NextRequest(url, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

const TAG = "@chat-test.agaate.local";

describe.sequential("Chat Phase 1: Agronomist ↔ Officer workflow", () => {
  let sa: any, agro: any, officerA: any, officerB: any, ops: any, owner: any;
  let saCookie = "", agroCookie = "", offACookie = "", offBCookie = "", opsCookie = "", ownerCookie = "";
  let farmA: any, farmB: any, plotA: any, cycleA: any, plotB: any;
  let convId = "";
  let firstMessageId = "";

  const cleanup = async () => {
    const users = await prisma.user.findMany({ where: { email: { contains: TAG } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    const convs = await prisma.conversation.findMany({ where: { farm: { name: { startsWith: "Chat Test Farm" } } }, select: { id: true } });
    const convIds = convs.map((c) => c.id);
    if (convIds.length) {
      const msgs = await prisma.chatMessage.findMany({ where: { conversationId: { in: convIds } }, select: { id: true } });
      const msgIds = msgs.map((m) => m.id);
      if (msgIds.length) {
        await prisma.chatMessageRef.deleteMany({ where: { messageId: { in: msgIds } } });
        await prisma.chatAttachment.deleteMany({ where: { messageId: { in: msgIds } } });
        await prisma.chatNotification.deleteMany({ where: { messageId: { in: msgIds } } });
        await prisma.chatMessage.deleteMany({ where: { id: { in: msgIds } } });
      }
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: convIds } } });
      await prisma.chatNotification.deleteMany({ where: { conversationId: { in: convIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
    }
    if (ids.length) {
      await prisma.chatNotification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.farmAccess.deleteMany({ where: { userId: { in: ids } } });
    }
    await prisma.cropCycle.deleteMany({ where: { plot: { farm: { name: { startsWith: "Chat Test Farm" } } } } });
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "Chat Test Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { farm: { name: { startsWith: "Chat Test Farm" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "Chat Test Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
  };

  beforeAll(async () => {
    await cleanup();
    clearRateLimitStore();
    const passwordHash = await bcrypt.hash("AgaatePassword123!", 10);
    const mk = (name: string, role: string) =>
      prisma.user.create({ data: { name, email: `${name.replace(/\s+/g, ".").toLowerCase()}${TAG}`, passwordHash, role: role as any } });
    sa = await mk("Chat SA", "SUPER_ADMIN");
    agro = await mk("Chat Agro", "AGRONOMIST");
    officerA = await mk("Chat Officer A", "FARM_OFFICER");
    officerB = await mk("Chat Officer B", "FARM_OFFICER");
    ops = await mk("Chat Ops", "OPERATIONS_MANAGER");
    owner = await mk("Chat Owner", "FARM_ADMIN");
    saCookie = await cookieFor(sa);
    agroCookie = await cookieFor(agro);
    offACookie = await cookieFor(officerA);
    offBCookie = await cookieFor(officerB);
    opsCookie = await cookieFor(ops);
    ownerCookie = await cookieFor(owner);

    const farmData = (name: string) => ({
      name,
      ownerName: "Chat Owner",
      location: "Test Taluk",
      latitude: 13.0,
      longitude: 77.0,
      totalArea: 10,
      cultivableArea: 9,
      waterSource: "Borewell",
    });
    farmA = await prisma.farm.create({ data: farmData("Chat Test Farm A") });
    farmB = await prisma.farm.create({ data: farmData("Chat Test Farm B") });
    plotA = await prisma.plot.create({ data: { farmId: farmA.id, name: "Plot 1", area: 5, latitude: 13.0, longitude: 77.0 } });
    plotB = await prisma.plot.create({ data: { farmId: farmB.id, name: "Plot 9", area: 4, latitude: 13.1, longitude: 77.1 } });
    cycleA = await prisma.cropCycle.create({
      data: { plotId: plotA.id, cropName: "Pomegranate", establishmentType: "DIRECT_SOWING", startDate: new Date("2026-06-01"), status: "ACTIVE" },
    });
    // Agro leads farm A; officer A works farm A; officer B works farm B.
    await prisma.farmAccess.createMany({
      data: [
        { userId: agro.id, farmId: farmA.id, canManage: true },
        { userId: officerA.id, farmId: farmA.id, canManage: false },
        { userId: officerB.id, farmId: farmB.id, canManage: false },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("officer opens a conversation with the farm agronomist", async () => {
    const res = await withAuth(offACookie, () =>
      createConversation(req("http://localhost/api/conversations", "POST", { farmId: farmA.id, participantIds: [agro.id], subject: "Leaf spots" }, offACookie))
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    convId = body.id;
    expect(body.farmId).toBe(farmA.id);
  });

  it("officer cannot add someone without farm access", async () => {
    const res = await withAuth(offACookie, () =>
      createConversation(req("http://localhost/api/conversations", "POST", { farmId: farmA.id, participantIds: [officerB.id] }, offACookie))
    );
    expect(res.status).toBe(422);
  });

  it("farm admin cannot join chat in Phase 1", async () => {
    await prisma.farmAccess.create({ data: { userId: owner.id, farmId: farmA.id, canManage: true } });
    const res = await withAuth(offACookie, () =>
      createConversation(req("http://localhost/api/conversations", "POST", { farmId: farmA.id, participantIds: [owner.id] }, offACookie))
    );
    expect(res.status).toBe(422);
  });

  it("ops manager cannot initiate conversations", async () => {
    const res = await withAuth(opsCookie, () =>
      createConversation(req("http://localhost/api/conversations", "POST", { farmId: farmA.id, participantIds: [agro.id] }, opsCookie))
    );
    expect(res.status).toBe(403);
  });

  it("agronomist sends a message with a plot reference", async () => {
    const res = await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Those spots look like cercospora — check plot 1 undersides.",
          refs: [{ entityType: "PLOT", entityId: plotA.id }],
        }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(res.status).toBe(201);
    const msg = await res.json();
    firstMessageId = msg.id;
    expect(msg.refs).toHaveLength(1);
    expect(msg.refs[0].label).toContain("Plot 1");
  });

  it("cross-farm references are rejected", async () => {
    const res = await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Wrong farm ref",
          refs: [{ entityType: "PLOT", entityId: plotB.id }],
        }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(res.status).toBe(422);
  });

  it("idempotent retry returns the same message", async () => {
    const key = randomUUID();
    const payload = { clientMessageId: key, body: "Spray after 4:30 PM.", refs: [] };
    const r1 = await withAuth(offACookie, () =>
      sendMessage(req("http://localhost/api/conversations/x/messages", "POST", payload, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(r1.status).toBe(201);
    const r2 = await withAuth(offACookie, () =>
      sendMessage(req("http://localhost/api/conversations/x/messages", "POST", payload, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(r2.status).toBe(200);
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.id).toBe(b2.id);
    const count = await prisma.chatMessage.count({ where: { clientMessageId: key } });
    expect(count).toBe(1);
  });

  it("outsider officer gets 403 on read and write (IDOR)", async () => {
    const rGet = await withAuth(offBCookie, () =>
      getConversation(req("http://localhost/api/conversations/x", "GET", undefined, offBCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(rGet.status).toBe(403);
    const rPost = await withAuth(offBCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", { clientMessageId: randomUUID(), body: "hijack" }, offBCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(rPost.status).toBe(403);
  });

  it("message pagination cursors work", async () => {
    const page1 = await withAuth(offACookie, () =>
      listMessages(req(`http://localhost/api/conversations/x/messages?limit=1`, "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(page1.status).toBe(200);
    const b1 = await page1.json();
    expect(b1.messages).toHaveLength(1);
    expect(b1.hasMore).toBe(true);
    const latestId = b1.messages[0].id;
    // Scrollback: messages older than the latest.
    const page2 = await withAuth(offACookie, () =>
      listMessages(req(`http://localhost/api/conversations/x/messages?limit=10&before=${latestId}`, "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(page2.status).toBe(200);
    const b2 = await page2.json();
    expect(b2.messages.length).toBeGreaterThan(0);
    expect(b2.messages.every((m: any) => m.createdAt <= b1.messages[0].createdAt)).toBe(true);
    // Poll-forward: nothing newer than the latest.
    const page3 = await withAuth(offACookie, () =>
      listMessages(req(`http://localhost/api/conversations/x/messages?limit=10&after=${latestId}`, "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    const b3 = await page3.json();
    expect(b3.messages).toHaveLength(0);
    expect(b3.hasMore).toBe(false);
  });

  it("read watermark clears unread count; new reply re-triggers notification", async () => {
    // Officer reads everything.
    const rRead = await withAuth(offACookie, () =>
      markRead(req("http://localhost/api/conversations/x/read", "PATCH", {}, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(rRead.status).toBe(200);
    const c0 = await withAuth(offACookie, () => unreadCount(req("http://localhost/api/notifications/unread-count", "GET", undefined, offACookie)));
    expect((await c0.json()).count).toBe(0);

    // Agronomist replies → officer gets exactly one unread notification.
    await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", { clientMessageId: randomUUID(), body: "Any improvement today?" }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    const c1 = await withAuth(offACookie, () => unreadCount(req("http://localhost/api/notifications/unread-count", "GET", undefined, offACookie)));
    expect((await c1.json()).count).toBe(1);
    const inbox = await withAuth(offACookie, () => listNotifications(req("http://localhost/api/notifications", "GET", undefined, offACookie)));
    expect(inbox.status).toBe(200);
    const items = await inbox.json();
    expect(items.length).toBe(1);
    expect(items[0].deepLink).toContain("/officer/chat");
  });

  it("roster shows farm agronomists to the officer", async () => {
    const res = await withAuth(offACookie, () => getRoster(req(`http://localhost/api/conversations/roster?farmId=${farmA.id}`, "GET", undefined, offACookie)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.people.some((p: any) => p.userId === agro.id && p.role === "AGRONOMIST")).toBe(true);
  });

  it("context endpoint returns live farm snapshot", async () => {
    const res = await withAuth(agroCookie, () =>
      getContext(req("http://localhost/api/conversations/x/context", "GET", undefined, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(res.status).toBe(200);
    const ctx = await res.json();
    expect(ctx.farm.id).toBe(farmA.id);
    expect(ctx.plots.some((p: any) => p.id === plotA.id && p.cycles.some((c: any) => c.id === cycleA.id))).toBe(true);
    expect(ctx.people.some((p: any) => p.userId === officerA.id)).toBe(true);
  });

  it("closed conversations block new messages and can reopen", async () => {
    const rClose = await withAuth(agroCookie, () =>
      patchConversation(req("http://localhost/api/conversations/x", "PATCH", { status: "CLOSED" }, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(rClose.status).toBe(200);
    const rSend = await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", { clientMessageId: randomUUID(), body: "too late" }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(rSend.status).toBe(422);
    const rOpen = await withAuth(agroCookie, () =>
      patchConversation(req("http://localhost/api/conversations/x", "PATCH", { status: "OPEN" }, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(rOpen.status).toBe(200);
  });

  it("super admin sees agronomist workload overview", async () => {
    const res = await withAuth(saCookie, () => listAgronomists(req("http://localhost/api/agronomists?search=Chat%20Agro", "GET", undefined, saCookie)));
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(rows.length).toBe(1);
    expect(rows[0].workload.openConversations).toBeGreaterThanOrEqual(1);
    expect(rows[0].farms.some((f: any) => f.farmId === farmA.id && f.canManage)).toBe(true);
  });

  it("officer conversation list shows unread badges", async () => {
    const res = await withAuth(offACookie, () => listConversations(req("http://localhost/api/conversations", "GET", undefined, offACookie)));
    expect(res.status).toBe(200);
    const rows = await res.json();
    const mine = rows.find((c: any) => c.id === convId);
    expect(mine).toBeDefined();
    expect(mine.unreadCount).toBeGreaterThanOrEqual(1);
  });

  // ── Phase 1.5 ──────────────────────────────────────────────────────────

  it("duplicate create resumes the open thread instead of forking", async () => {
    const res = await withAuth(offACookie, () =>
      createConversation(req("http://localhost/api/conversations", "POST", { farmId: farmA.id, participantIds: [agro.id], subject: "Leaf spots again" }, offACookie))
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(convId);
    expect(body.reused).toBe(true);
    const count = await prisma.conversation.count({ where: { farmId: farmA.id, status: "OPEN" } });
    expect(count).toBe(1);
  });

  it("conversation search matches subject and farm name", async () => {
    const hit = await withAuth(agroCookie, () => listConversations(req("http://localhost/api/conversations?q=Leaf", "GET", undefined, agroCookie)));
    expect(hit.status).toBe(200);
    expect((await hit.json()).some((c: any) => c.id === convId)).toBe(true);
    const miss = await withAuth(agroCookie, () => listConversations(req("http://localhost/api/conversations?q=NoSuchFarmXYZ", "GET", undefined, agroCookie)));
    expect(miss.status).toBe(200);
    expect(await miss.json()).toHaveLength(0);
  });

  it("a message can carry multiple photo attachments; reuse is rejected", async () => {
    const assets = await Promise.all([1, 2].map((n) =>
      prisma.mediaAsset.create({
        data: { storageKey: `chat-test/${randomUUID()}.jpg`, kind: "CROP_PHOTO", mimeType: "image/jpeg", sizeBytes: 1024 * n, farmId: farmA.id, uploadedById: officerA.id },
      })
    ));
    const res = await withAuth(offACookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Three leaves, worst first.",
          attachmentMediaIds: assets.map((a) => a.id),
        }, offACookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg.attachments).toHaveLength(2);
    expect(msg.attachment.id).toBe(msg.attachments[0].id);

    // Another user's upload is invalid for the agronomist.
    const dup = await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Trying to reuse a photo.",
          attachmentMediaIds: [assets[0].id],
        }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(dup.status).toBe(422);
    // And the uploader can't attach the same photo to a second message.
    const again = await withAuth(offACookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Second use of the same photo.",
          attachmentMediaIds: [assets[0].id],
        }, offACookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    expect(again.status).toBe(422);
    await prisma.chatAttachment.deleteMany({ where: { mediaAssetId: { in: assets.map((a) => a.id) } } });
    await prisma.mediaAsset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } });
  });

  it("unassigned participant loses chat access but history survives", async () => {
    await prisma.farmAccess.delete({ where: { userId_farmId: { userId: officerA.id, farmId: farmA.id } } });
    try {
      const rGet = await withAuth(offACookie, () =>
        getConversation(req("http://localhost/api/conversations/x", "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
      );
      expect(rGet.status).toBe(403);
      const rCtx = await withAuth(offACookie, () =>
        getContext(req("http://localhost/api/conversations/x/context", "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
      );
      expect(rCtx.status).toBe(403);
      const rPost = await withAuth(offACookie, () =>
        sendMessage(
          req("http://localhost/api/conversations/x/messages", "POST", { clientMessageId: randomUUID(), body: "after removal" }, offACookie),
          { params: Promise.resolve({ conversationId: convId }) }
        )
      );
      expect(rPost.status).toBe(403);
      // The other side still sees the full history with names intact.
      const rAgro = await withAuth(agroCookie, () =>
        listMessages(req("http://localhost/api/conversations/x/messages?limit=5", "GET", undefined, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
      );
      expect(rAgro.status).toBe(200);
    } finally {
      await prisma.farmAccess.create({ data: { userId: officerA.id, farmId: farmA.id, canManage: false } });
    }
    const rBack = await withAuth(offACookie, () =>
      getConversation(req("http://localhost/api/conversations/x", "GET", undefined, offACookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(rBack.status).toBe(200);
  });

  it("closed conversations block participant adds", async () => {
    await withAuth(agroCookie, () =>
      patchConversation(req("http://localhost/api/conversations/x", "PATCH", { status: "CLOSED" }, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    const res = await withAuth(agroCookie, () =>
      addParticipant(req("http://localhost/api/conversations/x/participants", "POST", { userId: officerA.id }, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
    expect(res.status).toBe(422);
    await withAuth(agroCookie, () =>
      patchConversation(req("http://localhost/api/conversations/x", "PATCH", { status: "OPEN" }, agroCookie), { params: Promise.resolve({ conversationId: convId }) })
    );
  });

  it("notification bell flow: list, open, mark-all-read", async () => {
    // Force an unread for the officer.
    await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", { clientMessageId: randomUUID(), body: "Bell test ping." }, agroCookie),
        { params: Promise.resolve({ conversationId: convId }) }
      )
    );
    const inbox = await withAuth(offACookie, () => listNotifications(req("http://localhost/api/notifications?limit=15", "GET", undefined, offACookie)));
    expect(inbox.status).toBe(200);
    const items = await inbox.json();
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].deepLink).toContain("/officer/chat?conversation=");
    const one = await withAuth(offACookie, () =>
      patchNotifications(req("http://localhost/api/notifications", "PATCH", { ids: [items[0].id] }, offACookie))
    );
    expect(one.status).toBe(200);
    const all = await withAuth(offACookie, () =>
      patchNotifications(req("http://localhost/api/notifications", "PATCH", { allRead: true }, offACookie))
    );
    expect(all.status).toBe(200);
    const c = await withAuth(offACookie, () => unreadCount(req("http://localhost/api/notifications/unread-count", "GET", undefined, offACookie)));
    expect((await c.json()).count).toBe(0);
  });

  it("full field workflow: plot-scoped thread, ref reply, read receipts, close", async () => {
    // Officer opens a plot-scoped thread (distinct scope → no reuse of convId).
    const opened = await withAuth(offACookie, () =>
      createConversation(
        req("http://localhost/api/conversations", "POST", { farmId: farmA.id, plotId: plotA.id, participantIds: [agro.id], subject: "Plot 1 yellowing" }, offACookie)
      )
    );
    expect(opened.status).toBe(201);
    const thread = await opened.json();
    expect(thread.plotId).toBe(plotA.id);

    // Agronomist replies referencing the crop cycle.
    const reply = await withAuth(agroCookie, () =>
      sendMessage(
        req("http://localhost/api/conversations/x/messages", "POST", {
          clientMessageId: randomUUID(),
          body: "Nitrogen deficiency — top-dress urea 25kg/acre.",
          refs: [{ entityType: "CROP_CYCLE", entityId: cycleA.id }],
        }, agroCookie),
        { params: Promise.resolve({ conversationId: thread.id }) }
      )
    );
    expect(reply.status).toBe(201);
    expect((await reply.json()).refs[0].label).toContain("Pomegranate");

    // Officer reads → zero unread; agronomist still has the officer's opener unread.
    await withAuth(offACookie, () =>
      markRead(req("http://localhost/api/conversations/x/read", "PATCH", {}, offACookie), { params: Promise.resolve({ conversationId: thread.id }) })
    );
    const cOff = await withAuth(offACookie, () => unreadCount(req("http://localhost/api/notifications/unread-count", "GET", undefined, offACookie)));
    expect((await cOff.json()).count).toBe(0);

    // Search finds it by subject; close archives it; closed list contains it.
    const found = await withAuth(agroCookie, () => listConversations(req("http://localhost/api/conversations?q=yellowing", "GET", undefined, agroCookie)));
    expect((await found.json()).some((c: any) => c.id === thread.id)).toBe(true);
    await withAuth(agroCookie, () =>
      patchConversation(req("http://localhost/api/conversations/x", "PATCH", { status: "CLOSED" }, agroCookie), { params: Promise.resolve({ conversationId: thread.id }) })
    );
    const closed = await withAuth(agroCookie, () => listConversations(req("http://localhost/api/conversations?status=CLOSED", "GET", undefined, agroCookie)));
    expect((await closed.json()).some((c: any) => c.id === thread.id)).toBe(true);
  });
});
