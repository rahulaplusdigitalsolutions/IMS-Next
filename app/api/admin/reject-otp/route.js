import { approvalStore, rejectedPage, expiredPage, alreadyProcessedPage } from "@/lib/superAdminHelpers";

// Public — no auth. Clicked from the approval email, opened in a plain browser tab.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  const entry = approvalStore.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    approvalStore.delete(token);
    return new Response(expiredPage(), { headers: { "Content-Type": "text/html" } });
  }
  if (entry.status !== "pending") {
    return new Response(alreadyProcessedPage(entry.status), { headers: { "Content-Type": "text/html" } });
  }
  entry.status = "rejected";
  return new Response(rejectedPage(), { headers: { "Content-Type": "text/html" } });
}
