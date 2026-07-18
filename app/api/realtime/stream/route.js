import { mysqlPool } from "@/lib/db";
import { sanitizeUser, verifyToken } from "@/lib/helpers";
import { addRealtimeSSEClient, removeRealtimeSSEClient } from "@/lib/realtimeEvents";

// Single app-wide SSE channel — every page keeps one of these connections
// open (opened once in AppDataContext, not per-feature) and gets notified
// whenever any user in the same company changes models/serials/dispatches/
// orders/returns/contracts/etc. EventSource can't set headers, so auth here
// uses a query-string token — same approach as notifications/stream.
async function getUserFromQueryToken(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const [rows] = await mysqlPool.query("SELECT * FROM users WHERE userid = ? LIMIT 1", [payload.id]);
  if (!rows[0]) return null;
  const user = sanitizeUser(rows[0]);
  if (user && payload.companyId) user.companyId = payload.companyId;
  return user;
}

export async function GET(request) {
  const user = await getUserFromQueryToken(request);
  if (!user || !user.companyId) return new Response(JSON.stringify({ message: "Authentication required" }), { status: 401 });

  const encoder = new TextEncoder();
  let heartbeat;
  let controllerRef;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(encoder.encode('data: {"type":"CONNECTED"}\n\n'));
      addRealtimeSSEClient(user.companyId, controller);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);
    },
    cancel() {
      clearInterval(heartbeat);
      if (controllerRef) removeRealtimeSSEClient(user.companyId, controllerRef);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
