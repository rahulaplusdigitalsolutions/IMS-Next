import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const { stockInId } = body;
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

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
          const [check] = await connection.query("SELECT status FROM serials WHERE value = ? AND isDeleted = 0 LIMIT 1", [s.serialNumber]);
          if (check.length > 0 && check[0].status !== "Available") {
            throw new Error(`Cannot revert: Serial ${s.serialNumber} is already ${check[0].status}.`);
          }
          await connection.execute("DELETE FROM serials WHERE value = ? AND isDeleted = 0", [s.serialNumber]);
        }
      } else if (item.itemVariantId) {
        const [itemSerials] = await connection.query("SELECT serialNumber FROM inventorystockinserial WHERE stockInDetailId = ? AND isDeleted = 0", [item.stockInDetailId]);
        if (item.useSerialTab && itemSerials.length > 0) {
          for (const s of itemSerials) {
            const [check] = await connection.query("SELECT status FROM serials WHERE value = ? AND isDeleted = 0 LIMIT 1", [s.serialNumber]);
            if (check.length > 0 && check[0].status !== "Available") {
              throw new Error(`Cannot revert: Serial ${s.serialNumber} is already ${check[0].status}.`);
            }
            await connection.execute("DELETE FROM serials WHERE value = ? AND isDeleted = 0", [s.serialNumber]);
          }
        } else {
          const qty = item.stockInQty * item.defaultPcsQty;
          const [result] = await connection.execute(
            "UPDATE inventoryvariantstock SET availablePCS = availablePCS - ? WHERE itemVariantId = ? AND availablePCS >= ?",
            [qty, item.itemVariantId, qty]
          );
          if (result.affectedRows === 0) {
            const [[stockRow]] = await connection.query("SELECT availablePCS FROM inventoryvariantstock WHERE itemVariantId = ?", [item.itemVariantId]);
            throw new Error(stockRow
              ? `Cannot revert: available stock (${stockRow.availablePCS}) is less than the stock-in quantity (${qty}) — some may have already been issued.`
              : `Stock record not found for item variant ${item.itemVariantId}`);
          }
        }
      }
    }

    await connection.execute("UPDATE inventorystockin SET status = 0, finalizedOn = NULL WHERE stockInId = ?", [stockInId]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Success" });
});
