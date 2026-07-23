import { authorizeReadWrite } from "@/lib/auth";

export const authorizeInstallations = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "installation",
    editColumnName: "allow_edit_installations",
    denyMessage: "You do not have permission to manage installations.",
  });
