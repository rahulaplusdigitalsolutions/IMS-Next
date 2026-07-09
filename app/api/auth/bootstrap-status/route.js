import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { withErrorHandling } from "@/lib/apiResponse";

async function getUserCount() {
  const [rows] = await mysqlPool.query("SELECT COUNT(*) as total FROM users");
  return Number(rows[0]?.total || 0);
}

export const GET = withErrorHandling(async () => {
  return NextResponse.json({ setupRequired: (await getUserCount()) === 0 });
});
