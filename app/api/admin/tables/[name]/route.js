import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Dropping tables is permanently disabled for security reasons — matches
// Backend4/routes/superAdmin.js's `router.delete("/tables/:name", ...)`.
export const DELETE = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  return NextResponse.json({ message: "Dropping tables is disabled for security reasons." }, { status: 403 });
});
