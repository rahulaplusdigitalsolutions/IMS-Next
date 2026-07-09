import { NextResponse } from "next/server";
import { ApiError } from "./auth";

// Every route handler wraps its body in this — mirrors Backend4's
// `express-async-errors` + final error-handling middleware: any thrown
// ApiError becomes its status/message, anything else becomes a 500.
export function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      console.error("[api] Unhandled error:", err.stack || err);
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
