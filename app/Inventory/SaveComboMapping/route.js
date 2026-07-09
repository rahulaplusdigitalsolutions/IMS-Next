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

  let { parentVariantId, components, comboName } = body;

  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    if (parentVariantId === "NEW") {
      const [items] = await connection.execute("SELECT itemId FROM inventoryitemmaster WHERE itemName = 'SYSTEM_COMBOS' LIMIT 1");
      let itemId;
      if (items.length > 0) {
        itemId = items[0].itemId;
      } else {
        itemId = `ITEM-COMBO-${Date.now()}`;
        await connection.execute(
          "INSERT INTO inventoryitemmaster (itemId, itemName, categoryId, brandId, unitId) VALUES (?, ?, ?, ?, ?)",
          [itemId, "SYSTEM_COMBOS", "054f9306-2128-4ec3-91d7-f941896040a7", "03feb3df-029a-419c-a773-7da61285c341", "UNT-1776263087562"]
        );
      }

      parentVariantId = uuidv4();
      await connection.execute(
        "INSERT INTO inventoryitemvariant (itemVariantId, itemId, variantName, sku) VALUES (?, ?, ?, ?)",
        [parentVariantId, itemId, comboName, `CB-${Date.now()}`]
      );
    } else if (comboName) {
      await connection.execute("UPDATE inventoryitemvariant SET variantName = ? WHERE itemVariantId = ?", [comboName, parentVariantId]);
    }

    await connection.execute("UPDATE inventorycombomapping SET isDeleted = 1 WHERE parentVariantId = ?", [parentVariantId]);

    for (const comp of components) {
      if (comp.childVariantId) {
        await connection.execute(
          "INSERT INTO inventorycombomapping (parentVariantId, childVariantId, quantity) VALUES (?, ?, ?)",
          [parentVariantId, comp.childVariantId, comp.quantity || 1]
        );
      }
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("SQL Transaction Error:", err);
    throw err;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Saved successfully" });
});
