import { otpStore, approvalStore, generateOtp, approvedPage, rejectedPage, expiredPage } from "@/lib/superAdminHelpers";

// Public — no auth. Clicked from the approval email, opened in a plain browser tab.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  const entry = approvalStore.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    approvalStore.delete(token);
    return new Response(expiredPage(), { headers: { "Content-Type": "text/html" } });
  }
  if (entry.status === "rejected") return new Response(rejectedPage(), { headers: { "Content-Type": "text/html" } });
  if (entry.status === "approved") return new Response(approvedPage(), { headers: { "Content-Type": "text/html" } });

  const otp = generateOtp();
  entry.status = "approved";
  entry.otp = otp;
  otpStore.set(String(entry.userId), { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  return new Response(approvedPage(), { headers: { "Content-Type": "text/html" } });
}
