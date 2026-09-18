import type { CompleteAttachment } from "../../types/attachment";
import type {
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "../../types/message";
import { isRecord } from "../../utils/json/is-json";

export const MAX_STORED_MESSAGE_DEPTH = 100;

type StoredPartGuard = (part: Record<string, unknown>) => boolean;

export type StoredMessagePart = Record<string, unknown> & { type: string };

export const isStoredMessageRole = (
  value: unknown,
): value is ThreadMessage["role"] =>
  value === "system" || value === "user" || value === "assistant";

/**
 * Builds the readability predicate for a persistence boundary. A stored part is
 * readable when it passes the guard for its known type, or when its type is
 * unknown and the boundary can still read it.
 *
 * Two field-level differences separate the boundaries. Tool calls:
 * `MessageRepository.export()` writes runtime parts carrying both `args` and
 * `argsText`, while `auiV0Encode` writes exactly one of the two. Unknown types:
 * local storage hands its rows to the runtime untouched, so an unknown type
 * written by a newer release still loads, while the aui/v0 decoder converts a
 * `data-` prefix and throws on anything else unknown.
 */
const makeIsStoredMessagePart = (
  isStoredToolCall: StoredPartGuard,
  isReadableUnknownType: (type: string) => boolean,
) => {
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
    (Object.hasOwn(storedPartGuards, value.type)
      ? storedPartGuards[value.type as keyof typeof storedPartGuards](value)
      : isReadableUnknownType(value.type));
};

export const isStoredMessagePart = makeIsStoredMessagePart(
  (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    isRecord(part.args) &&
    typeof part.argsText === "string",
  () => true,
);

const isStoredAuiV0Part = makeIsStoredMessagePart(
  (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    (part.args === undefined || isRecord(part.args)) &&
    (part.argsText === undefined || typeof part.argsText === "string") &&
    (part.args !== undefined || part.argsText !== undefined),
  (type) => type.startsWith("data-"),
);

const rolePartTypes = {
  user: {
    text: true,
    image: true,
    file: true,
    data: true,
    audio: true,
  } satisfies Record<ThreadUserMessagePart["type"], true>,
  assistant: {
    text: true,
    reasoning: true,
    "tool-call": true,
    source: true,
    file: true,
    image: true,
    data: true,
    "generative-ui": true,
  } satisfies Record<ThreadAssistantMessagePart["type"], true>,
  system: { text: true },
};

/**
 * `fromThreadMessageLike` converts each part through its role's branch and
 * throws on a part that branch does not carry, which would cost the whole
 * stored row. The aui/v0 boundary decodes through that converter, so it filters
 * by role as well as by shape. A part type unknown to this table is left to the
 * boundary predicate, which keeps the `data-` prefixes the converter handles.
 */
export const isStoredAuiV0RolePart = (
  role: ThreadMessage["role"],
  value: unknown,
): value is StoredMessagePart =>
  isStoredAuiV0Part(value) &&
  (Object.hasOwn(rolePartTypes.assistant, value.type) ||
  Object.hasOwn(rolePartTypes.user, value.type)
    ? Object.hasOwn(rolePartTypes[role], value.type)
    : true);

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
