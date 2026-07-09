import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const {
    VendorId,
    VendorFirmName,
    VendorContactPerson = "",
    VendorContactNo = "",
    VendorEmail = "",
    VendorGST = "",
    VendorAddress = "",
  } = body;

  if (VendorId && VendorId !== "0" && VendorId !== "") {
    await mysqlPool.execute(
      "UPDATE inventoryvendor SET vendorFirmName = ?, vendorContactPerson = ?, vendorContactNo = ?, vendorEmail = ?, vendorGST = ?, vendorAddress = ? WHERE vendorId = ?",
      [VendorFirmName, VendorContactPerson, VendorContactNo, VendorEmail, VendorGST, VendorAddress, VendorId]
    );
  } else {
    const id = uuidv4();
    await mysqlPool.execute(
      "INSERT INTO inventoryvendor (vendorId, vendorFirmName, vendorContactPerson, vendorContactNo, vendorEmail, vendorGST, vendorAddress, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [id, VendorFirmName, VendorContactPerson, VendorContactNo, VendorEmail, VendorGST, VendorAddress]
    );
  }
  return NextResponse.json({ message: "Success" });
});
