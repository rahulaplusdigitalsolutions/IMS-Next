import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeFbfFbaMaster } from "@/lib/fbfFbaMasterAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeFbfFbaMaster(user, "GET");

  const [rows] = await mysqlPool.query("SELECT * FROM fbf_fba_platforms ORDER BY name ASC");
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeFbfFbaMaster(user, "POST");

  const { name } = await parseJsonBody(request);
  if (!name) throw new ApiError(400, "Platform name is required");
  const newGuid = uuidv4();
  await mysqlPool.query("INSERT INTO fbf_fba_platforms (guid, name) VALUES (?, ?)", [newGuid, name.trim()]);
  return NextResponse.json({ message: "Platform added", guid: newGuid });
});
