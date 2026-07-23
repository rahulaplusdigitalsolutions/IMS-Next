import { NextResponse } from "next/server";
import { ApiError, getAuthenticatedUser } from "./auth";
import { logApiRequest } from "./apiRequestLog";

// Every route handler wraps its body in this — mirrors Backend4's
// `express-async-errors` + final error-handling middleware: any thrown
// ApiError becomes its status/message, anything else becomes a 500. It's
// also the single choke point every API route already passes through, so
// it doubles as the central place to record the API request log (who called
// what, when, and — if it failed — why) without touching every route file.
export function withErrorHandling(handler) {
  return async (request, context) => {
    const startedAt = Date.now();
    const { pathname } = new URL(request.url);
    const ipAddress = request.headers.get("x-forwarded-for") || null;

    // Fire-and-forget — logging must never add latency to the actual
    // response, and must never itself require (or fail) auth. Resolved
    // lazily (not awaited up front) so it doesn't serialize in front of the
    // handler; the 30s in-memory user cache in getAuthenticatedUser means
    // this and the handler's own authenticateRequest() call share one DB hit.
    const record = (statusCode, isError, errorMessage, errorStack) => {
      getAuthenticatedUser(request)
        .catch(() => null)
        .then((user) =>
          logApiRequest({
            user,
            method: request.method,
            path: pathname,
            statusCode,
            isError,
            errorMessage,
            errorStack,
            durationMs: Date.now() - startedAt,
            ipAddress,
          })
        )
        .catch(() => {});
    };

    try {
      const response = await handler(request, context);
      record(response?.status ?? 200, false, null, null);
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        // ApiError.message is already the human-readable reason (e.g.
        // "Serial not found") — still capture the stack too, so a report
        // reader can see exactly which line threw it, not just the message.
        record(err.status, true, err.message, err.stack);
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      console.error("[api] Unhandled error:", err.stack || err);
      record(500, true, err.message || "Internal server error", err.stack);
      return NextResponse.json({ message: err.message || "Internal server error" }, { status: 500 });
    }
  };
}

// Safe JSON body parse — Backend4 relies on express.json() which tolerates an
// empty body for GET/DELETE; Next's request.json() throws on empty body.
export async function parseJsonBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}
