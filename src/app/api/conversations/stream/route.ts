import { NextRequest } from "next/server";
import { currentActor, requireRole, requireFarmAccess } from "@modules/auth";
import { chatBroadcaster } from "@modules/chat/infrastructure/chatBroadcaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const farmId = request.nextUrl.searchParams.get("farmId")?.trim() || null;
    if (farmId) await requireFarmAccess(farmId);

    const encoder = new TextEncoder();
    const eventName = farmId ? `farm:${farmId}` : "conversation";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`event: ready\ndata: ${JSON.stringify({ status: "connected", farmId })}\n\n`)
        );

        const convHandler = (payload: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: update\ndata: ${JSON.stringify(payload)}\n\n`)
            );
          } catch {
            // stream closing
          }
        };

        chatBroadcaster.on(eventName, convHandler);

        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: "keepalive"\n\n`));
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        const cleanup = () => {
          clearInterval(pingInterval);
          chatBroadcaster.off(eventName, convHandler);
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
