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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON in request body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }

  const config: AdkSendMessageConfig = {};
  if (body.runConfig !== undefined) config.runConfig = body.runConfig;
  if (body.checkpointId !== undefined)
    config.checkpointId = body.checkpointId as string;

  const stateDelta = body.stateDelta as Record<string, unknown> | undefined;

  if (body.type === "tool-result") {
    return {
      type: "tool-result",
      toolCallId: (body.toolCallId as string) ?? "",
      toolName: (body.toolName as string) ?? "",
      result: body.result,
      isError: (body.isError as boolean) ?? false,
      config,
      ...(stateDelta != null && { stateDelta }),
    };
  }

  return {
    type: "message",
    text: (body.message as string) ?? "",
    ...(body.parts != null && {
      parts: body.parts as Array<Record<string, unknown>>,
    }),
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
