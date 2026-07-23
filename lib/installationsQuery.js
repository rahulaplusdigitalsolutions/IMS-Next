export const SELECT_INSTALLATION = `
  SELECT oi.guid as id, oi.serialNumberGuid as serialNumberId, oi.modelGuid as modelId,
    oi.sellingPrice, oi.warranty, oi.quantity, oi.contractFilename,
    o.guid as _orderId, o.orderid, o.platform, o.orderDate, o.dispatchDate, o.dispatchedBy, o.status,
    o.gemOrderType, o.bidNumber, o.customerName as customer, o.consigneeName, o.buyerEmail, o.consigneeEmail,
    o.paymentAuthorityEmail, o.shippingAddress, o.address, o.gstNumber, o.contactNumber, o.altContactNumber,
    o.invoiceNumber, o.invoiceFilename, o.ewayBillNumber, o.ewayBillFilename, o.gemBillUploaded,
    o.freightCharges, o.packagingCost, o.commission, o.orderVerified,
    oi.remarks AS remarks, o.remarks AS orderRemarks, o.cancellationReason as cancelReason,
    o.cancelledBy, o.cancelledAt, o.isDeleted, o.rowColor, o.tags,
    ol.courierPartner, ol.trackingId, ol.logisticsStatus, ol.logisticsDispatchDate, ol.podFilename, ol.lastDeliveryDate,
    ins.installationRequired, ins.installationStatus, ins.technicianName, ins.technicianContact,
    ins.installationCharges, ins.installationRemarks, ins.scheduledDate, ins.installationDate,
    s.serialNumber as serialValue, itv.variantName as modelName, bm.brandName as companyName
  FROM order_items oi
  JOIN orders o ON oi.orderGuid=o.guid
  LEFT JOIN order_logistics ol ON o.guid=ol.orderGuid
  LEFT JOIN order_installations ins ON o.guid=ins.orderGuid
  LEFT JOIN inventorystockinserial s ON oi.serialNumberGuid=s.guid
  LEFT JOIN inventoryitemvariant itv ON s.itemVariantId=itv.itemVariantId
  LEFT JOIN inventoryitemmaster im ON itv.itemId=im.itemId
  LEFT JOIN inventorybrandmaster bm ON im.brandId=bm.brandId
`;

export const INSTALL_REQUIRED_CONDITION = "(ins.installationRequired='Yes' OR ins.installationRequired='true' OR ins.installationRequired='1')";
