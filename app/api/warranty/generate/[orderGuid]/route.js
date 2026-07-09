import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { uploadDir } from "@/lib/upload";
import { DEFAULT_CERT_HTML, renderTemplate } from "@/lib/warrantyTemplate";
import { withErrorHandling } from "@/lib/apiResponse";

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
    SELECT s.value
    FROM order_items oi
    LEFT JOIN serials s ON oi.serialNumberGuid = s.guid
    WHERE oi.orderGuid = ? AND s.value IS NOT NULL
    ORDER BY s.value
  `, [orderGuid]);
  order.allSerials = allSerialRows.map((r) => r.value).join(", ");
  order.serialCount = allSerialRows.length || order.quantity || 1;

  const [tplRows] = await mysqlPool.query("SELECT * FROM warranty_template WHERE id=1");
  const template = tplRows[0] || {};

  let headerImgUrl = null;
  if (template.headerImagePath) {
    try {
      const imgPath = path.join(uploadDir, template.headerImagePath);
      if (fs.existsSync(imgPath)) {
        const imgBuf = fs.readFileSync(imgPath);
        const ext = path.extname(template.headerImagePath).toLowerCase().slice(1);
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : `image/${ext}`;
        headerImgUrl = `data:${mime};base64,${imgBuf.toString("base64")}`;
      }
    } catch (e) {
      console.warn("[warranty] Could not load header image:", e.message);
    }
  }

  const [existing] = await mysqlPool.query(
    "SELECT guid, htmlContent, status FROM wc_certs WHERE orderGuid=? ORDER BY createdAt DESC LIMIT 1",
    [orderGuid]
  );

  let html, certGuid = null, certStatus = "draft";
  if (existing.length > 0) {
    html = existing[0].htmlContent;
    certGuid = existing[0].guid;
    certStatus = existing[0].status;
  } else {
    const isStale = !template.htmlBody || template.htmlBody.includes("{{HEADER_IMAGE}}");
    const bodyTemplate = isStale ? DEFAULT_CERT_HTML : template.htmlBody;

    if (isStale) {
      mysqlPool.query("UPDATE warranty_template SET htmlBody=?, headerHtml=NULL WHERE id=1", [DEFAULT_CERT_HTML]).catch(() => {});
    }

    const bodyHtml = renderTemplate(bodyTemplate, template, order);

    html = headerImgUrl
      ? `<div style="margin:0;padding:0;line-height:0;font-size:0;width:100%;display:block;">`
        + `<img src="${headerImgUrl}" style="display:block;width:100%;height:auto;border:0;" />`
        + `</div>${bodyHtml}`
      : bodyHtml;
  }

  return NextResponse.json({ orderData: order, html, certGuid, certStatus });
});
