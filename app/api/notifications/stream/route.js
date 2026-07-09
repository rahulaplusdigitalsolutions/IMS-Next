import { mysqlPool } from "@/lib/db";
import { sanitizeUser, verifyToken } from "@/lib/helpers";
import { addSSEClient, removeSSEClient } from "@/lib/notifications";

// EventSource can't set headers, so auth here uses a query-string token —
// ported from Backend4/notificationsRoutes.js's `requireAuthViaQueryToken`.
async function getUserFromQueryToken(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const [rows] = await mysqlPool.query("SELECT * FROM users WHERE userid = ? LIMIT 1", [payload.id]);
  return rows[0] ? sanitizeUser(rows[0]) : null;
}

export async function GET(request) {
  const user = await getUserFromQueryToken(request);
  if (!user) return new Response(JSON.stringify({ message: "Authentication required" }), { status: 401 });

  const encoder = new TextEncoder();
  let heartbeat;
  let controllerRef;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(encoder.encode('data: {"type":"CONNECTED"}\n\n'));
      addSSEClient(user.id, controller);

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
      if (controllerRef) removeSSEClient(user.id, controllerRef);
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
