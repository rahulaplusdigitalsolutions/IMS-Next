import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireCompany } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { withErrorHandling } from "@/lib/apiResponse";

// GEM orders for cert generation
export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeWarranty(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT
      o.guid          AS orderGuid,
      o.orderid       AS orderNumber,
      o.platform,
      o.gemOrderType,
      o.bidNumber,
      o.customerName  AS customer,
      o.consigneeName,
      o.shippingAddress,
      o.address,
      o.buyerAddress,
      o.contactNumber,
      o.altContactNumber,
      o.invoiceNumber,
      o.gstNumber,
      o.orderDate,
      o.dispatchDate,
      o.status,
      oi.sellingPrice,
      oi.warranty,
      s.value         AS serialValue,
      m.name          AS modelName,
      m.company       AS companyName
    FROM orders o
    LEFT JOIN order_items oi ON oi.orderGuid = o.guid AND oi.companyGuid = o.companyGuid
    LEFT JOIN serials s      ON oi.serialNumberGuid = s.guid AND s.companyGuid = o.companyGuid
    LEFT JOIN models m       ON s.modelGuid = m.guid AND m.companyGuid = o.companyGuid
    WHERE o.isDeleted = 0 AND o.companyGuid = ?
    ORDER BY o.dispatchDate DESC, o.orderDate DESC
  `, [user.companyId]);

  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    if (!seen.has(row.orderGuid)) {
      seen.add(row.orderGuid);
      unique.push(row);
    }
  }
  return NextResponse.json(unique);
});
