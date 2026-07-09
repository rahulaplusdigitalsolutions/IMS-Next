import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const [rows] = await mysqlPool.query(`
    SELECT m.mappingId, c.categoryName, b.brandName, m.categoryId, m.brandId
    FROM inventorycategorybrandmapping m
    JOIN inventorycategorymaster c ON m.categoryId = c.categoryId
    JOIN inventorybrandmaster b ON m.brandId = b.brandId
    WHERE m.isDeleted = 0
  `);
  return NextResponse.json({ data: rows, message: "Success" });
});
