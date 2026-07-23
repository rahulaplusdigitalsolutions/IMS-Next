import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);
  requireCompany(user);

  const categoryId = new URL(request.url).searchParams.get("categoryId");
  const [rows] = await mysqlPool.query(`
    SELECT b.brandId, b.brandName
    FROM inventorybrandmaster b
    JOIN inventorycategorybrandmapping m ON b.brandId = m.brandId
    WHERE m.categoryId = ? AND b.isDeleted = 0 AND m.isDeleted = 0 AND b.companyGuid = ?
  `, [categoryId, user.companyId]);
  return NextResponse.json({ data: rows, message: "Success" });
});
