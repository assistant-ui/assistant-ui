import type { JSONValue } from "ai";
import type { ToolModelContentPart } from "../core/tool/tool-types";

type AISDKTextPart = { type: "text"; text: string };

type TaggedFilePart = {
  type: "file";
  data: { type: "data"; data: string };
  mediaType: string;
  filename?: string;
};

type LegacyFilePart = {
  type: "file-data";
  data: string;
  mediaType: string;
  filename?: string;
};

type ToAISDKContentOptions = { taggedFileData: boolean };

export type TaggedAISDKContent = {
  type: "content";
  value: (AISDKTextPart | TaggedFilePart)[];
};

type LegacyAISDKContent = {
  type: "content";
  value: (AISDKTextPart | LegacyFilePart)[];
};

export function toAISDKContent(
  parts: readonly ToolModelContentPart[],
  options: { taggedFileData: true },
): TaggedAISDKContent;
export function toAISDKContent(
  parts: readonly ToolModelContentPart[],
  options: { taggedFileData: false },
): LegacyAISDKContent;
export function toAISDKContent(
  parts: readonly ToolModelContentPart[],
  options: ToAISDKContentOptions,
): TaggedAISDKContent | LegacyAISDKContent;
export function toAISDKContent(
  parts: readonly ToolModelContentPart[],
  { taggedFileData }: ToAISDKContentOptions,
): {
  type: "content";
  value: (AISDKTextPart | TaggedFilePart | LegacyFilePart)[];
} {
  return {
    type: "content",
    value: parts.map(
      (part): AISDKTextPart | TaggedFilePart | LegacyFilePart => {
        if (part.type === "text") {
          return { type: "text", text: part.text };
        }
        const mediaType =
          typeof part.mediaType === "string"
            ? part.mediaType
            : "application/octet-stream";
        const filename = part.filename !== undefined && {
          filename: part.filename,
        };
        return taggedFileData
          ? {
              type: "file",
              data: { type: "data", data: part.data },
              mediaType,
              ...filename,
            }
          : { type: "file-data", data: part.data, mediaType, ...filename };
      },
    ),
  };
}

export const toAISDKDefaultOutput = (output: unknown) =>
  typeof output === "string"
    ? { type: "text" as const, value: output }
    : { type: "json" as const, value: (output ?? null) as JSONValue };
