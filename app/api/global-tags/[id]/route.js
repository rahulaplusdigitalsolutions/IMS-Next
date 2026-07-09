import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeTags } from "@/lib/tagsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeTags(user, "DELETE");
  const { id } = await params;

  const [result] = await mysqlPool.query("DELETE FROM inventorytags WHERE id=?", [id]);
  if (result.affectedRows === 0) throw new ApiError(404, "Tag not found");
  return NextResponse.json({ message: "Tag deleted successfully" });
});
