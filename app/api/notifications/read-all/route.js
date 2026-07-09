import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  await mysqlPool.query(
    "UPDATE notifications SET isRead = TRUE WHERE targetUserGuid = ? AND isRead = FALSE",
    [user.id]
  );
  return NextResponse.json({ success: true });
});
