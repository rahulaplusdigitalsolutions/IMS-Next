import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const stockInId = new URL(request.url).searchParams.get("stockInId");
  const [rows] = await mysqlPool.query(`
    SELECT
      d.stockInDetailId, d.stockInId, d.itemVariantId, d.modelGuid, d.godownGuid, d.unitId, d.barcode,
      IFNULL(d.stockInQty, 0) as qty, IFNULL(d.defaultPcsQty, 1) as pcs, IFNULL(d.purchaseRate, 0) as rate,
      IFNULL((d.stockInQty * d.purchaseRate), 0) as amount,
      IFNULL(v.variantName, m.name) as variantCode,
      IFNULL(i.itemName, m.name) as itemName,
      IFNULL(u.unitName, '') as unitName,
      IF(d.modelGuid IS NOT NULL, 1, i.isTrackable) as hasSerialNumber,
      (SELECT COUNT(*) FROM inventorystockinserial iss WHERE iss.stockInDetailId = d.stockInDetailId AND iss.isDeleted = 0) as serialCount,
      s.vendorId, s.invoiceNo, s.invoiceDate, s.invoiceFile, s.status as stockInStatus
    FROM inventorystockindetail d
    JOIN inventorystockin s ON d.stockInId = s.stockInId
    LEFT JOIN inventoryitemvariant v ON d.itemVariantId = v.itemVariantId
    LEFT JOIN inventoryitemmaster i ON v.itemId = i.itemId
    LEFT JOIN inventoryunitmaster u ON d.unitId = u.unitId
    LEFT JOIN models m ON d.modelGuid = m.guid
    WHERE d.stockInId = ? AND d.isDeleted = 0
  `, [stockInId]);
  return NextResponse.json({ data: rows, message: "Success" });
});
