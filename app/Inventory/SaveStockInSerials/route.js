import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const { stockInDetailId, itemVariantId, serialNumbers } = body;

  const dedupedInput = new Set(serialNumbers);
  if (dedupedInput.size !== serialNumbers.length) {
    throw new ApiError(400, "Duplicate serial numbers within the submitted batch");
  }

  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    try {
      for (const sn of serialNumbers) {
        const [dupStockIn] = await connection.query("SELECT serialNumber FROM inventorystockinserial WHERE serialNumber = ? AND isDeleted = 0 FOR UPDATE", [sn]);
        if (dupStockIn.length > 0) throw new Error(`Serial Number ${sn} already exists`);
      }

      for (const sn of serialNumbers) {
        await connection.execute("INSERT INTO inventorystockinserial (serialId, stockInDetailId, itemVariantId, serialNumber) VALUES (?, ?, ?, ?)", [uuidv4(), stockInDetailId, itemVariantId || null, sn]);
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return NextResponse.json({ message: "One or more serial numbers already exist" }, { status: 400 });
    return NextResponse.json({ message: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Saved Successfully" });
});
