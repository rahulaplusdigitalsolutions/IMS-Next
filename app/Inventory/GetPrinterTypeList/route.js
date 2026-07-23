import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);
  requireCompany(user);

  const [rows] = await mysqlPool.query(
    "SELECT printerTypeId, printerTypeName FROM inventoryprintertypemaster WHERE isDeleted = 0 AND companyGuid = ? ORDER BY printerTypeName ASC",
    [user.companyId]
  );
  return NextResponse.json({ data: rows, message: "Success" });
});
