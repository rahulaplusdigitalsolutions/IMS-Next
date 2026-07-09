import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { callOpenAI, checkOpenAIKey } from "@/lib/aiParse";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  if (!checkOpenAIKey()) throw new ApiError(503, "OpenAI API key not configured. Add OPENAI_API_KEY to .env");
  const { text } = await parseJsonBody(request);
  if (!text?.trim()) throw new ApiError(400, "No text provided");

  try {
    const result = await callOpenAI(text.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai] parse-order error:", err.message);
    throw new ApiError(500, err.message || "AI parsing failed");
  }
});
