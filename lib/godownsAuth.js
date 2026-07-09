import { authorizeReadWrite, ALL_AUTHENTICATED_ROLES } from "@/lib/auth";

// Mounted behind `authorizeReadWrite({ readRoles: allRoles, writeRoles: ["Admin","User","Operator"],
// deleteRoles: ["Admin"], editColumnName: "allow_edit_godown" })` in Backend4/index.js.
export const authorizeGodowns = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ALL_AUTHENTICATED_ROLES,
    writeRoles: ["Admin", "User", "Operator"],
    deleteRoles: ["Admin"],
    denyMessage: "Only Admin or Operators can manage godowns.",
    editColumnName: "allow_edit_godown",
  });
