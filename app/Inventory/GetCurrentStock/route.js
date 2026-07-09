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
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const brandId = searchParams.get("brandId");
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  let whereClause = "WHERE v.isDeleted = 0 AND i.itemName != 'SYSTEM_COMBOS' AND IFNULL(i.useSerialTab, 0) = 0 AND v.itemVariantId NOT IN (SELECT parentVariantId FROM inventorycombomapping WHERE isDeleted = 0)";
  const params = [];

  if (brandId && brandId !== "all") {
    whereClause += " AND i.brandId = ?";
    params.push(brandId);
  }

  if (search) {
    whereClause += " AND (i.itemName LIKE ? OR v.variantName LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await mysqlPool.query(`
    SELECT v.itemVariantId, v.variantName, i.itemName, i.brandId, u.unitName,
           IFNULL(s.availablePCS, 0) as availablePCS,
           IFNULL(NULLIF(s.lastPurchaseRate, 0), IFNULL(s.avgPurchaseRate, 0)) as avgPurchaseRate,
           (IFNULL(s.availablePCS, 0) * IFNULL(NULLIF(s.lastPurchaseRate, 0), IFNULL(s.avgPurchaseRate, 0))) as totalValue
    FROM inventoryitemvariant v
    JOIN inventoryitemmaster i ON v.itemId = i.itemId
    LEFT JOIN inventoryunitmaster u ON i.unitId = u.unitId
    LEFT JOIN inventoryvariantstock s ON v.itemVariantId = s.itemVariantId
    ${whereClause}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const [[{ total, totalValue, lowStockCount }]] = await mysqlPool.query(`
    SELECT
      COUNT(*) as total,
      SUM(IFNULL(s.availablePCS, 0) * IFNULL(NULLIF(s.lastPurchaseRate, 0), IFNULL(s.avgPurchaseRate, 0))) as totalValue,
      COUNT(CASE WHEN IFNULL(s.availablePCS, 0) < 10 THEN 1 END) as lowStockCount
    FROM inventoryitemvariant v
    JOIN inventoryitemmaster i ON v.itemId = i.itemId
    LEFT JOIN inventoryvariantstock s ON v.itemVariantId = s.itemVariantId
    ${whereClause}
  `, params);

  return NextResponse.json({
    data: rows,
    total,
    totalValue: totalValue || 0,
    lowStockCount: lowStockCount || 0,
    message: "Success",
  });
});
