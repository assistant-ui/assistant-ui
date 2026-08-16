import { isRecord } from "@assistant-ui/core/internal";
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

const invalidField = (field: string, expectation: string): Error =>
  new Error(
    `Invalid Google ADK proxy request field "${field}": expected ${expectation}.`,
  );

const readString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string") throw invalidField(field, "a string");
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

const validateOptionalPartString = (
  part: Record<string, unknown>,
  key: string,
  field: string,
) => {
  if (part[key] !== undefined && typeof part[key] !== "string") {
    throw invalidField(field, "a string");
  }
};

// Nested fields are validated only when present: ADK serializes with
// exclude_none semantics and the Part vocabulary grows upstream, so absent
// fields and unknown part kinds pass through to the runner untouched.
const validatePart = (part: Record<string, unknown>, index: number) => {
  const field = (name: string) => `parts[${index}].${name}`;
  if (Object.keys(part).length === 0) {
    throw invalidField(`parts[${index}]`, "a non-empty part object");
  }
  if (part.thought !== undefined && typeof part.thought !== "boolean") {
    throw invalidField(field("thought"), "a boolean");
  }
  if (part.text !== undefined && typeof part.text !== "string") {
    throw invalidField(field("text"), "a string");
  }

  const validateRecordField = (
    key: string,
    validateContent: (content: Record<string, unknown>) => void,
  ) => {
    const value = part[key];
    if (value === undefined) return;
    if (!isRecord(value)) throw invalidField(field(key), "an object");
    validateContent(value);
  };

  validateRecordField("functionCall", (content) => {
    validateOptionalPartString(content, "name", field("functionCall.name"));
    validateOptionalPartString(content, "id", field("functionCall.id"));
    if (content.args !== undefined && !isRecord(content.args)) {
      throw invalidField(field("functionCall.args"), "an object");
    }
  });
  validateRecordField("functionResponse", (content) => {
    validateOptionalPartString(content, "name", field("functionResponse.name"));
    validateOptionalPartString(content, "id", field("functionResponse.id"));
  });
  validateRecordField("executableCode", (content) => {
    validateOptionalPartString(content, "code", field("executableCode.code"));
    validateOptionalPartString(
      content,
      "language",
      field("executableCode.language"),
    );
  });
  validateRecordField("codeExecutionResult", (content) => {
    validateOptionalPartString(
      content,
      "output",
      field("codeExecutionResult.output"),
    );
    validateOptionalPartString(
      content,
      "outcome",
      field("codeExecutionResult.outcome"),
    );
  });
  validateRecordField("inlineData", (content) => {
    validateOptionalPartString(
      content,
      "mimeType",
      field("inlineData.mimeType"),
    );
    validateOptionalPartString(content, "data", field("inlineData.data"));
  });
  validateRecordField("fileData", (content) => {
    validateOptionalPartString(content, "fileUri", field("fileData.fileUri"));
    validateOptionalPartString(content, "mimeType", field("fileData.mimeType"));
  });
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
      toolCallId: readString(body, "toolCallId"),
      toolName: readString(body, "toolName"),
      result: body.result,
      isError: body.isError ?? false,
      config,
      ...(stateDelta != null && { stateDelta }),
    };
  }

  if (body.type !== undefined && body.type !== "message") {
    throw invalidField("type", '"message", "tool-result", or omitted');
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
  parts?.forEach(validatePart);
  if (!("message" in body) && !("parts" in body)) {
    throw new Error(
      'Invalid Google ADK proxy request: expected a "message" string or a "parts" array.',
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
