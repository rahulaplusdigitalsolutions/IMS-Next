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
    await connection.execute("UPDATE inventorystockin SET isDeleted = 1 WHERE stockInId = ?", [stockInId]);
    await connection.execute("UPDATE inventorystockindetail SET isDeleted = 1 WHERE stockInId = ?", [stockInId]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Success" });
});
