import { authorizeReadWrite } from "@/lib/auth";

// Mounted behind `authorizeReadWrite({ readRoles: ["Admin","Supervisor","Accountant"],
// writeRoles: ["Admin","Accountant"] })` in Backend4/index.js.
export const authorizeReports = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ["Admin", "Supervisor", "Accountant"],
    writeRoles: ["Admin", "Accountant"],
    denyMessage: "You do not have access to reports.",
  });
