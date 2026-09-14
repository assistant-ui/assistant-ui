import type { JSONValue, Tool as AISDKTool } from "ai";
import type { ToolModelContentPart } from "../core/tool/tool-types";

type ToolResultContentPart = Extract<
  Awaited<ReturnType<NonNullable<AISDKTool["toModelOutput"]>>>,
  { type: "content" }
>["value"][number];

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

// Each emitted file shape is checked against the installed `ai` whenever its
// tool-result union names that shape; the peer-ai-v6 leg has no `file` member.
type AssertAssignable<Shape, Member> = [Member] extends [never]
  ? true
  : Shape extends Member
    ? true
    : false;
type FilePart = [
  AssertAssignable<
    TaggedFilePart,
    Extract<ToolResultContentPart, { type: "file" }>
  >,
  AssertAssignable<
    LegacyFilePart,
    Extract<ToolResultContentPart, { type: "file-data" }>
  >,
] extends [true, true]
  ? TaggedFilePart | LegacyFilePart
  : never;

export type ToAISDKContentOptions = {
  /** Emit the ai@7 tagged `file` part (default) or the ai@6 `file-data` part. */
  taggedFileData?: boolean;
};

const toFilePart = (
  part: Extract<ToolModelContentPart, { type: "file" }>,
  taggedFileData: boolean,
): FilePart => {
  const mediaType =
    typeof part.mediaType === "string"
      ? part.mediaType
      : "application/octet-stream";
  const filename = part.filename !== undefined && { filename: part.filename };
  if (taggedFileData) {
    return {
      type: "file",
      data: { type: "data", data: part.data },
      mediaType,
      ...filename,
    };
  }
  return { type: "file-data", data: part.data, mediaType, ...filename };
};

export const toAISDKContent = (
  parts: readonly ToolModelContentPart[],
  { taggedFileData = true }: ToAISDKContentOptions = {},
) => ({
  type: "content" as const,
  value: parts.map((part) =>
    part.type === "text"
      ? { type: "text" as const, text: part.text }
      : toFilePart(part, taggedFileData),
  ) as ToolResultContentPart[],
});

export const toAISDKDefaultOutput = (output: unknown) =>
  typeof output === "string"
    ? { type: "text" as const, value: output }
    : { type: "json" as const, value: (output ?? null) as JSONValue };
