import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany, ApiError } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);
  requireCompany(user);

  const { PrinterTypeId, PrinterTypeName } = body;
  const name = (PrinterTypeName || "").trim();
  if (!name) throw new ApiError(400, "Printer type name is required.");

  if (PrinterTypeId && PrinterTypeId !== "0" && PrinterTypeId !== "") {
    await mysqlPool.execute(
      "UPDATE inventoryprintertypemaster SET printerTypeName = ? WHERE printerTypeId = ? AND companyGuid = ?",
      [name, PrinterTypeId, user.companyId]
    );
  } else {
    await mysqlPool.execute(
      "INSERT INTO inventoryprintertypemaster (printerTypeId, companyGuid, printerTypeName) VALUES (?, ?, ?)",
      [uuidv4(), user.companyId, name]
    );
  }
  return NextResponse.json({ message: "Success" });
});
