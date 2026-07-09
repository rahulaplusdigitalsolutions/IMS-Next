import { authorizeReadWrite, ALL_AUTHENTICATED_ROLES } from "@/lib/auth";

// Mounted behind `authorizeReadWrite({ readRoles: allRoles, writeRoles: ["Admin","User","Operator"],
// deleteRoles: ["Admin"], editColumnName: "allow_edit_fbf_fba" })` in Backend4/index.js.
export const authorizeFbfFba = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ALL_AUTHENTICATED_ROLES,
    writeRoles: ["Admin", "User", "Operator"],
    deleteRoles: ["Admin"],
    denyMessage: "Only Admin or Operators can manage FBF/FBA Stock.",
    editColumnName: "allow_edit_fbf_fba",
  });

export async function resolveModelId(connection, modelGuid) {
  const guidCandidate = String(modelGuid || "").trim();
  const idCandidate = String(modelGuid || "").trim();
  const numericId = Number(idCandidate);

  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  const lookupGuid = guidCandidate || idCandidate;
  if (!lookupGuid) return null;

  const [rows] = await connection.query(
    "SELECT guid FROM models WHERE guid = ? AND isDeleted = 0 LIMIT 1",
    [lookupGuid]
  );

  return rows[0]?.guid || null;
}
