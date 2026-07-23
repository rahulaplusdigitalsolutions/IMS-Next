import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError, hasAllCompaniesAccess } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Transfers inventory (serialized or not) from one company to another.
// The destination company must already have a matching variant in its own
// Item Master (matched by SKU, falling back to item name + variant name) —
// this never auto-creates a variant in the destination company, by design:
// admins must set up the destination catalog themselves first.
export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  authorizeInventory(user, "POST");

  const { sourceCompanyId, destinationCompanyId, itemVariantId, serialIds, quantity, destinationGodownId } = await parseJsonBody(request);

  if (!sourceCompanyId || !destinationCompanyId) throw new ApiError(400, "Source and destination company are required");
  if (sourceCompanyId === destinationCompanyId) throw new ApiError(400, "Source and destination company cannot be the same");
  if (!itemVariantId) throw new ApiError(400, "itemVariantId is required");

  // A user may only move stock between companies they actually have access to.
  if (!hasAllCompaniesAccess(user)) {
    const [access] = await mysqlPool.query(
      "SELECT companyGuid FROM user_companies WHERE userGuid=? AND companyGuid IN (?)",
      [user.userid || user.id, [sourceCompanyId, destinationCompanyId]]
    );
    const accessible = new Set(access.map((r) => r.companyGuid));
    if (!accessible.has(sourceCompanyId) || !accessible.has(destinationCompanyId)) {
      throw new ApiError(403, "You do not have access to one of these companies");
    }
  }

  const [srcRows] = await mysqlPool.query(
    `SELECT itv.itemVariantId, itv.variantName, itv.sku, i.itemName, i.isTrackable
     FROM inventoryitemvariant itv JOIN inventoryitemmaster i ON itv.itemId=i.itemId
     WHERE itv.itemVariantId=? AND itv.companyGuid=? AND itv.isDeleted=0`,
    [itemVariantId, sourceCompanyId]
  );
  if (!srcRows.length) throw new ApiError(404, "Source item variant not found");
  const src = srcRows[0];

  // Match the destination company's equivalent variant — by SKU if the
  // source has one, otherwise by item name + variant name.
  const [dstRows] = src.sku
    ? await mysqlPool.query(
        `SELECT itv.itemVariantId, i.isTrackable FROM inventoryitemvariant itv JOIN inventoryitemmaster i ON itv.itemId=i.itemId
         WHERE itv.companyGuid=? AND itv.isDeleted=0 AND itv.sku=?`,
        [destinationCompanyId, src.sku]
      )
    : await mysqlPool.query(
        `SELECT itv.itemVariantId, i.isTrackable FROM inventoryitemvariant itv JOIN inventoryitemmaster i ON itv.itemId=i.itemId
         WHERE itv.companyGuid=? AND itv.isDeleted=0 AND itv.variantName=? AND i.itemName=?`,
        [destinationCompanyId, src.variantName, src.itemName]
      );
  if (!dstRows.length) {
    throw new ApiError(400, `"${src.itemName} - ${src.variantName}" does not exist in the destination company's Item Master. Please create it there first, then retry the transfer.`);
  }
  const dest = dstRows[0];

  const transferId = randomUUID();
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    if (src.isTrackable) {
      if (!Array.isArray(serialIds) || serialIds.length === 0) throw new ApiError(400, "At least one serial number is required for a serialized item");

      const [serials] = await conn.query(
        "SELECT guid, serialNumber FROM inventorystockinserial WHERE guid IN (?) AND itemVariantId=? AND companyGuid=? AND serialStatus='Available' AND isDeleted=0 FOR UPDATE",
        [serialIds, itemVariantId, sourceCompanyId]
      );
      if (serials.length !== serialIds.length) throw new ApiError(400, "Some serials are not available in the source company for this item");

      await conn.query(
        "UPDATE inventorystockinserial SET companyGuid=?, itemVariantId=?, godownGuid=? WHERE guid IN (?)",
        [destinationCompanyId, dest.itemVariantId, destinationGodownId || null, serialIds]
      );

      for (const s of serials) {
        await conn.query(
          `INSERT INTO companytransferhistory (transferId,fromCompanyGuid,toCompanyGuid,sourceItemVariantId,destItemVariantId,itemName,variantName,isSerialized,serialNumber,transferredBy)
           VALUES (?,?,?,?,?,?,?,1,?,?)`,
          [transferId, sourceCompanyId, destinationCompanyId, itemVariantId, dest.itemVariantId, src.itemName, src.variantName, s.serialNumber, user?.username || "System"]
        );
      }
    } else {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, "A valid quantity is required for a non-serialized item");

      const [stockCheck] = await conn.query(
        "UPDATE inventoryvariantstock SET availablePCS = availablePCS - ? WHERE itemVariantId=? AND availablePCS >= ?",
        [qty, itemVariantId, qty]
      );
      if (stockCheck.affectedRows === 0) {
        const [[stockRow]] = await conn.query("SELECT availablePCS FROM inventoryvariantstock WHERE itemVariantId=?", [itemVariantId]);
        throw new ApiError(400, stockRow ? `Not enough stock — only ${stockRow.availablePCS} available in source company.` : "Stock record not found for this item in source company.");
      }

      await conn.query(
        `INSERT INTO inventoryvariantstock (itemVariantId, availablePCS, avgPurchaseRate, lastPurchaseRate) VALUES (?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE availablePCS = availablePCS + VALUES(availablePCS)`,
        [dest.itemVariantId, qty]
      );

      await conn.query(
        `INSERT INTO companytransferhistory (transferId,fromCompanyGuid,toCompanyGuid,sourceItemVariantId,destItemVariantId,itemName,variantName,isSerialized,quantity,transferredBy)
         VALUES (?,?,?,?,?,?,?,0,?,?)`,
        [transferId, sourceCompanyId, destinationCompanyId, itemVariantId, dest.itemVariantId, src.itemName, src.variantName, qty, user?.username || "System"]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return NextResponse.json({ message: "Inventory transferred successfully", transferId });
});
