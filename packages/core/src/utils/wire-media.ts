import { dataUrlMediaType, isParsableUrl, parseDataUrl } from "./data-url";
import { detectImageMediaType } from "./image-media-type";

/**
 * The media type to declare for an `ImageMessagePart`, which carries none of
 * its own: an attachment's content type, then the payload's data URL
 * declaration, then its leading bytes, then `image/png`.
 *
 * The floor cannot be a wildcard. `image/*` is rejected outright by the AI SDK
 * for a url source and whenever inline bytes fail to sniff, so it fails exactly
 * where a fallback is needed.
 */
export function resolveImageMediaType(
  image: string,
  contentType?: string | undefined,
): string {
  if (contentType?.startsWith("image/")) return contentType;

  const declared = dataUrlMediaType(image);
  if (declared?.startsWith("image/")) return declared;

  // Read through a data URL envelope too, so a generic one such as
  // `application/octet-stream` does not mask the format. A url of any other
  // scheme has no local bytes to read.
  const parsed = parseDataUrl(image);
  const payload = parsed?.data ?? (isParsableUrl(image) ? undefined : image);
  if (payload !== undefined) {
    const sniffed = detectImageMediaType(payload);
    if (sniffed) return sniffed;
  }

  return "image/png";
}

/**
 * The media type to declare for a `FileMessagePart`: its own `mimeType`, then
 * the payload's data URL declaration, then `application/octet-stream`.
 *
 * `mimeType` is a plain string, and an adapter reading `file.type` on a file
 * the OS cannot type yields `""`, so the declared value is not always present.
 */
export function resolveFileMediaType(
  data: string,
  mimeType?: string | undefined,
): string {
  return mimeType || dataUrlMediaType(data) || "application/octet-stream";
}

/**
 * A payload placed into a wire field that is contractually a url.
 *
 * Two hazards drive this. A consumer may hand the value to an unguarded
 * `new URL()`, so a payload that is not a url has to be wrapped; and a data
 * URL's own media type wins over a separately declared one downstream, so a
 * base64 envelope that disagrees with `mediaType` is rebuilt around the same
 * bytes. Everything else passes through byte for byte: an envelope that agrees,
 * a url of any other scheme, and a percent-encoded data URL, whose declaration
 * cannot be corrected without transcoding the payload and is authoritative for
 * the bytes it carries anyway.
 */
export function toMediaWireUrl(payload: string, mediaType: string): string {
  const parsed = parseDataUrl(payload);
  if (parsed) {
    return parsed.mimeType === mediaType
      ? payload
      : `data:${mediaType};base64,${parsed.data}`;
  }
  if (isParsableUrl(payload)) return payload;
  return `data:${mediaType};base64,${payload}`;
}
