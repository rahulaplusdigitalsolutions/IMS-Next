import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, requireCompany, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";
import { broadcastRealtimeEvent } from "@/lib/realtimeEvents";

const EDITABLE_FIELDS = [
  "bidNumber", "contractNumber", "generatedDate", "buyerContact", "products", "buyerEmail", "buyerGstin",
  "buyerAddress", "deliveryStartAfter", "deliveryCompletedBy", "ministry", "department", "organisation",
  "officeZone", "sellerCompany", "sellerContact", "sellerGstin", "consigneeDesignation", "consigneeEmail",
  "consigneeContact", "consigneeAddress", "status", "cancelReason", "cancelRemarks",
];

const authorize = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "orders",
    editColumnName: "allow_edit_order_processing",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage contracts.",
  });

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "PUT");
  const { id } = await params;
  const body = await parseJsonBody(request);

  const updates = Object.keys(body).filter((k) => EDITABLE_FIELDS.includes(k));
  if (updates.length === 0) throw new ApiError(400, "No editable fields provided");

  if (updates.includes("contractNumber")) {
    const contractNumber = String(body.contractNumber || "").trim();
    if (!contractNumber) throw new ApiError(400, "Contract Number is required");
    const [dup] = await mysqlPool.query(
      "SELECT guid FROM contracts WHERE contractNumber=? AND companyGuid=? AND guid<>? AND isDeleted=0",
      [contractNumber, user.companyId, id]
    );
    if (dup.length > 0) throw new ApiError(400, "A contract with this Contract Number already exists");
  }

  const setClause = updates.map((k) => `${k}=?`).join(", ");
  const values = updates.map((k) => (body[k] === undefined ? null : body[k]));

  try {
    const [result] = await mysqlPool.query(
      `UPDATE contracts SET ${setClause}, modifiedBy=?, modifiedAt=NOW() WHERE guid=? AND companyGuid=? AND isDeleted=0`,
      [...values, user.username || user.fullName || "Unknown", id, user.companyId]
    );
    if (result.affectedRows === 0) throw new ApiError(404, "Contract not found");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.code === "ER_DUP_ENTRY") throw new ApiError(400, "A contract with this Contract Number already exists");
    throw err;
  }

  broadcastRealtimeEvent(user.companyId, "contracts");
  return NextResponse.json({ message: "Contract updated" });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "DELETE");
  const { id } = await params;

  const [result] = await mysqlPool.query(
    "UPDATE contracts SET isDeleted=1 WHERE guid=? AND companyGuid=?",
    [id, user.companyId]
  );
  if (result.affectedRows === 0) throw new ApiError(404, "Contract not found");

  broadcastRealtimeEvent(user.companyId, "contracts");
  return NextResponse.json({ message: "Contract deleted" });
});
