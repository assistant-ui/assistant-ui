import {
  resolveFileMediaType,
  resolveImageMediaType,
  toMediaWireUrl,
} from "@assistant-ui/core/internal";
import type { Part, ThreadUserMessagePart } from "./types";

/**
 * One rendering for both an outbound part and the server's echo of it.
 *
 * The pending copy and the loaded history are fingerprinted against each other
 * to reconcile an optimistic message, so an inline payload has to be rendered
 * as the url that actually went out. Rendering the original payload on one side
 * and the rewritten url on the other leaves the two unable to match.
 */
export const serializeOpenCodeParts = (
  parts: readonly (Part | ThreadUserMessagePart)[],
) => {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "image") {
        if (part.filename) return part.filename;
        const mime = resolveImageMediaType(
          part.image,
          (part as { contentType?: string }).contentType,
        );
        return toMediaWireUrl(part.image, mime);
      }
      if (part.type === "file") {
        if (part.filename) return part.filename;
        // The server shape is the one without `data`, so a malformed part that
        // reaches history without a url renders empty rather than throwing
        // inside the reducer and taking the whole load down.
        if (!("data" in part)) return part.url ?? "";
        if (part.sourceType === "id") return part.data;
        return toMediaWireUrl(
          part.data,
          resolveFileMediaType(part.data, part.mimeType),
        );
      }
      if (part.type === "tool") return JSON.stringify(part.state?.input ?? {});
      if (part.type === "data") return JSON.stringify(part.data) ?? "";
      if (part.type === "audio") return part.audio.data;
      return "";
    })
    .join("\n");
};
