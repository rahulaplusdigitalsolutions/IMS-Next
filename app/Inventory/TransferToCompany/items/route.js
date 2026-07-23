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

// Lists Item Master variants for a given (possibly non-active) company, with
// live available-stock counts — used by the cross-company transfer screen to
// pick a source item, independent of the requester's own active company.
export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const companyGuid = new URL(request.url).searchParams.get("companyGuid");
  if (!companyGuid) throw new ApiError(400, "companyGuid is required");
  await assertCompanyAccess(user, companyGuid);

  const [rows] = await mysqlPool.query(`
    SELECT v.itemVariantId, v.variantName, v.sku, i.itemName, i.isTrackable,
      IF(i.isTrackable, IFNULL(sc.availableCount, 0), IFNULL(s.availablePCS, 0)) as availableCount
    FROM inventoryitemvariant v
    JOIN inventoryitemmaster i ON v.itemId = i.itemId
    LEFT JOIN inventoryvariantstock s ON v.itemVariantId = s.itemVariantId
    LEFT JOIN (
      SELECT itemVariantId, COUNT(*) as availableCount FROM inventorystockinserial
      WHERE serialStatus = 'Available' AND isDeleted = 0 GROUP BY itemVariantId
    ) sc ON v.itemVariantId = sc.itemVariantId
    WHERE v.isDeleted = 0 AND v.companyGuid = ?
    ORDER BY i.itemName ASC, v.variantName ASC
  `, [companyGuid]);

  return NextResponse.json(rows);
});
