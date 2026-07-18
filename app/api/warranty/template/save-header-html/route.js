import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireCompany, ApiError } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { logUserActivity } from "@/lib/helpers";
import { cleanHeaderHtml } from "@/lib/warrantyDocx";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Save raw HTML string as header (from textarea paste)
export const PUT = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeWarranty(user, "PUT");

  let { html } = body;
  if (html === undefined) throw new ApiError(400, "html is required");
  html = cleanHeaderHtml(html);
  const [existing] = await mysqlPool.query("SELECT id FROM warranty_template WHERE companyGuid=? LIMIT 1", [user.companyId]);
  if (existing.length === 0) await mysqlPool.query("INSERT INTO warranty_template (companyGuid) VALUES (?)", [user.companyId]);
  await mysqlPool.query("UPDATE warranty_template SET headerHtml=?, headerImagePath=NULL WHERE companyGuid=?", [html || "", user.companyId]);
  await logUserActivity(mysqlPool, user, "Save Warranty Header HTML", [], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Header HTML saved" });
});
