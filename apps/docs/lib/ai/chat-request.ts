import type { UIMessage } from "ai";

/**
 * The request contract of the public demo chat (`/api/chat`).
 *
 * Unlike the docs assistant, this endpoint keeps a client's `system` text and
 * tools: the docs samples, the landing page demo, the examples and the Expo
 * and Ink demos define their tools and instructions in the browser, which is
 * what they demonstrate. The schema bounds what a request may carry instead,
 * and a client's per-tool `providerOptions` and `callSettings` never reach the
 * model.
 */

/** Tools one request may declare. The docs toolkit sends about a dozen. */
export const MAX_CLIENT_TOOLS = 48;
/** Serialized size of all declared tools together. */
export const MAX_CLIENT_TOOLS_CHARS = 96_000;
const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_PARTS_PER_MESSAGE = 400;
const MAX_ID_CHARS = 200;
const MAX_CONFIG_STRING_CHARS = 100;

// Each refusal's message, keyed by the fixed code that telemetry counts.
const REFUSALS = {
  invalid_request: "Invalid request",
  invalid_messages: "Invalid messages format",
  no_messages: "No messages provided",
  invalid_message: "Invalid message",
  unsupported_role: "Unsupported message role",
  too_many_parts: "Too many message parts",
  invalid_part: "Invalid message part",
  invalid_system: "Invalid system prompt",
  invalid_tools: "Invalid tools format",
  tools_too_large: "Tools too large",
  too_many_tools: "Too many tools",
  invalid_tool: "Invalid tool",
  invalid_config: "Invalid config",
  invalid_option: "Invalid request option",
  // Checked by the route on the conversation size (validate-input), which
  // answers with its own message.
  too_large: "Input too long",
} as const;

export type ChatRefusal = keyof typeof REFUSALS;

export class ChatRequestError extends Error {
  readonly code: ChatRefusal;

  constructor(code: ChatRefusal) {
    super(REFUSALS[code]);
    this.name = "ChatRequestError";
    this.code = code;
  }
}

export type ClientTool = {
  description?: string;
  parameters: Record<string, unknown>;
};

export type ChatRequest = {
  messages: UIMessage[];
  /** The client's system text as sent; the route applies its length policy. */
  system: string | undefined;
  tools: Record<string, ClientTool>;
  config: { modelName?: string; reasoningEffort?: string };
  searchDocs: boolean;
  countConversations: boolean;
  threadId: string | undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const refuse = (code: ChatRefusal): never => {
  throw new ChatRequestError(code);
};

function readMessage(value: unknown): UIMessage {
  if (!isPlainObject(value)) return refuse("invalid_message");
  // A `system` message would be a second, unbounded system prompt.
  if (value.role !== "user" && value.role !== "assistant") {
    return refuse("unsupported_role");
  }
  if (
    value.id !== undefined &&
    (typeof value.id !== "string" || value.id.length > MAX_ID_CHARS)
  ) {
    return refuse("invalid_message");
  }
  if (!Array.isArray(value.parts)) return refuse("invalid_message");
  if (value.parts.length > MAX_PARTS_PER_MESSAGE) {
    return refuse("too_many_parts");
  }
  for (const part of value.parts) {
    if (!isPlainObject(part) || typeof part.type !== "string") {
      return refuse("invalid_part");
    }
  }
  return value as unknown as UIMessage;
}

function readTools(value: unknown): Record<string, ClientTool> {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) return refuse("invalid_tools");
  if (JSON.stringify(value).length > MAX_CLIENT_TOOLS_CHARS) {
    return refuse("tools_too_large");
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_CLIENT_TOOLS) return refuse("too_many_tools");

  const tools: Record<string, ClientTool> = {};
  for (const [name, tool] of entries) {
    if (
      !TOOL_NAME.test(name) ||
      !isPlainObject(tool) ||
      !isPlainObject(tool.parameters) ||
      (tool.description !== undefined && typeof tool.description !== "string")
    ) {
      return refuse("invalid_tool");
    }
    // Only the name, description and input schema are kept.
    tools[name] = {
      ...(tool.description !== undefined
        ? { description: tool.description }
        : {}),
      parameters: tool.parameters,
    };
  }
  return tools;
}

function readConfig(value: unknown): ChatRequest["config"] {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) return refuse("invalid_config");
  const config: ChatRequest["config"] = {};
  for (const key of ["modelName", "reasoningEffort"] as const) {
    const field = value[key];
    if (field === undefined || field === null) continue;
    if (typeof field !== "string" || field.length > MAX_CONFIG_STRING_CHARS) {
      return refuse("invalid_config");
    }
    config[key] = field;
  }
  return config;
}

function readFlag(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") return refuse("invalid_option");
  return value;
}

/**
 * Reads a `/api/chat` body. Throws `ChatRequestError` with a fixed code for a
 * body the site's chat clients could not have sent.
 */
export function readChatRequest(body: unknown): ChatRequest {
  if (!isPlainObject(body)) return refuse("invalid_request");

  if (!Array.isArray(body.messages)) return refuse("invalid_messages");
  if (body.messages.length === 0) return refuse("no_messages");
  const messages = body.messages.map(readMessage);

  const system = body.system;
  if (system !== undefined && system !== null && typeof system !== "string") {
    return refuse("invalid_system");
  }

  const threadId = body.id;
  if (
    threadId !== undefined &&
    threadId !== null &&
    (typeof threadId !== "string" || threadId.length > MAX_ID_CHARS)
  ) {
    return refuse("invalid_option");
  }

  return {
    messages,
    system: typeof system === "string" ? system : undefined,
    tools: readTools(body.tools),
    config: readConfig(body.config),
    searchDocs: readFlag(body.searchDocs),
    countConversations: readFlag(body.countConversations),
    threadId: typeof threadId === "string" ? threadId : undefined,
  };
}

/**
 * Model steps the current turn has already used. A client that ran a
 * frontend tool sends the conversation again with the tool result in the
 * last assistant message, and the server continues that message; its
 * `step-start` parts count the steps earlier requests of the turn ran.
 */
export function stepsUsedInTurn(messages: readonly UIMessage[]): number {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return 0;
  const steps = last.parts.filter((part) => part.type === "step-start").length;
  return Math.max(steps, last.parts.length > 0 ? 1 : 0);
}
