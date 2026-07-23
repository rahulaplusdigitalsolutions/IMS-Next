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

  const { searchParams } = new URL(request.url);
  const itemVariantId = searchParams.get("itemVariantId");
  if (!itemVariantId) {
    return NextResponse.json({ message: "itemVariantId is required" }, { status: 400 });
  }

  const [rows] = await mysqlPool.query(
    "SELECT guid, serialNumber as value, serialStatus as status, landingPrice, createdAt FROM inventorystockinserial WHERE itemVariantId = ? AND isDeleted = 0 AND companyGuid = ? ORDER BY createdAt DESC",
    [itemVariantId, user.companyId]
  );

  const [[stockRow]] = await mysqlPool.query(
    "SELECT lastPurchaseRate FROM inventoryvariantstock s JOIN inventoryitemvariant v ON s.itemVariantId = v.itemVariantId WHERE s.itemVariantId = ? AND v.companyGuid = ?",
    [itemVariantId, user.companyId]
  );

  return NextResponse.json({ data: rows, total: rows.length, lastPurchaseRate: stockRow?.lastPurchaseRate || 0, message: "Success" });
});
