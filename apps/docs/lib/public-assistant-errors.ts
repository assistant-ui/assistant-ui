export const PUBLIC_ASSISTANT_LIMITS = [
  "Rate",
  "Daily usage",
  "Daily anonymous session",
  "Public assistant usage",
  "Anonymous session",
  "Template tool rate",
  "Template tool daily",
  "Template tool usage",
  "Template download rate",
  "Template download daily",
  "Template download usage",
] as const;

export type PublicAssistantLimit = (typeof PUBLIC_ASSISTANT_LIMITS)[number];

export const PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE =
  "Public assistant temporarily unavailable";

export const publicAssistantLimitMessage = (subject: PublicAssistantLimit) =>
  `${subject} limit exceeded`;

const LIMIT_MESSAGES = new Set<string>(
  PUBLIC_ASSISTANT_LIMITS.map(publicAssistantLimitMessage),
);

/** Reads the human readable message out of a JSON `{ error }` envelope. */
export const unwrapErrorEnvelope = (text: string): string => {
  const body = text.trim();
  if (!body.startsWith("{")) return body;
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed?.error === "string" ? parsed.error.trim() : body;
  } catch {
    return body;
  }
};

/**
 * Maps the bodies the public assistant routes answer with (plain text limits,
 * JSON `{ error }` envelopes, and the gateway wording that can replace them) to
 * copy a visitor can act on. Model or provider errors that merely mention a
 * limit are left to the error rail.
 */
export const describePublicAssistantError = (
  text: string,
): string | undefined => {
  const body = unwrapErrorEnvelope(text);
  if (LIMIT_MESSAGES.has(body) || /too many requests|\b429\b/i.test(body)) {
    return "The demo is rate limited right now. Try again in a little while.";
  }
  if (
    body === PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE ||
    /service unavailable|\b503\b/i.test(body)
  ) {
    return "The demo is temporarily unavailable. Try again later.";
  }
  return undefined;
};
