import { authorizeReadWrite } from "@/lib/auth";

export const authorizeGodowns = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "godownMaster",
    editColumnName: "allow_edit_godown",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage godowns.",
  });
