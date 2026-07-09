import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const { ItemId, CategoryId, BrandId, ItemName, ItemCode, HsnCode, HSNCode, UnitId, IsTrackable, UseSerialTab } = body;
  const finalHsnCode = HsnCode || HSNCode || "";
  if (ItemId && ItemId !== "0" && ItemId !== "") {
    await mysqlPool.execute(
      "UPDATE inventoryitemmaster SET categoryId=?, brandId=?, itemName=?, itemCode=?, hsnCode=?, unitId=?, isTrackable=?, useSerialTab=? WHERE itemId=?",
      [CategoryId, BrandId, ItemName, ItemCode, finalHsnCode, UnitId, IsTrackable ? 1 : 0, UseSerialTab ? 1 : 0, ItemId]
    );
  } else {
    await mysqlPool.execute(
      "INSERT INTO inventoryitemmaster (itemId, categoryId, brandId, itemName, itemCode, hsnCode, unitId, isTrackable, useSerialTab) VALUES (?,?,?,?,?,?,?,?,?)",
      [uuidv4(), CategoryId, BrandId, ItemName, ItemCode, finalHsnCode, UnitId, IsTrackable ? 1 : 0, UseSerialTab ? 1 : 0]
    );
  }
  return NextResponse.json({ message: "Success" });
});
