import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeWarranty } from "@/lib/warrantyAuth";
import { logUserActivity } from "@/lib/helpers";
import { cleanHeaderHtml } from "@/lib/warrantyDocx";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Save raw HTML string as header (from textarea paste)
export const PUT = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeWarranty(user, "PUT");

  let { html } = body;
  if (html === undefined) throw new ApiError(400, "html is required");
  html = cleanHeaderHtml(html);
  await mysqlPool.query("UPDATE warranty_template SET headerHtml=?, headerImagePath=NULL WHERE id=1", [html || ""]);
  await logUserActivity(mysqlPool, user, "Save Warranty Header HTML", [], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Header HTML saved" });
});
