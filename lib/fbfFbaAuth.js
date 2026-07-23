import { authorizeReadWrite } from "@/lib/auth";

export const authorizeFbfFba = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "fbfFbaManagement",
    editColumnName: "allow_edit_fbf_fba",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage FBF/FBA Stock.",
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

  // Resolve a legacy model guid to its migrated Item Master variant so every
  // caller can uniformly key off itemVariantId (inventorystockinserial has no
  // modelGuid column) — the `models` table itself is retired, but this
  // mapping (built during the Phase 1 migration) is permanent.
  const [mapped] = await connection.query(
    "SELECT itemVariantId FROM model_itemvariant_map WHERE modelGuid COLLATE utf8mb4_unicode_ci = ? LIMIT 1",
    [lookupGuid]
  );
  if (mapped[0]?.itemVariantId) return mapped[0].itemVariantId;

  // No `models` row — this may be an Item-Master-only serialized product
  // (the picker's `modelGuid` doubling as an itemVariantId, same fallback
  // convention used elsewhere once a product only exists in Item Master).
  const [variantRows] = await connection.query(
    "SELECT itemVariantId FROM inventoryitemvariant WHERE itemVariantId = ? AND isDeleted = 0 LIMIT 1",
    [lookupGuid]
  );

  return variantRows[0]?.itemVariantId || null;
}
