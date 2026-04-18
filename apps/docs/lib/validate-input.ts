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

function measureMessageChars(messages: unknown[]): {
  totalChars: number;
  maxChars: number;
} {
  let totalChars = 0;
  let maxChars = 0;

  for (const msg of messages) {
    const len = JSON.stringify(msg).length;
    totalChars += len;
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

  const { totalChars, maxChars } = measureMessageChars(messages);

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
