import { authorizeReadWrite } from "@/lib/auth";

// Mounted behind `authorizeReadWrite({ readRoles: ["Admin","Supervisor","User","Operator"],
// writeRoles: ["Admin","User","Operator"], editColumnName: "allow_edit_installations" })` in Backend4/index.js.
export const authorizeInstallations = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ["Admin", "Supervisor", "User", "Operator"],
    writeRoles: ["Admin", "User", "Operator"],
    denyMessage: "Only Admin or Operators can manage installations.",
    editColumnName: "allow_edit_installations",
  });
