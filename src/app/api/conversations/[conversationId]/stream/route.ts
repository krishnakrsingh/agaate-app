import { NextRequest } from "next/server";
import { currentActor, requireRole } from "@modules/auth";
import { gateConversation } from "@modules/chat/access";
import { chatBroadcaster } from "@modules/chat/infrastructure/chatBroadcaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const { conversationId } = await params;
    await gateConversation(conversationId, actor);

    const encoder = new TextEncoder();
    const eventName = `message:${conversationId}`;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Initial connection ack
        controller.enqueue(
          encoder.encode(`event: ready\ndata: ${JSON.stringify({ status: "connected", conversationId, userId: actor.id })}\n\n`)
        );

        // 2. Real-time message listener
        const messageHandler = (payload: { conversationId: string; message: any }) => {
          try {
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${JSON.stringify(payload.message)}\n\n`)
            );
          } catch {
            // stream may be closing
          }
        };

        chatBroadcaster.on(eventName, messageHandler);

        // 3. Heartbeat keepalive every 15s
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: "keepalive"\n\n`));
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        // 4. Cleanup on disconnect
        const cleanup = () => {
          clearInterval(pingInterval);
          chatBroadcaster.off(eventName, messageHandler);
        };

        request.signal.addEventListener("abort", cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? (error as any).status : 403;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Access denied" }), {
      status: typeof status === "number" ? status : 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
