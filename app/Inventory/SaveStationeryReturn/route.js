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

  const {
    stockOutId, trackingId, isSameItemReceived, isConditionCorrect,
    originalItemSent, itemReceivedInstead, isCompensationReceived,
    compensationAmount, remarks,
  } = body;

  const connection = await mysqlPool.getConnection();
  let returnId;
  try {
    await connection.beginTransaction();

    returnId = `SR-${Date.now()}`;
    const actor = user?.username || "System";

    await connection.execute(`
      INSERT INTO inventorystationeryreturns (
        returnId, stockOutId, trackingId, isSameItemReceived, isConditionCorrect,
        originalItemSent, itemReceivedInstead, isCompensationReceived,
        compensationAmount, remarks, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      returnId, stockOutId, trackingId || "",
      isSameItemReceived ? 1 : 0,
      isConditionCorrect ? 1 : 0,
      originalItemSent || "",
      itemReceivedInstead || "",
      isCompensationReceived ? 1 : 0,
      compensationAmount || 0,
      remarks || "",
      actor,
    ]);

    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Success", returnId });
});
