import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { syncBrandInCompanyDropdown } from "@/lib/inventoryBrandDropdownSync";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);
  requireCompany(user);

  const { BrandId, BrandName, ShowInModels } = body;
  const showInModels = ShowInModels ? 1 : 0;
  if (BrandId && BrandId !== "0" && BrandId !== "") {
    await mysqlPool.execute("UPDATE inventorybrandmaster SET brandName = ?, showInModels = ? WHERE brandId = ? AND companyGuid = ?", [BrandName, showInModels, BrandId, user.companyId]);
  } else {
    await mysqlPool.execute("INSERT INTO inventorybrandmaster (brandId, companyGuid, brandName, showInModels) VALUES (?, ?, ?, ?)", [uuidv4(), user.companyId, BrandName, showInModels]);
  }
  await syncBrandInCompanyDropdown(mysqlPool, BrandName, !!showInModels);
  return NextResponse.json({ message: "Success" });
});
