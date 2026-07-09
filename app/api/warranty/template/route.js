import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeWarranty(user, "GET");

  const [rows] = await mysqlPool.query("SELECT * FROM warranty_template WHERE id=1");
  return NextResponse.json(rows[0] || {});
});

// Accepts any combination of: htmlBody, docxRawText, docxFileName, docxBase64
export const PUT = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeWarranty(user, "PUT");

  const { htmlBody, docxRawText, docxFileName, docxBase64, clearHeader,
    emailSubject, emailBody, emailTo, emailCc, emailBcc } = body;

  const setClauses = [];
  const sqlParams = [];

  if (htmlBody !== undefined) { setClauses.push("htmlBody=?"); sqlParams.push(htmlBody); }
  if (docxRawText !== undefined) { setClauses.push("docxRawText=?"); sqlParams.push(docxRawText); }
  if (docxFileName !== undefined) { setClauses.push("docxFileName=?"); sqlParams.push(docxFileName); }
  if (docxBase64 !== undefined) {
    setClauses.push("docxBinary=?");
    sqlParams.push(docxBase64 ? Buffer.from(docxBase64, "base64") : null);
  }
  if (emailSubject !== undefined) { setClauses.push("emailSubject=?"); sqlParams.push(emailSubject); }
  if (emailBody !== undefined) { setClauses.push("emailBody=?"); sqlParams.push(emailBody); }
  if (emailTo !== undefined) { setClauses.push("emailTo=?"); sqlParams.push(emailTo); }
  if (emailCc !== undefined) { setClauses.push("emailCc=?"); sqlParams.push(emailCc); }
  if (emailBcc !== undefined) { setClauses.push("emailBcc=?"); sqlParams.push(emailBcc); }
  if (clearHeader) {
    setClauses.push("headerImagePath=?");
    sqlParams.push(null);
    setClauses.push("headerHtml=?");
    sqlParams.push(null);
  }

  if (setClauses.length > 0) {
    sqlParams.push(1); // WHERE id=1
    await mysqlPool.query(`UPDATE warranty_template SET ${setClauses.join(",")} WHERE id=1`, sqlParams);
  }

  await logUserActivity(mysqlPool, user, "Update Warranty Template", [], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Template updated" });
});
