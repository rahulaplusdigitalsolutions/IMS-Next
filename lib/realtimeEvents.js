// Company-scoped SSE broadcast registry for app-wide real-time data sync —
// mirrors lib/notifications.js's per-user registry shape, but keyed by
// companyGuid since every user viewing that company's data should see the
// same live update (not just one specific user), and is entity-agnostic so
// any feature (models, serials, dispatches, orders, returns, contracts, ...)
// can broadcast through the same channel instead of each having its own.
const globalForSSE = globalThis;
const realtimeSseClients = globalForSSE.__imsRealtimeSseClients || new Map(); // Map<companyGuid, Set<controller>>
if (!globalForSSE.__imsRealtimeSseClients) globalForSSE.__imsRealtimeSseClients = realtimeSseClients;

const encoder = new TextEncoder();

export function addRealtimeSSEClient(companyGuid, controller) {
  const id = String(companyGuid);
  if (!realtimeSseClients.has(id)) realtimeSseClients.set(id, new Set());
  realtimeSseClients.get(id).add(controller);
}

export function removeRealtimeSSEClient(companyGuid, controller) {
  const id = String(companyGuid);
  const set = realtimeSseClients.get(id);
  if (set) {
    set.delete(controller);
    if (set.size === 0) realtimeSseClients.delete(id);
  }
}

// `entity` identifies which slice of data changed (e.g. "models", "serials",
// "dispatches", "orders", "returns", "contracts") so listeners can refetch
// only what's relevant instead of reloading everything.
export function broadcastRealtimeEvent(companyGuid, entity) {
  const set = realtimeSseClients.get(String(companyGuid));
  if (!set) return;
  const payload = encoder.encode(`data: ${JSON.stringify({ type: "DATA_CHANGED", entity })}\n\n`);
  for (const controller of set) {
    try {
      controller.enqueue(payload);
    } catch {
      // controller already closed — will be cleaned up by its own `cancel()`
    }
  }
}
