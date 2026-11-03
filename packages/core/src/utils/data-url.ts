export const httpUrlPattern = /^https?:\/\//i;

export type FilePartSource =
  | { kind: "url"; url: string }
  | { kind: "data"; data: string; mimeType: string };

const DEFAULT_DATA_URL_MEDIA_TYPE = "text/plain";
const DEFAULT_BINARY_DATA_URL_MEDIA_TYPE = "application/octet-stream";

/**
 * Extracts a base64 payload and the URL's media type without parameters.
 * An omitted type uses `fallbackMimeType`, which defaults to
 * `application/octet-stream` because this helper only accepts base64 payloads.
 */
export function parseDataUrl(
  value: string,
  fallbackMimeType = DEFAULT_BINARY_DATA_URL_MEDIA_TYPE,
): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]*)(?:;[^;,]+)*;base64,(.*)$/i);
  if (!match) return null;
  return {
    mimeType: match[1] ? match[1].toLowerCase() : fallbackMimeType,
    data: match[2]!.replace(/%([\da-f]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    ),
  };
}

export const resolveFilePartSource = (part: {
  data: string;
  mimeType: string;
  sourceType?: string | undefined;
}): FilePartSource => {
  if (part.sourceType === "url" || httpUrlPattern.test(part.data)) {
    return { kind: "url", url: part.data };
  }

  const parsed = parseDataUrl(part.data, part.mimeType || undefined);
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
 * Returns compact bare base64, or null when the value, with whitespace
 * removed, leaves the base64 alphabet or has invalid padding, so references
 * such as /uploads/cat.png stay URLs. MIME line breaks are allowed; image
 * signatures are not required because not every format can be sniffed. A
 * reference made only of base64 characters and whitespace, such as
 * /uploads/cat, is indistinguishable from a payload (JPEG base64 starts with
 * /9j/) and is returned as base64.
 */
export function parseBase64(value: string): string | null {
  const compact = value.replace(/[\t\n\r ]/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  const validLength = compact.endsWith("=")
    ? compact.length % 4 === 0
    : compact.length % 4 !== 1;
  return validLength ? compact : null;
}

/**
 * A data URL's media type without parameters. It uses
 * `application/octet-stream` when a base64 payload omits a type and
 * `text/plain` when any other payload does.
 * Unlike `parseDataUrl`, this also accepts non-base64 data URLs.
 * Returns `undefined` for values without a data URL header.
 */
export function dataUrlMediaType(value: string): string | undefined {
  if (value.slice(0, 5).toLowerCase() !== "data:") return undefined;

  const commaIndex = value.indexOf(",", 5);
  if (commaIndex === -1) return undefined;

  const header = value.slice(5, commaIndex);
  const parameterIndex = header.indexOf(";");
  const mediaType =
    parameterIndex === -1 ? header : header.slice(0, parameterIndex);

  if (mediaType) return mediaType.toLowerCase();
  return header.toLowerCase().endsWith(";base64")
    ? DEFAULT_BINARY_DATA_URL_MEDIA_TYPE
    : DEFAULT_DATA_URL_MEDIA_TYPE;
}
