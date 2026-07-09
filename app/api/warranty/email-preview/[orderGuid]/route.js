import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { withErrorHandling } from "@/lib/apiResponse";

// Returns rendered email subject/body/to/cc/bcc for a given order
export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeWarranty(user, "GET");
  const { orderGuid } = await params;

  const [orderRows] = await mysqlPool.query(`
    SELECT
      o.guid AS orderGuid, o.orderid AS orderNumber,
      o.orderDate, o.dispatchDate,
      o.platform, o.gemOrderType, o.bidNumber,
      o.customerName AS customer, o.consigneeName,
      o.shippingAddress, o.address, o.buyerAddress,
      o.contactNumber, o.altContactNumber,
      o.invoiceNumber, o.gstNumber,
      oi.sellingPrice, oi.warranty, oi.quantity,
      s.value AS serialValue,
      m.name  AS modelName, m.company AS companyName
    FROM orders o
    LEFT JOIN order_items oi ON oi.orderGuid = o.guid
    LEFT JOIN serials s      ON oi.serialNumberGuid = s.guid
    LEFT JOIN models m       ON s.modelGuid = m.guid
    WHERE o.guid = ?
    LIMIT 1
  `, [orderGuid]);

  if (!orderRows.length) throw new ApiError(404, "Order not found");
  const order = orderRows[0];

  const [allSerialRows] = await mysqlPool.query(`
    SELECT s.value FROM order_items oi
    LEFT JOIN serials s ON oi.serialNumberGuid = s.guid
    WHERE oi.orderGuid = ? AND s.value IS NOT NULL ORDER BY s.value
  `, [orderGuid]);
  order.allSerials = allSerialRows.map((r) => r.value).join(", ");
  order.serialCount = allSerialRows.length || order.quantity || 1;

  const [tplRows] = await mysqlPool.query("SELECT * FROM warranty_template WHERE id=1");
  const template = tplRows[0] || {};

  const wp = order.warranty || "1 Year";
  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
  let expiry = "";
  try {
    const base = new Date(order.dispatchDate || order.orderDate || Date.now());
    const num = parseInt(wp) || 1;
    const isMon = /month/i.test(wp);
    if (isMon) { base.setMonth(base.getMonth() + num); } else { base.setFullYear(base.getFullYear() + num); }
    expiry = fmt(base);
  } catch {}

  const gem = order.bidNumber || order.orderNumber || order.invoiceNumber || "";
  const emailVars = {
    "{{COMPANY_NAME}}": template.companyName || "",
    "{{GEM_NUMBER}}": gem,
    "{{BID_NUMBER}}": gem,
    "{{ORDER_NUMBER}}": String(order.orderNumber || ""),
    "{{INVOICE_NUMBER}}": order.invoiceNumber || "",
    "{{CUSTOMER_NAME}}": order.customer || order.consigneeName || "",
    "{{CONSIGNEE_NAME}}": order.consigneeName || order.customer || "",
    "{{ADDRESS}}": (order.shippingAddress || order.address || order.buyerAddress || "").replace(/\n/g, " "),
    "{{CONTACT_NUMBER}}": order.contactNumber || "",
    "{{MODEL_NAME}}": order.modelName || "",
    "{{SERIAL_NUMBER}}": order.serialValue || "",
    "{{SERIAL_NUMBERS}}": order.allSerials || order.serialValue || "",
    "{{QUANTITY}}": String(order.serialCount || order.quantity || ""),
    "{{PURCHASE_DATE}}": fmt(order.orderDate),
    "{{DISPATCH_DATE}}": fmt(order.dispatchDate) || fmt(order.orderDate),
    "{{WARRANTY_PERIOD}}": wp,
    "{{WARRANTY_EXPIRY}}": expiry,
    "{{GST_NUMBER}}": order.gstNumber || "",
    "{{CERT_NUMBER}}": "WC-" + String(order.orderNumber || "").padStart(6, "0"),
  };

  const fillText = (text) => {
    if (!text) return "";
    let out = text;
    for (const [k, v] of Object.entries(emailVars)) {
      out = out.split(k).join(v || "");
    }
    return out;
  };

  return NextResponse.json({
    to: template.emailTo || "",
    cc: template.emailCc || "",
    bcc: template.emailBcc || "",
    subject: fillText(template.emailSubject || ""),
    body: fillText(template.emailBody || ""),
  });
});
