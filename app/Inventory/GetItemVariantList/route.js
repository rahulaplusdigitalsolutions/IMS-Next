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
  const itemId = searchParams.get("itemId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const offset = (page - 1) * limit;

  const [rows] = await mysqlPool.query(
    "SELECT itemVariantId, variantName as variantCode FROM inventoryitemvariant WHERE itemId = ? AND isDeleted = 0 LIMIT ? OFFSET ?",
    [itemId, limit, offset]
  );

  const [[{ total }]] = await mysqlPool.query(
    "SELECT COUNT(*) as total FROM inventoryitemvariant WHERE itemId = ? AND isDeleted = 0",
    [itemId]
  );

  return NextResponse.json({ message: "Success", data: rows, total });
});
