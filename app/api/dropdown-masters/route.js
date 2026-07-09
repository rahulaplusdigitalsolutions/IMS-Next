import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  const [rows] = await mysqlPool.query(`
    SELECT id, dropdown_code, dropdown_name, description
    FROM dropdown_master
    WHERE is_active = 1
  `);
  return NextResponse.json({ success: true, data: rows });
});
