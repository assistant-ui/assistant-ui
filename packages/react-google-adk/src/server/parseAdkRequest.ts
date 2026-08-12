import type { AdkSendMessageConfig } from "../types";

type ParsedAdkRequest =
  | {
      type: "message";
      text: string;
      parts?: Array<Record<string, unknown>> | undefined;
      config: AdkSendMessageConfig;
      stateDelta?: Record<string, unknown> | undefined;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError: boolean;
      config: AdkSendMessageConfig;
      stateDelta?: Record<string, unknown> | undefined;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidField = (field: string, expectation: string): Error =>
  new Error(
    `Invalid Google ADK proxy request field "${field}": expected ${expectation}.`,
  );

const readRequiredString = (
  body: Record<string, unknown>,
  field: string,
): string => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw invalidField(field, "a non-empty string");
  }
  return value;
};

const readOptionalString = (
  body: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalidField(field, "a string");
  return value;
};

/**
 * Parses an incoming HTTP request into a structured ADK request.
 *
 * Supports two request shapes:
 *
 * 1. User message:
 * ```json
 * { "message": "Hello", "runConfig": {}, "stateDelta": {} }
 * ```
 *
 * 2. Tool result:
 * ```json
 * {
 *   "type": "tool-result",
 *   "toolCallId": "call_123",
 *   "toolName": "search",
 *   "result": { ... },
 *   "isError": false
 * }
 * ```
 */
export const parseAdkRequest = async (
  request: Request,
): Promise<ParsedAdkRequest> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error(
      'Invalid JSON in Google ADK proxy request body. Expected a JSON object like {"message":"Hello"} or {"type":"tool-result",...}.',
    );
  }

  if (!isRecord(body)) {
    throw new Error("Google ADK proxy request body must be a JSON object");
  }

  const config: AdkSendMessageConfig = {};
  if (body.runConfig !== undefined) config.runConfig = body.runConfig;
  const checkpointId = readOptionalString(body, "checkpointId");
  if (checkpointId !== undefined) config.checkpointId = checkpointId;

  const stateDelta = body.stateDelta;
  if (stateDelta !== undefined && !isRecord(stateDelta)) {
    throw invalidField("stateDelta", "an object");
  }

  if (body.type === "tool-result") {
    if (!("result" in body)) {
      throw invalidField("result", "a value");
    }
    if (body.isError !== undefined && typeof body.isError !== "boolean") {
      throw invalidField("isError", "a boolean");
    }
    return {
      type: "tool-result",
      toolCallId: readRequiredString(body, "toolCallId"),
      toolName: readRequiredString(body, "toolName"),
      result: body.result,
      isError: body.isError ?? false,
      config,
      ...(stateDelta != null && { stateDelta }),
    };
  }

  if (body.type !== undefined) {
    throw invalidField("type", '"tool-result" or omitted');
  }

  const text = body.message;
  if (text !== undefined && typeof text !== "string") {
    throw invalidField("message", "a string");
  }

  const parts = body.parts;
  if (
    parts !== undefined &&
    (!Array.isArray(parts) || !parts.every(isRecord))
  ) {
    throw invalidField("parts", "an array of objects");
  }
  if (text === undefined && (parts === undefined || parts.length === 0)) {
    throw new Error(
      'Invalid Google ADK proxy request: expected a "message" string or a non-empty "parts" array.',
    );
  }

  return {
    type: "message",
    text: text ?? "",
    ...(parts !== undefined && { parts }),
    config,
    ...(stateDelta != null && { stateDelta }),
  };
};

/**
 * Converts a parsed ADK request into a Google GenAI Content object
 * suitable for `Runner.runAsync({ newMessage })`.
 *
 * @example
 * ```ts
 * const parsed = await parseAdkRequest(req);
 * const newMessage = toAdkContent(parsed);
 * const events = runner.runAsync({ userId, sessionId, newMessage, stateDelta: parsed.stateDelta });
 * return adkEventStream(events);
 * ```
 */
export const toAdkContent = (
  parsed: ParsedAdkRequest,
): { role: string; parts: Array<Record<string, unknown>> } => {
  if (parsed.type === "tool-result") {
    return {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: parsed.toolName,
            id: parsed.toolCallId,
            response: parsed.result,
          },
        },
      ],
    };
  }

  // If raw parts are provided (multimodal), use them directly
  if (parsed.parts?.length) {
    return { role: "user", parts: parsed.parts };
  }

  return { role: "user", parts: [{ text: parsed.text }] };
};
