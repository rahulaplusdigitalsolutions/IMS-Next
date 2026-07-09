import { NextResponse } from "next/server";
import { authenticateRequest, getCacheSize } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  return NextResponse.json({ count: getCacheSize() });
});
