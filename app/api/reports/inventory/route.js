import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeReports } from "@/lib/reportsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeReports(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT COALESCE(im.itemName, iv.variantName) as modelName, bm.brandName as companyName, cm.categoryName as category,
      COUNT(s2.guid) as totalSerials,
      SUM(CASE WHEN s2.serialStatus='Available' THEN 1 ELSE 0 END) as availableSerials,
      SUM(CASE WHEN s2.serialStatus='Dispatched' THEN 1 ELSE 0 END) as dispatchedSerials,
      SUM(CASE WHEN s2.serialStatus='Damaged' THEN 1 ELSE 0 END) as damagedSerials,
      AVG(s2.landingPrice) as avgLandingPrice, 0 as stockQuantity
    FROM inventoryitemvariant iv
    JOIN inventorystockinserial s2 ON s2.itemVariantId=iv.itemVariantId AND s2.isDeleted=0
    LEFT JOIN inventoryitemmaster im ON iv.itemId=im.itemId
    LEFT JOIN inventorybrandmaster bm ON im.brandId=bm.brandId
    LEFT JOIN inventorycategorymaster cm ON im.categoryId=cm.categoryId
    WHERE iv.isDeleted=0
    GROUP BY iv.itemVariantId, im.itemName, iv.variantName, bm.brandName, cm.categoryName
    ORDER BY modelName
  `);
  return NextResponse.json(rows);
});
