import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request, { params }) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, body);
  requireAuth(user);
  const { id } = await params;

  const { amount, utrId, paymentDate } = body;
  const [orderCheck] = await mysqlPool.query("SELECT guid FROM bulkorders WHERE guid=?", [id]);
  if (!orderCheck.length) throw new ApiError(404, "Bulk order not found");

  await mysqlPool.query("INSERT INTO bulkorderpayments (orderGuid,amount,utrId,paymentDate) VALUES (?,?,?,?)", [id, amount, utrId, paymentDate ? new Date(paymentDate) : new Date()]);
  await mysqlPool.query("UPDATE bulkorders SET status='Completed' WHERE guid=?", [id]);
  return NextResponse.json({ message: "Consolidated payment recorded successfully" });
});
