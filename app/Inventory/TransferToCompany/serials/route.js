import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError, hasAllCompaniesAccess } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

async function assertCompanyAccess(user, companyGuid) {
  if (hasAllCompaniesAccess(user)) return;
  const [access] = await mysqlPool.query(
    "SELECT 1 FROM user_companies WHERE userGuid=? AND companyGuid=? LIMIT 1",
    [user.userid || user.id, companyGuid]
  );
  if (!access.length) throw new ApiError(403, "You do not have access to this company");
}

// Lists Available serial numbers for a variant in a given (possibly
// non-active) company — used by the cross-company transfer screen.
export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const { searchParams } = new URL(request.url);
  const companyGuid = searchParams.get("companyGuid");
  const itemVariantId = searchParams.get("itemVariantId");
  if (!companyGuid || !itemVariantId) throw new ApiError(400, "companyGuid and itemVariantId are required");
  await assertCompanyAccess(user, companyGuid);

  const [rows] = await mysqlPool.query(
    "SELECT guid as id, serialNumber FROM inventorystockinserial WHERE itemVariantId=? AND companyGuid=? AND serialStatus='Available' AND isDeleted=0 ORDER BY serialNumber ASC",
    [itemVariantId, companyGuid]
  );

  return NextResponse.json(rows);
});
