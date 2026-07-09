import { NextResponse } from "next/server";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, approvalStore } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const token = new URL(request.url).searchParams.get("token");
  const entry = approvalStore.get(token);
  if (!entry) return NextResponse.json({ status: "expired" });
  if (Date.now() > entry.expiresAt) {
    approvalStore.delete(token);
    return NextResponse.json({ status: "expired" });
  }
  if (entry.userId !== String(user.id)) throw new ApiError(403, "Forbidden");
  const payload = { status: entry.status };
  if (entry.status === "approved" && entry.otp) payload.otp = entry.otp;
  return NextResponse.json(payload);
});
