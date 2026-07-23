import { authorizeReadWrite } from "@/lib/auth";

export const authorizeWarranty = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "warranty",
    editColumnName: "allow_edit_warranty",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage warranty templates and certificates.",
  });
