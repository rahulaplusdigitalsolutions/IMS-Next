import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);
  requireCompany(user);

  const { ItemVariantId, ItemId, VariantCode, Mrp } = body;
  const safeMrp = Mrp !== undefined && Mrp !== null && Mrp !== "" ? Number(Mrp) : null;
  if (ItemVariantId && ItemVariantId !== "0" && ItemVariantId !== "") {
    if (safeMrp !== null) {
      await mysqlPool.execute("UPDATE inventoryitemvariant SET variantName = ?, sellingPrice = ? WHERE itemVariantId = ? AND companyGuid = ?", [VariantCode, safeMrp, ItemVariantId, user.companyId]);
    } else {
      await mysqlPool.execute("UPDATE inventoryitemvariant SET variantName = ? WHERE itemVariantId = ? AND companyGuid = ?", [VariantCode, ItemVariantId, user.companyId]);
    }
  } else {
    await mysqlPool.execute("INSERT INTO inventoryitemvariant (itemVariantId, companyGuid, itemId, variantName, sellingPrice) VALUES (?, ?, ?, ?, ?)", [uuidv4(), user.companyId, ItemId, VariantCode, safeMrp || 0]);
  }

  return NextResponse.json({ message: "Success" });
});
