import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeFbfFba, resolveModelId } from "@/lib/fbfFbaAuth";
import { recordSerialMovement } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeFbfFba(user, "POST");

  const { modelGuid, itemId, type, quantity, serialNumbers, createdBy, warehouseGuid } = body;
  const itemKind = body.itemKind || (serialNumbers?.length ? "serialized" : "nonSerialized");
  const isSerialized = itemKind === "serialized";
  const safeItemId = isSerialized ? null : String(itemId || "").trim();
  const safeQuantity = Number(quantity);

  const connection = await mysqlPool.getConnection();
  try {
    const safeModelId = isSerialized ? await resolveModelId(connection, modelGuid) : null;

    if (!type || !["FBF", "FBA"].includes(type)) throw new ApiError(400, "Invalid stock type");
    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) throw new ApiError(400, "Quantity must be greater than zero");
    if (isSerialized && !safeModelId) throw new ApiError(400, "Model is required for serialized stock");
    if (!isSerialized && !safeItemId) throw new ApiError(400, "Item is required for non-serialized stock");

    await connection.beginTransaction();

    if (isSerialized) {
      const [existingStock] = await connection.query(
        "SELECT guid FROM fbf_fba_stock WHERE itemKind = 'serialized' AND modelGuid = ? AND type = ? AND (warehouseGuid = ? OR (warehouseGuid IS NULL AND ? IS NULL)) LIMIT 1 FOR UPDATE",
        [safeModelId, type, warehouseGuid || null, warehouseGuid || null]
      );

      if (existingStock.length > 0) {
        await connection.query("UPDATE fbf_fba_stock SET quantity = quantity + ? WHERE guid = ?", [safeQuantity, existingStock[0].guid]);
      } else {
        await connection.query(`
          INSERT INTO fbf_fba_stock (guid, modelGuid, itemId, itemKind, type, warehouseGuid, quantity)
          VALUES (UUID(), ?, NULL, 'serialized', ?, ?, ?)
        `, [safeModelId, type, warehouseGuid || null, safeQuantity]);
      }
    } else {
      const [existingStock] = await connection.query(
        "SELECT guid FROM fbf_fba_stock WHERE itemKind = 'nonSerialized' AND itemId = ? AND type = ? AND (warehouseGuid = ? OR (warehouseGuid IS NULL AND ? IS NULL)) LIMIT 1 FOR UPDATE",
        [safeItemId, type, warehouseGuid || null, warehouseGuid || null]
      );

      if (existingStock.length > 0) {
        await connection.query("UPDATE fbf_fba_stock SET quantity = quantity + ? WHERE guid = ?", [safeQuantity, existingStock[0].guid]);
      } else {
        await connection.query(
          "INSERT INTO fbf_fba_stock (guid, modelGuid, itemId, itemKind, type, warehouseGuid, quantity) VALUES (UUID(), NULL, ?, 'nonSerialized', ?, ?, ?)",
          [safeItemId, type, warehouseGuid || null, safeQuantity]
        );
      }
    }

    if (isSerialized) {
      await connection.query(`
        INSERT INTO fbf_fba_transactions (guid, modelGuid, itemId, itemKind, type, warehouseGuid, transactionType, quantity, serialNumbers, createdBy)
        VALUES (UUID(), ?, NULL, 'serialized', ?, ?, 'IN', ?, ?, ?)
      `, [safeModelId, type, warehouseGuid || null, safeQuantity, JSON.stringify(serialNumbers || []), createdBy]);
    } else {
      await connection.query(`
        INSERT INTO fbf_fba_transactions (guid, modelGuid, itemId, itemKind, type, warehouseGuid, transactionType, quantity, serialNumbers, createdBy)
        VALUES (UUID(),  NULL, ?, 'nonSerialized', ?, ?, 'IN', ?, ?, ?)
      `, [safeItemId || null, type, warehouseGuid || null, safeQuantity, JSON.stringify(serialNumbers || []), createdBy]);
    }

    if (isSerialized && serialNumbers && serialNumbers.length > 0) {
      const [matchedSerials] = await connection.query(
        "SELECT value FROM serials WHERE value IN (?) AND modelGuid = ? AND isDeleted = 0 FOR UPDATE",
        [serialNumbers, safeModelId]
      );
      if (matchedSerials.length !== serialNumbers.length) {
        throw new Error("Some serials are no longer valid for this model (may have been moved or removed by another user)");
      }

      await connection.query(
        "UPDATE serials SET status = ?, fbfFbaType = ? WHERE value IN (?) AND modelGuid = ?",
        [type, type, serialNumbers, safeModelId]
      );

      for (const sn of serialNumbers) {
        const [sRow] = await connection.query("SELECT guid FROM serials WHERE value = ?", [sn]);
        if (sRow.length > 0) {
          await recordSerialMovement(connection, {
            serialNumberGuid: sRow[0].guid,
            serialValue: sn,
            actionType: type,
            status: type,
            notes: `Moved to ${type} stock`,
            createdBy,
          });
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ message: `Successfully added ${safeQuantity} items to ${type}` });
  } catch (err) {
    await connection.rollback();
    if (err instanceof ApiError) throw err;
    return NextResponse.json({ message: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
});
