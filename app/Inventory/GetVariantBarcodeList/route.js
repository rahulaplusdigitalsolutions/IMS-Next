import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const itemVariantId = new URL(request.url).searchParams.get("itemVariantId");
  const [rows] = await mysqlPool.query(
    "SELECT barcodeId as BarcodeId, barcode as Barcode, subUnitQty as SubUnitQty FROM inventoryvariantbarcode WHERE itemVariantId = ? AND isDeleted = 0",
    [itemVariantId]
  );
  return NextResponse.json({ message: "Success", data: rows });
});
