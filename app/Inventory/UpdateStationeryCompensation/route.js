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

  const { returnId, isCompensationReceived, compensationAmount, remarks } = body;

  await mysqlPool.execute(`
    UPDATE inventorystationeryreturns
    SET isCompensationReceived = ?,
        compensationAmount = ?,
        remarks = COALESCE(?, remarks)
    WHERE returnId = ?
  `, [isCompensationReceived ? 1 : 0, compensationAmount || 0, remarks || null, returnId]);

  return NextResponse.json({ message: "Success" });
});
