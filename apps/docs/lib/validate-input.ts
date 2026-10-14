/**
 * Input validation for AI chat endpoints.
 * Prevents abuse via oversized payloads and excessive message histories.
 */

interface InputLimits {
  /** Maximum number of messages allowed (0 = unlimited) */
  maxMessages: number;
  /** Maximum total character count of the serialized messages array */
  maxTotalChars: number;
  /** Maximum serialized (JSON.stringify) character count for a single message */
  maxSingleMessageChars: number;
  /** The roles whose messages the single message limit applies to; every role when unset */
  singleMessageRoles?: readonly string[];
}

const GENERAL_CHAT_LIMITS: InputLimits = {
  maxMessages: 20,
  maxTotalChars: 96_000, // ~24k tokens
  maxSingleMessageChars: 12_000, // ~3k tokens
};

const DOC_CHAT_LIMITS: InputLimits = {
  maxMessages: 0, // no message count limit; pruneMessages handles windowing
  maxTotalChars: 480_000, // ~120k tokens
  maxSingleMessageChars: 24_000, // ~6k tokens
};

const DEMO_CHAT_LIMITS: InputLimits = {
  maxMessages: 0, // no message count limit; pruning older tool calls bounds what reaches the model
  maxTotalChars: 480_000, // ~120k tokens
  // An answer carries the tool calls and results of all its steps, so only the total bounds it.
  maxSingleMessageChars: 12_000, // ~3k tokens
  singleMessageRoles: ["user"],
};

const MAX_FRONTEND_TOOLS_CHARS = 96_000;

const roleOf = (msg: unknown) =>
  typeof msg === "object" && msg !== null && "role" in msg
    ? msg.role
    : undefined;

function measureMessageChars(
  messages: unknown[],
  roles: readonly string[] | undefined,
): {
  totalChars: number;
  maxChars: number;
} {
  let totalChars = 0;
  let maxChars = 0;

  for (const msg of messages) {
    const len = JSON.stringify(msg).length;
    totalChars += len;
    const role = roleOf(msg);
    if (roles && !(typeof role === "string" && roles.includes(role))) continue;
    if (len > maxChars) maxChars = len;
  }

  return { totalChars, maxChars };
}

function validateWithLimits(
  messages: unknown,
  limits: InputLimits,
): string | null {
  if (!Array.isArray(messages)) {
    return "Invalid messages format";
  }

  if (messages.length === 0) {
    return "No messages provided";
  }

  if (limits.maxMessages > 0 && messages.length > limits.maxMessages) {
    return `Too many messages (max ${limits.maxMessages})`;
  }

  const { totalChars, maxChars } = measureMessageChars(
    messages,
    limits.singleMessageRoles,
  );

  if (totalChars > limits.maxTotalChars) {
    return "Input too long";
  }

  if (maxChars > limits.maxSingleMessageChars) {
    return "Single message too long";
  }

  return null;
}

export function validateGeneralChatInput(messages: unknown): Response | null {
  const error = validateWithLimits(messages, GENERAL_CHAT_LIMITS);
  if (error) {
    return new Response(error, { status: 400 });
  }
  return null;
}

export function validateDocChatInput(messages: unknown): Response | null {
  const error = validateWithLimits(messages, DOC_CHAT_LIMITS);
  if (error) {
    return new Response(error, { status: 400 });
  }
  return null;
}

export function validateDemoChatInput(messages: unknown): Response | null {
  const error = validateWithLimits(messages, DEMO_CHAT_LIMITS);
  if (error) {
    return new Response(error, { status: 400 });
  }
  return null;
}

export function validateFrontendToolsInput(tools: unknown): Response | null {
  const normalizedTools = tools ?? {};
  if (typeof normalizedTools !== "object" || Array.isArray(normalizedTools)) {
    return new Response("Invalid tools format", { status: 400 });
  }

  const serializedTools = JSON.stringify(normalizedTools);
  if (serializedTools.length > MAX_FRONTEND_TOOLS_CHARS) {
    return new Response("Tools too large", { status: 400 });
  }
  return null;
}
