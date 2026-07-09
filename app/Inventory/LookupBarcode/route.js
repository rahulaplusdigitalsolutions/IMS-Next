import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const code = new URL(request.url).searchParams.get("code");
  const [rows] = await mysqlPool.query(`
    SELECT
      NULL as itemVariantId,
      m.name as variantCode,
      m.name as itemName,
      NULL as unitName,
      1 as hasSerialNumber,
      IFNULL(m.mrp, 0) as lastPurchaseRate,
      m.guid as modelGuid,
      1 as isModelItem
    FROM models m
    WHERE m.barcode = ? AND m.isDeleted = 0

    UNION ALL

    SELECT
      vb.itemVariantId,
      v.variantName as variantCode,
      i.itemName,
      u.unitName,
      i.isTrackable as hasSerialNumber,
      IFNULL(s.lastPurchaseRate, 0) as lastPurchaseRate,
      NULL as modelGuid,
      0 as isModelItem
    FROM inventoryvariantbarcode vb
    JOIN inventoryitemvariant v ON vb.itemVariantId = v.itemVariantId
    JOIN inventoryitemmaster i ON v.itemId = i.itemId
    LEFT JOIN inventoryunitmaster u ON i.unitId = u.unitId
    LEFT JOIN inventoryvariantstock s ON v.itemVariantId = s.itemVariantId
    WHERE vb.barcode = ? AND v.isDeleted = 0
  `, [code, code]);
  return NextResponse.json({ data: rows, message: "Success" });
});
