import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeSerials as authorize } from "@/lib/serialsAuth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorize(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT s.*, s.guid as id, s.modelGuid as modelId,
      COALESCE(m.name, itv.variantName, 'Unknown Item') as modelName,
      COALESCE(m.company, b.brandName, '') as companyName,
      COALESCE(m.category, c.categoryName, '') as modelCategory,
      g.godownName, g.godownAddress, g.godownName as warehouseName,
      g.godownAddress as warehouseAddress, s.godownGuid as warehouseGuid,
      iv.vendorFirmName as vendorName,
      lr.reason as latestReturnReason, lr.returnDate as latestReturnDate, lr.condition as latestReturnCondition
    FROM serials s
    LEFT JOIN models m ON s.modelGuid=m.guid AND m.isDeleted=0
    LEFT JOIN inventoryitemvariant itv ON s.modelGuid=itv.itemVariantId AND itv.isDeleted=0
    LEFT JOIN inventoryitemmaster i ON itv.itemId=i.itemId AND i.isDeleted=0
    LEFT JOIN inventorybrandmaster b ON i.brandId=b.brandId AND b.isDeleted=0
    LEFT JOIN inventorycategorymaster c ON i.categoryId=c.categoryId AND c.isDeleted=0
    LEFT JOIN godowns g ON s.godownGuid=g.guid AND g.isDeleted=0
    LEFT JOIN inventoryvendor iv ON s.vendorId=iv.vendorId AND iv.isDeleted=0
    LEFT JOIN (
      SELECT r1.* FROM returns r1
      INNER JOIN (
        SELECT serialNumberGuid, MAX(returnDate) as maxDate, MAX(guid) as maxId FROM returns WHERE isDeleted=0 GROUP BY serialNumberGuid
      ) r2 ON r1.serialNumberGuid=r2.serialNumberGuid AND r1.returnDate=r2.maxDate AND r1.guid=r2.maxId
    ) lr ON s.guid=lr.serialNumberGuid
    WHERE s.isDeleted=0
    ORDER BY s.createdAt DESC, s.guid DESC
  `);
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorize(user, "POST");

  const body = await parseJsonBody(request);
  const { modelId, value, status, landingPrice, landingPriceReason } = body;
  const godownGuid = body.godownGuid || body.warehouseGuid || null;

  const [check] = await mysqlPool.query("SELECT guid FROM serials WHERE value=? AND isDeleted=0", [value]);
  if (check.length > 0) throw new ApiError(400, "Serial exists!");

  await mysqlPool.query(
    "INSERT INTO serials (guid,modelGuid,godownGuid,value,status,landingPrice,landingPriceReason,isDeleted,createdAt) VALUES (UUID(),?,?,?,?,?,?,0,NOW())",
    [modelId, godownGuid, value, status || "Available", landingPrice || 0, landingPriceReason || null]
  );
  await logUserActivity(mysqlPool, user, "Add Serial", [{ field: "serialNumber", newValue: value }, { field: "modelId", newValue: modelId }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Serial added" });
});
