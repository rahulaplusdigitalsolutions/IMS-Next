import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireCompany, ApiError } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtimeEvents";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Converts a Draft order into a real active order. Each draft order_item
// (which has no serialNumberGuid/modelGuid yet, just a quantity) is
// replaced either:
//   - for a serialized model: one order_item row per unit, each pinned to a
//     real, available serial (serials get marked Dispatched), or
//   - for a non-serialized model (stationery/consumables — models.isSerialized
//     = 0): a single order_item row carrying the quantity, with
//     models.stockQuantity decremented instead of touching the serials table.
// Either way the order moves from status 'Draft' to 'Pending' so it shows up
// as an active order.
export const POST = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  const { orderId } = await params;
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, null);

  const body = await parseJsonBody(request);
  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "At least one item selection is required to confirm the order.");
  }

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      "SELECT guid FROM orders WHERE guid = ? AND companyGuid = ? AND status = 'Draft' FOR UPDATE",
      [orderId, user.companyId]
    );
    if (!orderRows.length) {
      throw new ApiError(404, "Draft order not found.");
    }

    for (const item of items) {
      const { draftItemGuid, modelGuid, serialGuids, nonSerialized } = item;
      if (!draftItemGuid || !modelGuid) {
        throw new ApiError(400, "Each item requires a model.");
      }
      if (!nonSerialized && (!Array.isArray(serialGuids) || serialGuids.length === 0)) {
        throw new ApiError(400, "Each serialized item requires at least one serial number.");
      }

      const [draftItemRows] = await conn.query(
        "SELECT sellingPrice, quantity, remarks, contractFilename, warranty FROM order_items WHERE guid = ? AND orderGuid = ? AND companyGuid = ?",
        [draftItemGuid, orderId, user.companyId]
      );
      if (!draftItemRows.length) {
        throw new ApiError(404, `Draft item ${draftItemGuid} not found.`);
      }
      const draftItem = draftItemRows[0];
      const quantity = Number(draftItem.quantity) || 1;

      if (nonSerialized) {
        const [modelRows] = await conn.query(
          "SELECT stockQuantity, isSerialized FROM models WHERE guid = ? AND companyGuid = ? FOR UPDATE",
          [modelGuid, user.companyId]
        );
        if (!modelRows.length) throw new ApiError(404, "Selected model not found.");
        if (modelRows[0].isSerialized) throw new ApiError(400, "Selected model is serialized — pick serial numbers for it instead.");
        if (Number(modelRows[0].stockQuantity) < quantity) {
          throw new ApiError(400, `Not enough stock — only ${modelRows[0].stockQuantity} available for this model.`);
        }

        await conn.query(
          "UPDATE models SET stockQuantity = stockQuantity - ? WHERE guid = ? AND companyGuid = ?",
          [quantity, modelGuid, user.companyId]
        );

        const newItemGuid = randomUUID();
        await conn.query(
          `INSERT INTO order_items
             (guid,companyGuid,orderGuid,modelGuid,sellingPrice,quantity,contractFilename,remarks,warranty)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [newItemGuid, user.companyId, orderId, modelGuid, Number(draftItem.sellingPrice) || 0, quantity, draftItem.contractFilename || null, draftItem.remarks || null, draftItem.warranty || null]
        );

        await conn.query("DELETE FROM order_items WHERE guid = ? AND companyGuid = ?", [draftItemGuid, user.companyId]);
        continue;
      }

      if (serialGuids.length !== quantity) {
        throw new ApiError(400, `Expected ${quantity} serial number(s) for this item, got ${serialGuids.length}.`);
      }
      const perUnitPrice = (Number(draftItem.sellingPrice) || 0) / quantity;

      for (const serialGuid of serialGuids) {
        const [serialRows] = await conn.query(
          "SELECT status, value, modelGuid FROM serials WHERE guid = ? AND companyGuid = ? FOR UPDATE",
          [serialGuid, user.companyId]
        );
        if (!serialRows.length) throw new ApiError(404, `Serial ${serialGuid} not found.`);
        if (serialRows[0].status !== "Available") throw new ApiError(400, `Serial ${serialRows[0].value} is not available.`);
        if (String(serialRows[0].modelGuid) !== String(modelGuid)) {
          throw new ApiError(400, `Serial ${serialRows[0].value} does not belong to the selected model.`);
        }

        await conn.query("UPDATE serials SET status = 'Dispatched' WHERE guid = ? AND companyGuid = ?", [serialGuid, user.companyId]);

        const newItemGuid = randomUUID();
        await conn.query(
          `INSERT INTO order_items
             (guid,companyGuid,orderGuid,serialNumberGuid,modelGuid,sellingPrice,contractFilename,remarks,warranty)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [newItemGuid, user.companyId, orderId, serialGuid, modelGuid, perUnitPrice, draftItem.contractFilename || null, draftItem.remarks || null, draftItem.warranty || null]
        );

        await conn.query(
          `INSERT INTO serialmovements
             (guid,companyGuid,serialNumberGuid,serialValue,dispatchGuid,actionType,status,createdBy,notes,createdAt)
           VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
          [randomUUID(), user.companyId, serialGuid, serialRows[0].value, newItemGuid, "Dispatched", "Dispatched", user.username || "System", `Assigned from draft order #${orderId}`]
        );
      }

      await conn.query("DELETE FROM order_items WHERE guid = ? AND companyGuid = ?", [draftItemGuid, user.companyId]);
    }

    await conn.query(
      "UPDATE orders SET status = 'Pending', dispatchedBy = ?, dispatchDate = NOW() WHERE guid = ? AND companyGuid = ?",
      [user.username || "System", orderId, user.companyId]
    );

    await conn.commit();
    broadcastRealtimeEvent(user.companyId, "orders");
    return NextResponse.json({ message: "Order confirmed and moved to active orders." }, { status: 200 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});
