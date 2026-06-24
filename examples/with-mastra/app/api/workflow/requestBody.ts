import { NextRequest, NextResponse } from "next/server";

export type JsonObject = Record<string, unknown>;

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export async function readJsonObject(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid JSON",
          details:
            error instanceof Error
              ? error.message
              : "Request body is not valid JSON",
        },
        { status: 400 },
      ),
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid request body",
          details: "Expected a JSON object",
        },
        { status: 400 },
      ),
    };
  }

  return { body: body as JsonObject };
}
