import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany, ApiError } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  requireCompany(user);
  const { guid } = await params;

  const { reason } = await parseJsonBody(request);
  const [rows] = await mysqlPool.query("SELECT * FROM model_approval_requests WHERE guid=? AND isDeleted=0", [guid]);
  if (!rows.length) throw new ApiError(404, "Request not found.");
  const r = rows[0];
  if (r.status !== "pending") throw new ApiError(400, "This request is not pending.");

  const approver = user?.username || "Admin";
  await mysqlPool.query(
    "UPDATE model_approval_requests SET status='rejected', approvedBy=?, approvedAt=NOW(), rejectionReason=? WHERE guid=?",
    [approver, reason || "No reason provided", guid]
  );

  if (r.requestedByGuid) {
    await createNotification(mysqlPool, {
      targetUserGuid: r.requestedByGuid,
      title: "Model Request Rejected",
      message: `Your request to add model "${r.name}" was rejected. Reason: ${reason || "No reason provided"}.`,
      type: "warning",
      priority: "low",
      link: "/models",
      companyGuid: user.companyId,
    });
  }

  return NextResponse.json({ message: `Request for "${r.name}" rejected.` });
});
