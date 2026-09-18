import type { CompleteAttachment } from "../../types/attachment";
import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../../types/message";
import { isRecord } from "../../utils/json/is-json";

export const MAX_STORED_MESSAGE_DEPTH = 100;

type StoredPartGuard = (part: Record<string, unknown>) => boolean;

export type StoredMessagePart = Record<string, unknown> & { type: string };

/**
 * Builds the readability predicate for a persistence boundary. A stored part is
 * readable when its type is unknown, which is kept so a payload written by a
 * newer release still loads, or when it passes the guard for its known type.
 *
 * Tool calls are the one field-level difference between boundaries, so each
 * boundary supplies its own guard: `MessageRepository.export()` writes runtime
 * parts carrying both `args` and `argsText`, while `auiV0Encode` writes exactly
 * one of the two.
 */
const makeIsStoredMessagePart = (isStoredToolCall: StoredPartGuard) => {
  const storedPartGuards = {
    text: (part) => typeof part.text === "string",
    reasoning: (part) =>
      typeof part.text === "string" ||
      typeof part.unstable_summary === "string",
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
    "tool-call": isStoredToolCall,
  } satisfies Record<
    (ThreadUserMessagePart | ThreadAssistantMessagePart)["type"],
    StoredPartGuard
  >;

  return (value: unknown): value is StoredMessagePart =>
    isRecord(value) &&
    typeof value.type === "string" &&
    (!Object.hasOwn(storedPartGuards, value.type) ||
      storedPartGuards[value.type as keyof typeof storedPartGuards](value));
};

export const isStoredMessagePart = makeIsStoredMessagePart(
  (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    isRecord(part.args) &&
    typeof part.argsText === "string",
);

export const isStoredAuiV0MessagePart = makeIsStoredMessagePart(
  (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    (isRecord(part.args) || typeof part.argsText === "string"),
);

export const parseStoredAttachment = (
  value: unknown,
  isPart: (value: unknown) => value is StoredMessagePart,
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
    content: value.content.filter(isPart),
  } as CompleteAttachment;
};
