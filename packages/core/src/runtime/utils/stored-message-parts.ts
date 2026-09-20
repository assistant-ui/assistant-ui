import type { CompleteAttachment } from "../../types/attachment";
import type {
  MessageStatus,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadStep,
  ThreadUserMessagePart,
} from "../../types/message";
import { isJSONValue, isRecord } from "../../utils/json/is-json";

export const MAX_STORED_MESSAGE_DEPTH = 100;

type StoredPartGuard = (part: Record<string, unknown>) => boolean;

export type StoredMessagePart = Record<string, unknown> & { type: string };

export const parseStoredDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isStoredMessageRole = (
  value: unknown,
): value is ThreadMessage["role"] =>
  value === "system" || value === "user" || value === "assistant";

type StoredStatusGuard = (status: Record<string, unknown>) => boolean;

const storedMessageStatusGuards = {
  running: () => true,
  "requires-action": (status) => typeof status.reason === "string",
  complete: (status) => typeof status.reason === "string",
  incomplete: (status) =>
    (status.reason === undefined || typeof status.reason === "string") &&
    (status.error === undefined || isJSONValue(status.error)),
} satisfies Record<MessageStatus["type"], StoredStatusGuard>;

const storedMessageStatusGuardsByType: Record<string, StoredStatusGuard> =
  storedMessageStatusGuards;

export const isStoredMessageStatus = (value: unknown): value is MessageStatus =>
  isRecord(value) &&
  typeof value.type === "string" &&
  Object.hasOwn(storedMessageStatusGuardsByType, value.type) &&
  storedMessageStatusGuardsByType[value.type]!(value) === true;

const parseStoredThreadStep = (value: unknown): ThreadStep | undefined => {
  if (!isRecord(value)) return undefined;
  if (value.messageId !== undefined && typeof value.messageId !== "string") {
    const { messageId: _, ...step } = value;
    return parseStoredThreadStep(step);
  }
  if (value.usage !== undefined && !isRecord(value.usage)) {
    const { usage: _, ...step } = value;
    return step as ThreadStep;
  }
  return value as ThreadStep;
};

export const parseStoredThreadSteps = (value: unknown): ThreadStep[] =>
  Array.isArray(value)
    ? value
        .map(parseStoredThreadStep)
        .filter((step): step is ThreadStep => step !== undefined)
    : [];

/**
 * Builds the readability predicate for a persistence boundary. A stored part is
 * readable when it passes the guard for its known type, or when its type is
 * unknown and the boundary can still read it.
 *
 * Unknown types are where the boundaries part: local storage hands its rows to
 * the runtime untouched, so a type written by a newer release still loads,
 * while the aui/v0 decoder converts a `data-` prefix and throws on anything
 * else unknown. Per-type differences ride in `overrides`.
 */
const makeIsStoredMessagePart = (
  overrides: Partial<
    Record<
      (ThreadUserMessagePart | ThreadAssistantMessagePart)["type"],
      StoredPartGuard
    >
  >,
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
    "tool-call": (part) =>
      typeof part.toolCallId === "string" &&
      typeof part.toolName === "string" &&
      isRecord(part.args) &&
      typeof part.argsText === "string",
  } satisfies Record<
    (ThreadUserMessagePart | ThreadAssistantMessagePart)["type"],
    StoredPartGuard
  >;
  const guards: Record<string, StoredPartGuard> = {
    ...storedPartGuards,
    ...overrides,
  };

  return (value: unknown): value is StoredMessagePart =>
    isRecord(value) &&
    typeof value.type === "string" &&
    (Object.hasOwn(guards, value.type)
      ? guards[value.type]!(value)
      : isReadableUnknownType(value.type));
};

export const isStoredMessagePart = makeIsStoredMessagePart({}, () => true);

/**
 * The aui/v0 decoder dereferences each present field rather than reading only
 * the one it needs, so this boundary checks every field it will touch, while
 * local storage stays no stricter than what the runtime itself writes.
 */
const isStoredAuiV0Part = makeIsStoredMessagePart(
  {
    reasoning: (part) =>
      (part.text === undefined || typeof part.text === "string") &&
      (part.unstable_summary === undefined ||
        typeof part.unstable_summary === "string") &&
      (typeof part.text === "string" ||
        typeof part.unstable_summary === "string"),
    "tool-call": (part) =>
      typeof part.toolCallId === "string" &&
      typeof part.toolName === "string" &&
      (part.args === undefined || isRecord(part.args)) &&
      (part.argsText === undefined || typeof part.argsText === "string") &&
      (part.args !== undefined || part.argsText !== undefined),
  },
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
  (role === "system"
    ? value.type === "text"
    : Object.hasOwn(rolePartTypes.assistant, value.type) ||
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
