import { requireAuth, isSuperUser, ApiError } from "@/lib/auth";

// Bespoke (not authorizeReadWrite) because each method has a distinct denial
// message. Read: "returns" permission. Write: allow_edit_returns edit-flag.
// Delete: Admin-only.
export function authorizeReturns(user, method) {
  requireAuth(user);
  const m = method.toUpperCase();
  if (isSuperUser(user.role)) return;
  if (["GET", "HEAD", "OPTIONS"].includes(m)) {
    if (!user.permissions?.includes("returns")) throw new ApiError(403, "You do not have access to returns.");
    return;
  }
  if (m === "DELETE") {
    throw new ApiError(403, "Only Admin can delete return records.");
  }
  if (!user.allow_edit_returns) throw new ApiError(403, "You do not have permission to manage returns.");
}
