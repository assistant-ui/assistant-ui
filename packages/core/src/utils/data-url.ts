export const httpUrlPattern = /^https?:\/\//i;

export function parseDataUrl(
  value: string,
): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+)(?:;[^;,]+)*;base64,(.*)$/i);
  if (!match) return null;
  return { mimeType: match[1]!.toLowerCase(), data: match[2]! };
}

/**
 * Whether a payload is something `new URL()` accepts. Adapters that place a
 * `FileMessagePart` payload into a url-typed wire field use this to decide
 * whether it has to be wrapped in a data URL envelope first; base64 cannot
 * contain a colon, so a real payload is never misread as a url.
 */
export function isParsableUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
