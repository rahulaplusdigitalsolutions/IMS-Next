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

  const { ColorTypeId, ColorTypeName } = body;
  const name = (ColorTypeName || "").trim();
  if (!name) throw new ApiError(400, "Color type name is required.");

  if (ColorTypeId && ColorTypeId !== "0" && ColorTypeId !== "") {
    await mysqlPool.execute(
      "UPDATE inventorycolortypemaster SET colorTypeName = ? WHERE colorTypeId = ? AND companyGuid = ?",
      [name, ColorTypeId, user.companyId]
    );
  } else {
    await mysqlPool.execute(
      "INSERT INTO inventorycolortypemaster (colorTypeId, companyGuid, colorTypeName) VALUES (?, ?, ?)",
      [uuidv4(), user.companyId, name]
    );
  }
  return NextResponse.json({ message: "Success" });
});
