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

  const { printerTypeId } = body;
  await mysqlPool.execute("UPDATE inventoryprintertypemaster SET isDeleted = 1 WHERE printerTypeId = ? AND companyGuid = ?", [printerTypeId, user.companyId]);
  return NextResponse.json({ message: "Success" });
});
