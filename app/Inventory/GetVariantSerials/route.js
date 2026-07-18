import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const { searchParams } = new URL(request.url);
  const itemVariantId = searchParams.get("itemVariantId");
  if (!itemVariantId) {
    return NextResponse.json({ message: "itemVariantId is required" }, { status: 400 });
  }

  const [rows] = await mysqlPool.query(
    "SELECT guid, value, status, landingPrice, createdAt FROM serials WHERE itemVariantId = ? AND isDeleted = 0 ORDER BY createdAt DESC",
    [itemVariantId]
  );

  return NextResponse.json({ data: rows, total: rows.length, message: "Success" });
});
