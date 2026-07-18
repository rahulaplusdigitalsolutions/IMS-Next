import { NextResponse } from "next/server";
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

  const { stockInId } = body;
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE inventorystockin SET status = 1, finalizedOn = CURRENT_TIMESTAMP WHERE stockInId = ?", [stockInId]);

    const [stockInRows] = await connection.query("SELECT vendorId FROM inventorystockin WHERE stockInId = ?", [stockInId]);
    const stockInVendorId = stockInRows[0]?.vendorId || null;
    const [details] = await connection.query(`
      SELECT d.*, i.useSerialTab
      FROM inventorystockindetail d
      LEFT JOIN inventoryitemvariant v ON d.itemVariantId = v.itemVariantId
      LEFT JOIN inventoryitemmaster i ON v.itemId = i.itemId
      WHERE d.stockInId = ? AND d.isDeleted = 0
    `, [stockInId]);

    for (const item of details) {
      if (item.modelGuid) {
        const [serials] = await connection.query("SELECT serialNumber FROM inventorystockinserial WHERE stockInDetailId = ? AND isDeleted = 0", [item.stockInDetailId]);
        for (const s of serials) {
          await connection.execute(
            "INSERT INTO serials (guid, companyGuid, modelGuid, godownGuid, value, landingPrice, vendorId, stockInId, status, isDeleted, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'Available', 0, NOW())",
            [user.companyId, item.modelGuid, item.godownGuid || null, s.serialNumber, item.purchaseRate || 0, stockInVendorId, stockInId]
          );
        }
      } else if (item.itemVariantId) {
        const [itemSerials] = await connection.query("SELECT serialNumber FROM inventorystockinserial WHERE stockInDetailId = ? AND isDeleted = 0", [item.stockInDetailId]);
        if (item.useSerialTab && itemSerials.length > 0) {
          const [modelLink] = await connection.query(
            "SELECT linkedModelGuid FROM model_approval_requests WHERE variantId = ? AND status = 'approved' AND linkedModelGuid IS NOT NULL AND isDeleted = 0 LIMIT 1",
            [item.itemVariantId]
          );
          const serialModelGuid = modelLink.length > 0 && modelLink[0].linkedModelGuid ? modelLink[0].linkedModelGuid : item.itemVariantId;
          for (const s of itemSerials) {
            await connection.execute(
              "INSERT INTO serials (guid, companyGuid, modelGuid, godownGuid, value, landingPrice, vendorId, stockInId, status, isDeleted, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'Available', 0, NOW())",
              [user.companyId, serialModelGuid, item.godownGuid || null, s.serialNumber, item.purchaseRate || 0, stockInVendorId, stockInId]
            );
          }
        } else {
          const qty = item.stockInQty * item.defaultPcsQty;
          await connection.execute(
            `INSERT INTO inventoryvariantstock (itemVariantId, availablePCS, avgPurchaseRate, lastPurchaseRate) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               avgPurchaseRate = ((availablePCS * avgPurchaseRate) + (VALUES(availablePCS) * VALUES(avgPurchaseRate))) / (availablePCS + VALUES(availablePCS)),
               availablePCS = availablePCS + VALUES(availablePCS),
               lastPurchaseRate = VALUES(lastPurchaseRate)`,
            [item.itemVariantId, qty, item.purchaseRate, item.purchaseRate]
          );
        }
      }
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Success" });
});
