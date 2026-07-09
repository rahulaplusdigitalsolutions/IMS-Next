import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  const { guid } = await params;

  await mysqlPool.query(
    "UPDATE notifications SET isRead = TRUE WHERE guid = ? AND targetUserGuid = ?",
    [guid, user.id]
  );
  return NextResponse.json({ success: true });
});
