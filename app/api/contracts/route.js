import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, requireCompany, resolveScopedCompanyGuid, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";
import { broadcastRealtimeEvent } from "@/lib/realtimeEvents";

const authorize = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "orders",
    editColumnName: "allow_edit_order_processing",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage contracts.",
  });

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "GET");

  const companyGuid = resolveScopedCompanyGuid(user, request);
  const clause = companyGuid ? "AND companyGuid = ?" : "";
  const params = companyGuid ? [companyGuid] : [];

  const [rows] = await mysqlPool.query(
    `SELECT * FROM contracts WHERE isDeleted=0 ${clause} ORDER BY createdAt DESC`,
    params
  );
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "POST");

  const body = await parseJsonBody(request);
  const {
    bidNumber, contractNumber, generatedDate, buyerContact, products, buyerEmail, buyerGstin,
    buyerAddress, deliveryStartAfter, deliveryCompletedBy, ministry, department, organisation,
    officeZone, sellerCompany, sellerContact, sellerGstin, consigneeDesignation, consigneeEmail,
    consigneeContact, consigneeAddress, pdfFilename,
  } = body;

  if (!contractNumber || !String(contractNumber).trim()) {
    throw new ApiError(400, "Contract Number is required");
  }

  const [dup] = await mysqlPool.query(
    "SELECT guid FROM contracts WHERE contractNumber=? AND companyGuid=? AND isDeleted=0",
    [contractNumber.trim(), user.companyId]
  );
  if (dup.length > 0) throw new ApiError(400, "A contract with this Contract Number already exists");

  const guid = randomUUID();
  try {
    await mysqlPool.query(
      `INSERT INTO contracts (
        guid, companyGuid, bidNumber, contractNumber, generatedDate, buyerContact, products, buyerEmail, buyerGstin,
        buyerAddress, deliveryStartAfter, deliveryCompletedBy, ministry, department, organisation,
        officeZone, sellerCompany, sellerContact, sellerGstin, consigneeDesignation, consigneeEmail,
        consigneeContact, consigneeAddress, pdfFilename, isDeleted, createdBy, modifiedBy
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      [
        guid, user.companyId, bidNumber || null, contractNumber.trim(), generatedDate || null,
        buyerContact || null, products || null, buyerEmail || null, buyerGstin || null,
        buyerAddress || null, deliveryStartAfter || null, deliveryCompletedBy || null,
        ministry || null, department || null, organisation || null, officeZone || null,
        sellerCompany || null, sellerContact || null, sellerGstin || null, consigneeDesignation || null,
        consigneeEmail || null, consigneeContact || null, consigneeAddress || null, pdfFilename || null,
        user.username || user.fullName || "Unknown", user.username || user.fullName || "Unknown",
      ]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw new ApiError(400, "A contract with this Contract Number already exists");
    throw err;
  }

  broadcastRealtimeEvent(user.companyId, "contracts");
  return NextResponse.json({ message: "Contract saved", guid });
});
