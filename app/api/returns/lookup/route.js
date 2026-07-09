import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeReturns } from "@/lib/returnsAuth";
import { mapDispatchRow } from "@/lib/helpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeReturns(user, "GET");

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("serialValue") || searchParams.get("serialNumber") || searchParams.get("serial");
  if (!raw) throw new ApiError(400, "Serial number is required");
  const normalized = raw.trim().toUpperCase();

  const [serials] = await mysqlPool.query(`
    SELECT s.*, m.name as modelName, m.company as companyName,
           lr.reason as latestReturnReason, lr.condition as latestReturnCondition
    FROM serials s LEFT JOIN models m ON s.modelGuid=m.guid
    LEFT JOIN (
      SELECT r1.serialNumberGuid, r1.reason, r1.condition FROM returns r1
      JOIN (SELECT serialNumberGuid, MAX(returnDate) as maxDate, MAX(guid) as maxId FROM returns WHERE isDeleted=0 GROUP BY serialNumberGuid) r2
      ON r1.serialNumberGuid=r2.serialNumberGuid AND r1.returnDate=r2.maxDate AND r1.guid=r2.maxId
    ) lr ON s.guid=lr.serialNumberGuid
    WHERE s.value=? AND s.isDeleted=0
  `, [normalized]);

  if (!serials.length) throw new ApiError(404, "Serial not found");
  const serial = serials[0];

  const [dispatches] = await mysqlPool.query(`
    SELECT oi.guid, oi.serialNumberGuid, oi.modelGuid, oi.sellingPrice, oi.warranty, oi.quantity, oi.contractFilename,
           o.guid as _orderId, o.orderid, o.platform, o.orderDate, o.dispatchDate, o.dispatchedBy, o.status,
           o.gemOrderType, o.bidNumber, o.customerName as customer, o.consigneeName, o.buyerEmail, o.consigneeEmail,
           o.paymentAuthorityEmail, o.shippingAddress, o.address, o.gstNumber, o.contactNumber, o.altContactNumber,
           o.invoiceNumber, o.invoiceFilename, o.ewayBillNumber, o.ewayBillFilename, o.gemBillUploaded,
           o.freightCharges, o.packagingCost, o.commission, o.orderVerified, o.remarks, o.cancellationReason as cancelReason,
           o.cancelledBy, o.cancelledAt, o.isDeleted, o.rowColor, o.tags,
           ol.courierPartner, ol.trackingId, ol.logisticsStatus, ol.logisticsDispatchDate, ol.podFilename, ol.lastDeliveryDate,
           ins.installationRequired, ins.installationStatus, ins.technicianName, ins.technicianContact,
           ins.installationCharges, ins.installationRemarks, ins.scheduledDate, ins.installationDate,
           m.name as modelName, s.value as serialValue
    FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid
    JOIN serials s ON oi.serialNumberGuid=s.guid JOIN models m ON s.modelGuid=m.guid
    LEFT JOIN order_logistics ol ON o.guid=ol.orderGuid LEFT JOIN order_installations ins ON o.guid=ins.orderGuid
    WHERE oi.serialNumberGuid=? AND o.isDeleted=0
    ORDER BY o.dispatchDate DESC, oi.guid DESC LIMIT 1
  `, [serial.guid]);

  const linkedOrder = dispatches[0] || null;
  let existingReturn = null;
  if (linkedOrder) {
    const [ret] = await mysqlPool.query("SELECT * FROM returns WHERE serialNumberGuid=? AND dispatchGuid=? AND isDeleted=0 ORDER BY returnDate DESC, guid DESC LIMIT 1", [serial.guid, linkedOrder.guid]);
    existingReturn = ret[0] || null;
  }

  return NextResponse.json({
    ...serial,
    canReturn: serial.status === "Dispatched" && !!linkedOrder && !existingReturn,
    linkedOrder: linkedOrder ? mapDispatchRow(linkedOrder) : null,
    existingReturnForLinkedOrder: existingReturn,
    smartWarning: serial.returnCount > 0
      ? `This serial was previously returned${serial.latestReturnReason ? ` (Reason: ${serial.latestReturnReason})` : ""}.`
      : null,
  });
});
