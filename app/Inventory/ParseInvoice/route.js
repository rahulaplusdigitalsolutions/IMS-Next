import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  // Original handler ignores the uploaded file entirely and always returns an empty item list.
  await request.formData();
  return NextResponse.json({ message: "Success", data: { items: [] } });
});
