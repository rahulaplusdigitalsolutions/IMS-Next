import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const { ItemVariantId, ItemId, VariantCode } = body;
  if (ItemVariantId && ItemVariantId !== "0" && ItemVariantId !== "") {
    await mysqlPool.execute("UPDATE inventoryitemvariant SET variantName = ? WHERE itemVariantId = ?", [VariantCode, ItemVariantId]);
  } else {
    await mysqlPool.execute("INSERT INTO inventoryitemvariant (itemVariantId, itemId, variantName) VALUES (?, ?, ?)", [uuidv4(), ItemId, VariantCode]);
  }

  // Only serialized items (printers etc.) belong in the Models approval flow —
  // non-serialized items (e.g. stationery) are tracked purely by quantity.
  const [parentItem] = await mysqlPool.query("SELECT useSerialTab FROM inventoryitemmaster WHERE itemId = ?", [ItemId]);
  const isSerializedItem = !!parentItem[0]?.useSerialTab;

  const [existingModel] = isSerializedItem
    ? await mysqlPool.query("SELECT guid FROM models WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND isDeleted = 0", [VariantCode])
    : [[]];

  if (isSerializedItem && existingModel.length === 0) {
    const lockConn = await mysqlPool.getConnection();
    try {
      await lockConn.beginTransaction();
      const [existingRequest] = await lockConn.query(
        "SELECT guid FROM model_approval_requests WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND status = 'pending' AND isDeleted = 0 FOR UPDATE",
        [VariantCode]
      );

      let shouldNotify = false;
      let notifyRequestedBy = null;

      if (existingRequest.length === 0) {
        const [itemRows] = await lockConn.query(
          `SELECT i.itemName, b.brandName, c.categoryName
           FROM inventoryitemmaster i
           LEFT JOIN inventorybrandmaster b ON i.brandId = b.brandId
           LEFT JOIN inventorycategorymaster c ON i.categoryId = c.categoryId
           WHERE i.itemId = ?`,
          [ItemId]
        );

        if (itemRows.length > 0) {
          const company = itemRows[0].brandName;
          const category = itemRows[0].categoryName;
          const categoryNameLower = (category || "").toLowerCase();
          const isMonitor = categoryNameLower.includes("monitor") || categoryNameLower.includes("display") || categoryNameLower.includes("screen");
          const isPC = categoryNameLower.includes("pc") || categoryNameLower.includes("computer") || categoryNameLower.includes("laptop") || categoryNameLower.includes("computing")
            || categoryNameLower.includes("aio") || categoryNameLower.includes("all in one") || categoryNameLower.includes("all-in-one")
            || categoryNameLower.includes("desktop") || categoryNameLower.includes("tower");
          const mainCategory = isMonitor ? "Monitor" : isPC ? "PC" : "Printer";
          const description = `Automatically requested from Item Variant Master for item: ${itemRows[0].itemName}`;
          const requestedBy = user?.username || "System";
          const requestedByGuid = user?.userid ? String(user.userid) : null;
          const requestGuid = uuidv4();

          let resolvedVariantId = ItemVariantId && ItemVariantId !== "0" && ItemVariantId !== "" ? ItemVariantId : null;
          if (!resolvedVariantId) {
            const [newVar] = await lockConn.query(
              "SELECT itemVariantId FROM inventoryitemvariant WHERE itemId = ? AND variantName = ? AND isDeleted = 0 ORDER BY itemVariantId DESC LIMIT 1",
              [ItemId, VariantCode]
            );
            resolvedVariantId = newVar[0]?.itemVariantId || null;
          }

          await lockConn.query(
            `INSERT INTO model_approval_requests
              (guid, name, company, category, colorType, printerType, description, mrp, mainCategory, cpu, ram, ssdHdd, requestedBy, requestedByGuid, status, serialNumber, landingPrice, landingPriceReason, godownGuid, variantId)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?,?)`,
            [
              requestGuid, VariantCode.trim(), company || null, category || null,
              "Monochrome", "Multi-Function",
              description || null, 0, mainCategory,
              null, null, null,
              requestedBy, requestedByGuid,
              null, 0, null, null,
              resolvedVariantId,
            ]
          );

          shouldNotify = true;
          notifyRequestedBy = requestedBy;
        }
      }

      await lockConn.commit();

      if (shouldNotify) {
        await createNotification(mysqlPool, {
          targetRole: "Admin",
          title: "New Model Approval Request",
          message: `${notifyRequestedBy} requested to add model "${VariantCode.trim()}" via Item Variant Master.`,
          type: "info",
          priority: "low",
          link: "/models?tab=approvals",
        });
      }
    } catch (e) {
      await lockConn.rollback();
      throw e;
    } finally {
      lockConn.release();
    }
  }

  return NextResponse.json({ message: "Success" });
});
