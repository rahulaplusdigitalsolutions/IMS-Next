import { authorizeReadWrite } from "@/lib/auth";

export const authorizeSerials = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "print_serials",
    editColumnName: "allow_edit_serials",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage serials.",
  });
