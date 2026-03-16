import type {
  AdkEvent,
  AdkMessage,
  AdkMessageContentPart,
  AdkStreamCallback,
} from "./types";

export type CreateAdkStreamOptions = {
  /**
   * URL to POST to. Either a proxy route (e.g. "/api/adk") or
   * an ADK server base URL (e.g. "http://localhost:8000").
   *
   * When `appName` and `userId` are provided, POSTs to `${api}/run_sse`
   * in ADK-native format. Otherwise POSTs directly to `api` in proxy format
   * (compatible with `parseAdkRequest`).
   */
  api: string;

  /**
   * ADK application name. When provided along with `userId`,
   * enables direct connection to an ADK server.
   */
  appName?: string | undefined;

  /**
   * ADK user ID. Required when `appName` is provided.
   */
  userId?: string | undefined;

  /**
   * Extra headers to send with every request.
   * Can be a static object or an async function for dynamic auth tokens.
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined;
};

/**
 * Creates an `AdkStreamCallback` that connects to an ADK endpoint.
 *
 * @example Proxy mode (with a Next.js API route)
 * ```ts
 * const stream = createAdkStream({ api: "/api/adk" });
 * ```
 *
 * @example Direct mode (connecting to ADK server)
 * ```ts
 * const stream = createAdkStream({
 *   api: "http://localhost:8000",
 *   appName: "my-app",
 *   userId: "user-1",
 * });
 * ```
 */
export function createAdkStream(
  options: CreateAdkStreamOptions,
): AdkStreamCallback {
  const isDirect = options.appName != null;

  return async function* (messages, config) {
    const headers = await resolveHeaders(options.headers);

    let url: string;
    let body: unknown;

    if (isDirect) {
      // Direct mode: POST to ADK server's /run_sse
      url = `${options.api}/run_sse`;
      const { externalId } = await config.initialize();
      body = {
        appName: options.appName,
        userId: options.userId,
        sessionId: externalId,
        newMessage: messagesToContent(messages),
        streaming: true,
        ...(config.stateDelta != null && { stateDelta: config.stateDelta }),
      };
    } else {
      // Proxy mode: POST in parseAdkRequest-compatible format
      url = options.api;
      body = messagesToProxyBody(messages, config);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: config.abortSignal,
    });

    if (!response.ok) {
      throw new Error(
        `ADK request failed: ${response.status} ${response.statusText}`,
      );
    }

    yield* parseSSEResponse(response);
  };
}

// ── Internal helpers ──

async function resolveHeaders(
  headers:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined,
): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") return await headers();
  return headers;
}

/**
 * Converts AdkMessage[] (new messages) into ADK Content format
 * for the direct `/run_sse` endpoint.
 */
function messagesToContent(messages: AdkMessage[]): {
  role: string;
  parts: Array<Record<string, unknown>>;
} {
  const parts: Array<Record<string, unknown>> = [];

  for (const msg of messages) {
    if (msg.type === "human") {
      for (const part of contentToParts(msg.content)) {
        parts.push(part);
      }
    } else if (msg.type === "tool") {
      let response: unknown;
      try {
        response = JSON.parse(msg.content);
      } catch {
        response = msg.content;
      }
      parts.push({
        functionResponse: {
          name: msg.name,
          id: msg.tool_call_id,
          response,
        },
      });
    }
  }

  if (parts.length === 0) {
    parts.push({ text: "" });
  }

  return { role: "user", parts };
}

/**
 * Converts AdkMessage[] into the proxy request body format
 * (compatible with `parseAdkRequest`).
 */
function messagesToProxyBody(
  messages: AdkMessage[],
  config: {
    runConfig?: unknown;
    checkpointId?: string | undefined;
    stateDelta?: Record<string, unknown> | undefined;
  },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (config.runConfig != null) body.runConfig = config.runConfig;
  if (config.checkpointId != null) body.checkpointId = config.checkpointId;
  if (config.stateDelta != null) body.stateDelta = config.stateDelta;

  // Check if there's a tool result
  const toolMsg = messages.find((m) => m.type === "tool");
  if (toolMsg && toolMsg.type === "tool") {
    // If there are also other messages (e.g. cancellations), send as parts
    if (messages.length > 1) {
      body.parts = messagesToContent(messages).parts;
      return body;
    }

    let result: unknown;
    try {
      result = JSON.parse(toolMsg.content);
    } catch {
      result = toolMsg.content;
    }
    body.type = "tool-result";
    body.toolCallId = toolMsg.tool_call_id;
    body.toolName = toolMsg.name;
    body.result = result;
    body.isError = toolMsg.status === "error";
    return body;
  }

  // Human message(s) - possibly with cancellation tool results prepended
  if (messages.length === 1 && messages[0]!.type === "human") {
    const msg = messages[0]!;
    if (typeof msg.content === "string") {
      body.message = msg.content;
    } else {
      body.parts = contentToParts(msg.content);
    }
    return body;
  }

  // Multiple messages (e.g. cancellations + human): send as parts array
  body.parts = messagesToContent(messages).parts;
  return body;
}

function contentToParts(
  content: string | AdkMessageContentPart[],
): Array<Record<string, unknown>> {
  if (typeof content === "string") return [{ text: content }];
  return content.map((part) => {
    switch (part.type) {
      case "text":
        return { text: part.text };
      case "reasoning":
        return { text: part.text, thought: true };
      case "image":
        return { inlineData: { mimeType: part.mimeType, data: part.data } };
      case "image_url":
        return { fileData: { fileUri: part.url } };
      case "code":
        return {
          executableCode: { code: part.code, language: part.language },
        };
      case "code_result":
        return {
          codeExecutionResult: { output: part.output, outcome: part.outcome },
        };
      default:
        return { text: "" };
    }
  });
}

async function* parseSSEResponse(response: Response): AsyncGenerator<AdkEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (line.startsWith("data: ")) {
            yield JSON.parse(line.slice(6)) as AdkEvent;
          }
        }
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        if (line.startsWith("data: ")) {
          yield JSON.parse(line.slice(6)) as AdkEvent;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
