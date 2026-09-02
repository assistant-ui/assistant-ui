const LIMIT_SUFFIX = "limit exceeded";

export const PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE =
  "Public assistant temporarily unavailable";

export const publicAssistantLimitMessage = (subject: string) =>
  `${subject} ${LIMIT_SUFFIX}`;

/**
 * Maps the plain text bodies the public assistant routes answer with (and the
 * gateway wording that can replace them) to copy a visitor can act on.
 */
export const describePublicAssistantError = (
  text: string,
): string | undefined => {
  if (text.includes(LIMIT_SUFFIX) || /too many requests|\b429\b/i.test(text)) {
    return "The demo is rate limited right now. Try again in a little while.";
  }
  if (
    text.includes(PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE) ||
    /service unavailable|\b503\b/i.test(text)
  ) {
    return "The demo is temporarily unavailable. Try again later.";
  }
  return undefined;
};
