import fs from "fs";
import path from "path";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { uploadDir } from "@/lib/upload";
import { buildGatepassHtml } from "@/lib/gatepassHtml";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  const { orderGuid } = await params;

  const [orderRows] = await mysqlPool.query(`
    SELECT o.guid, o.orderid, o.platform, o.gemOrderType, o.bidNumber,
           o.customerName, o.consigneeName, o.shippingAddress, o.address, o.buyerAddress,
           o.contactNumber, o.invoiceNumber, o.orderDate, o.dispatchDate
    FROM orders o
    WHERE o.guid = ?
    LIMIT 1
  `, [orderGuid]);

  if (!orderRows.length) throw new ApiError(404, "Order not found");
  const order = orderRows[0];

  const [items] = await mysqlPool.query(`
    SELECT oi.sellingPrice, oi.quantity,
           s.value AS serialValue,
           m.name  AS modelName, m.company AS companyName
    FROM order_items oi
    LEFT JOIN serials s ON oi.serialNumberGuid = s.guid
    LEFT JOIN models  m ON s.modelGuid = m.guid
    WHERE oi.orderGuid = ?
    ORDER BY oi.guid ASC
  `, [orderGuid]);

  let logoDataUrl = null;
  let companyName = null;
  try {
    const [tpl] = await mysqlPool.query("SELECT companyName FROM warranty_template WHERE id=1");
    if (tpl[0]) companyName = tpl[0].companyName || null;
  } catch {}
  try {
    const logoPath = path.join(uploadDir, "aplus.png");
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    }
  } catch {}

  const html = buildGatepassHtml(order, items, logoDataUrl, companyName);
  const printHtml = html.replace("</body>", "<script>setTimeout(() => { window.print(); }, 500);</script></body>");

  return new Response(printHtml, { headers: { "Content-Type": "text/html" } });
});
