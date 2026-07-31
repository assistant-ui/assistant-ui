import { isParsableUrl, parseDataUrl } from "@assistant-ui/core/internal";
import type { Part, ThreadUserMessagePart } from "./types";

// OpenCode forwards file URLs to an unguarded `new URL()`, and a data URL's
// media type wins over the separately declared one.
export const toOpenCodeWireUrl = (
  payload: string,
  mime: string,
  parsed: { data: string; mimeType: string } | null,
) => {
  if (parsed) {
    if (parsed.mimeType.toLowerCase() === mime.toLowerCase()) return payload;
    return `data:${mime};base64,${parsed.data}`;
  }
  if (isParsableUrl(payload)) return payload;
  return `data:${mime};base64,${payload}`;
};

export const resolveOpenCodeImageMime = (
  contentType: string | undefined,
  parsed: { mimeType: string } | null,
) =>
  contentType?.toLowerCase().startsWith("image/")
    ? contentType
    : parsed?.mimeType.toLowerCase().startsWith("image/")
      ? parsed.mimeType
      : "image/png";

export const resolveOpenCodeFileMime = (
  mimeType: string,
  parsed: { mimeType: string } | null,
) => mimeType || parsed?.mimeType || "application/octet-stream";

export const serializeOpenCodeParts = (
  parts: readonly (Part | ThreadUserMessagePart)[],
) => {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "image") {
        if (part.filename) return part.filename;
        const parsed = parseDataUrl(part.image);
        const contentType = (part as { contentType?: string }).contentType;
        const mime = resolveOpenCodeImageMime(contentType, parsed);
        return toOpenCodeWireUrl(part.image, mime, parsed);
      }
      if (part.type === "file") {
        if (part.filename) return part.filename;
        if ("url" in part) return part.url;
        if (part.sourceType === "id") return part.data;
        const parsed = parseDataUrl(part.data);
        const mime = resolveOpenCodeFileMime(part.mimeType, parsed);
        return toOpenCodeWireUrl(part.data, mime, parsed);
      }
      if (part.type === "tool") return JSON.stringify(part.state?.input ?? {});
      if (part.type === "data") return JSON.stringify(part.data) ?? "";
      if (part.type === "audio") return part.audio.data;
      return "";
    })
    .join("\n");
};
