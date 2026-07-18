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
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 1000;
  const offset = (page - 1) * limit;
  const categoryId = searchParams.get("categoryId");

  const whereCategory = categoryId ? "AND i.categoryId = ?" : "";
  const countParams = categoryId ? [categoryId] : [];

  const [countRows] = await mysqlPool.query(
    `SELECT COUNT(*) as total FROM inventoryitemmaster i WHERE i.isDeleted = 0 ${whereCategory}`,
    countParams
  );
  const [rows] = await mysqlPool.query(`
    SELECT i.*, c.categoryName, b.brandName, u.unitName
    FROM inventoryitemmaster i
    LEFT JOIN inventorycategorymaster c ON i.categoryId = c.categoryId
    LEFT JOIN inventorybrandmaster b ON i.brandId = b.brandId
    LEFT JOIN inventoryunitmaster u ON i.unitId = u.unitId
    WHERE i.isDeleted = 0 ${whereCategory}
    ORDER BY c.categoryName ASC, i.itemName ASC
    LIMIT ? OFFSET ?
  `, [...countParams, limit, offset]);
  return NextResponse.json({ data: rows, total: countRows[0].total, message: "Success" });
});
