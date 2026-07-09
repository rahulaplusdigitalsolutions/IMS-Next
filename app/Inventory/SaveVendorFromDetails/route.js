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

  const {
    VendorId, VendorName, VendorFirmName, VendorGstin, VendorMobile, VendorAlternateMobile,
    VendorEmail, VendorAddress, VendorState, VendorPincode, VendorBankName, VendorBankAccountName,
    VendorBankAccountNumber, VendorBankIfsc, DealingCategoryIds, VendorDealingItems,
  } = body;

  const catsStr = Array.isArray(DealingCategoryIds) ? DealingCategoryIds.join(",") : DealingCategoryIds;

  try {
    if (VendorId && VendorId !== "0" && VendorId !== "") {
      await mysqlPool.execute(
        `UPDATE inventoryvendor SET
          vendorName = ?, vendorFirmName = ?, vendorGSTIN = ?, vendorMobile = ?,
          vendorAlternateMobile = ?, vendorEmail = ?, vendorAddress = ?, vendorState = ?,
          vendorPincode = ?, vendorBankName = ?, vendorBankAccountName = ?,
          vendorBankAccountNumber = ?, vendorBankIFSC = ?,
          vendorDealingCategories = ?, vendorDealingItems = ?
        WHERE vendorId = ?`,
        [
          VendorName || "", VendorFirmName || "", VendorGstin || "", VendorMobile || "",
          VendorAlternateMobile || "", VendorEmail || "", VendorAddress || "", VendorState || "",
          VendorPincode || "", VendorBankName || "", VendorBankAccountName || "",
          VendorBankAccountNumber || "", VendorBankIfsc || "",
          catsStr || "", VendorDealingItems || "", VendorId,
        ]
      );
    } else {
      const id = uuidv4();
      await mysqlPool.execute(
        `INSERT INTO inventoryvendor (
          vendorId, vendorName, vendorFirmName, vendorGSTIN, vendorMobile,
          vendorAlternateMobile, vendorEmail, vendorAddress, vendorState,
          vendorPincode, vendorBankName, vendorBankAccountName,
          vendorBankAccountNumber, vendorBankIFSC,
          vendorDealingCategories, vendorDealingItems, isDeleted
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 0)`,
        [
          id, VendorName || "", VendorFirmName || "", VendorGstin || "", VendorMobile || "",
          VendorAlternateMobile || "", VendorEmail || "", VendorAddress || "", VendorState || "",
          VendorPincode || "", VendorBankName || "", VendorBankAccountName || "",
          VendorBankAccountNumber || "", VendorBankIfsc || "",
          catsStr || "", VendorDealingItems || "",
        ]
      );
    }
  } catch (err) {
    console.error("Error saving vendor details:", err);
    throw new ApiError(500, err.message);
  }
  return NextResponse.json({ message: "Success" });
});
