import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  await logUserActivity(
    mysqlPool,
    user,
    "Logout",
    [{ field: "session", newValue: "Ended" }],
    request.headers.get("x-forwarded-for") || null
  );
  return NextResponse.json({ message: "Logged out successfully." });
});
