import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin, approvalStore } from "@/lib/superAdminHelpers";
import { sendApprovalEmail } from "@/lib/mailer";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const emailConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  const userEmail = user.email;
  if (!emailConfigured || !userEmail) return NextResponse.json({ notConfigured: true });

  const body = await parseJsonBody(request);
  const token = uuidv4();
  const action = body.action || "Destructive action";
  approvalStore.set(token, {
    userId: String(user.id),
    action,
    status: "pending",
    otp: null,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;
  try {
    await sendApprovalEmail({
      to: userEmail,
      action,
      approveUrl: `${base}/api/admin/approve-otp?token=${token}`,
      rejectUrl: `${base}/api/admin/reject-otp?token=${token}`,
    });
    return NextResponse.json({ approvalToken: token });
  } catch (mailErr) {
    approvalStore.delete(token);
    console.error("[superAdmin] approval email error:", mailErr.message);
    return NextResponse.json({ message: "Failed to send approval email: " + mailErr.message }, { status: 500 });
  }
});
