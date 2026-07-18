import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
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

  const { CategoryId, CategoryName } = body;
  if (CategoryId && CategoryId !== "0" && CategoryId !== 0 && CategoryId !== "") {
    await mysqlPool.execute("UPDATE inventorycategorymaster SET categoryName = ? WHERE categoryId = ? AND companyGuid = ?", [CategoryName, CategoryId, user.companyId]);
  } else {
    await mysqlPool.execute("INSERT INTO inventorycategorymaster (categoryId, companyGuid, categoryName) VALUES (?, ?, ?)", [uuidv4(), user.companyId, CategoryName]);
  }
  return NextResponse.json({ message: "Success" });
});
