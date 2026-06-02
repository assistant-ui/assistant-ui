import type { JSONValue } from "ai";
import type { ToolModelContentPart } from "assistant-stream";

export const toAISDKContent = (parts: readonly ToolModelContentPart[]) => ({
  type: "content" as const,
  value: parts.map((part) => {
    if (part.type === "text") {
      return { type: "text" as const, text: part.text };
    }
    const isImage = part.mediaType.startsWith("image/");
    return isImage
      ? {
          type: "image-data" as const,
          data: part.data,
          mediaType: part.mediaType,
        }
      : {
          type: "file-data" as const,
          data: part.data,
          mediaType: part.mediaType,
          ...(part.filename !== undefined && { filename: part.filename }),
        };
  }),
});

export const toAISDKDefaultOutput = (output: unknown) =>
  typeof output === "string"
    ? { type: "text" as const, value: output }
    : { type: "json" as const, value: (output ?? null) as JSONValue };
