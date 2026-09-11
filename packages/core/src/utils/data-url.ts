export const httpUrlPattern = /^https?:\/\//i;

export type FilePartSource =
  | { kind: "url"; url: string }
  | { kind: "data"; data: string; mimeType: string };

export function parseDataUrl(
  value: string,
): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+)(?:;[^;,]+)*;base64,(.*)$/i);
  if (!match) return null;
  return { mimeType: match[1]!.toLowerCase(), data: match[2]! };
}

export const resolveFilePartSource = (part: {
  data: string;
  mimeType: string;
  sourceType?: string | undefined;
}): FilePartSource => {
  if (part.sourceType === "url" || httpUrlPattern.test(part.data)) {
    return { kind: "url", url: part.data };
  }

  const parsed = parseDataUrl(part.data);
  return {
    kind: "data",
    data: parsed?.data ?? part.data,
    mimeType: parsed?.mimeType ?? part.mimeType,
  };
};

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

/**
 * The media type a data URL declares, whether or not its payload is base64.
 * `parseDataUrl` only matches base64 payloads because it also returns the
 * bytes; this reads the declaration alone.
 */
export function dataUrlMediaType(value: string): string | undefined {
  return /^data:([^;,]+)(?:[;,])/i.exec(value)?.[1]?.toLowerCase();
}
