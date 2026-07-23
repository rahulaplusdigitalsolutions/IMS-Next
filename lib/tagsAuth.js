import { authorizeReadWrite } from "@/lib/auth";

export const authorizeTags = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "dashboard",
    editColumnName: "allow_edit_inventory",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage tags.",
  });
