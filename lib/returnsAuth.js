import { requireAuth, isSuperUser, ApiError } from "@/lib/auth";

// Ported verbatim from the inline `app.use("/api/returns", ...)` middleware in
// Backend4/index.js — kept as a bespoke function (rather than authorizeReadWrite)
// because each method has a distinct denial message.
export function authorizeReturns(user, method) {
  requireAuth(user);
  const role = user.role;
  const m = method.toUpperCase();
  if (isSuperUser(role)) return;
  if (["GET", "HEAD", "OPTIONS"].includes(m)) {
    if (!["Admin", "Supervisor", "User", "Operator"].includes(role)) throw new ApiError(403, "You do not have access to returns.");
    return;
  }
  if (m === "DELETE") {
    if (role !== "Admin") throw new ApiError(403, "Only Admin can delete return records.");
    return;
  }
  if (!["Admin", "User", "Operator"].includes(role)) throw new ApiError(403, "Only Admin or Operators can manage returns.");
}
