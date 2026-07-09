import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  const { guid } = await params;

  const [rows] = await mysqlPool.query(
    "SELECT variantId FROM model_approval_requests WHERE guid=? AND isDeleted=0", [guid]
  );
  if (!rows.length) throw new ApiError(404, "Request not found.");

  const variantId = rows[0].variantId;
  if (!variantId) return NextResponse.json([]);

  const [serials] = await mysqlPool.query(
    `SELECT s.guid, s.value, s.landingPrice, s.landingPriceReason, s.status, s.createdAt,
            g.godownName
     FROM serials s
     LEFT JOIN godowns g ON s.godownGuid = g.guid
     WHERE s.modelGuid = ? AND s.status = 'Available' AND s.isDeleted = 0`,
    [variantId]
  );

  return NextResponse.json(serials);
});
