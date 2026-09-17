import type {
  CompleteAttachment,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../../../index";
import { isRecord } from "../../../utils/json/is-json";

/**
 * Shared guards for message parts that were persisted (locally or in the
 * cloud) and are read back without a schema. Both decode boundaries
 * (LocalStorageThreadListAdapter and the aui/v0 cloud history adapter) must
 * answer "is this stored part readable?" the same way, so the table lives
 * here instead of being copied per adapter.
 */
export const MAX_STORED_MESSAGE_DEPTH = 100;

export const storedPartGuards = {
  text: (part) => typeof part.text === "string",
  reasoning: (part) =>
    typeof part.text === "string" || typeof part.unstable_summary === "string",
  image: (part) => typeof part.image === "string",
  file: (part) =>
    typeof part.data === "string" && typeof part.mimeType === "string",
  audio: (part) =>
    isRecord(part.audio) &&
    typeof part.audio.data === "string" &&
    typeof part.audio.format === "string",
  data: (part) => typeof part.name === "string",
  source: (part) =>
    typeof part.id === "string" &&
    (part.sourceType === "url"
      ? typeof part.url === "string"
      : part.sourceType === "document" &&
        typeof part.title === "string" &&
        typeof part.mediaType === "string"),
  "generative-ui": (part) => isRecord(part.spec),
  "tool-call": (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    isRecord(part.args) &&
    typeof part.argsText === "string",
} satisfies Record<
  (ThreadUserMessagePart | ThreadAssistantMessagePart)["type"],
  (part: Record<string, unknown>) => boolean
>;

/**
 * A part is readable when it is not a known type at all (unknown types are
 * kept for forward compatibility with payloads written by newer releases) or
 * when it passes the guard for its known type.
 */
export const isStoredMessagePart = (
  value: unknown,
): value is Record<string, unknown> & { type: string } =>
  isRecord(value) &&
  typeof value.type === "string" &&
  (!Object.hasOwn(storedPartGuards, value.type) ||
    storedPartGuards[value.type as keyof typeof storedPartGuards](value));

export const parseStoredAttachment = (
  value: unknown,
): CompleteAttachment | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.name !== "string" ||
    !isRecord(value.status) ||
    value.status.type !== "complete" ||
    !Array.isArray(value.content)
  ) {
    return null;
  }

  return {
    ...value,
    content: value.content.filter(isStoredMessagePart),
  } as CompleteAttachment;
};
