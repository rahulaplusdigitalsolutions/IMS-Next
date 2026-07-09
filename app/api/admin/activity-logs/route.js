import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireRoles } from "@/lib/auth";
import { getLocationsForIps } from "@/lib/geoLookup";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireRoles(user, ["Admin"]);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
  const offset = (page - 1) * limit;

  const [[{ total }]] = await mysqlPool.query("SELECT COUNT(*) as total FROM useractivitylogs");
  const [rows] = await mysqlPool.query("SELECT * FROM useractivitylogs ORDER BY changedAt DESC LIMIT ? OFFSET ?", [limit, offset]);

  const locationMap = await getLocationsForIps(rows.map((r) => r.ipAddress));
  const enriched = rows.map((r) => ({
    ...r,
    location: locationMap.get((r.ipAddress || "").replace("::ffff:", ""))?.label || "Unknown",
  }));

  return NextResponse.json({ data: enriched, total });
});
