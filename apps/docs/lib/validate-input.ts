/**
 * Input validation for AI chat endpoints.
 * Prevents abuse via oversized payloads and excessive message histories.
 */

interface InputLimits {
  /** Maximum number of messages allowed */
  maxMessages: number;
  /** Maximum total character count of the serialized messages array */
  maxTotalChars: number;
  /** Maximum character count for a single message's text content */
  maxSingleMessageChars: number;
}

const GENERAL_CHAT_LIMITS: InputLimits = {
  maxMessages: 20,
  maxTotalChars: 24_000, // ~6k tokens
  maxSingleMessageChars: 4_000,
};

const DOC_CHAT_LIMITS: InputLimits = {
  maxMessages: 40,
  maxTotalChars: 60_000, // ~15k tokens
  maxSingleMessageChars: 8_000,
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

  if (messages.length > limits.maxMessages) {
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
