import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeTags } from "@/lib/tagsAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeTags(user, "GET");

  const [tags] = await mysqlPool.query("SELECT * FROM inventorytags");
  return NextResponse.json({ printer: tags.filter((t) => t.module === "printer"), stationery: tags.filter((t) => t.module === "stationery") });
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeTags(user, "POST");

  const { tagName, tagColor, module } = await parseJsonBody(request);
  if (!tagName || !tagColor) throw new ApiError(400, "tagName and tagColor are required");
  await mysqlPool.query("INSERT INTO inventorytags (tagName, tagColor, module) VALUES (?,?,?)", [tagName, tagColor, module || "printer"]);
  return NextResponse.json({ message: "Tag created successfully" });
});
