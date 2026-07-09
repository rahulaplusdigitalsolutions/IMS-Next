import { NextResponse } from "next/server";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { sendTestEmail } from "@/lib/mailer";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);

  const to = body.to || user.email;
  if (!to) throw new ApiError(400, "No email address. Set email in your profile first.");
  try {
    await sendTestEmail({ to });
    return NextResponse.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    return NextResponse.json({ message: `Failed: ${err.message}` }, { status: 500 });
  }
});
