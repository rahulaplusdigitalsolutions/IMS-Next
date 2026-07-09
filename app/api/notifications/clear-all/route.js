import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  await mysqlPool.query("DELETE FROM notifications WHERE targetUserGuid = ?", [user.id]);
  return NextResponse.json({ success: true });
});
