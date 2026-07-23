import { authorizeReadWrite } from "@/lib/auth";

// Read-only module — every existing caller only ever passes "GET".
export const authorizeReports = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "reports",
    denyMessage: "You do not have access to reports.",
  });
