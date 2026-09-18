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
 *
 * The one deliberate per-boundary difference is the tool-call guard: local
 * storage persists runtime `ThreadMessage`s via `MessageRepository.export()`
 * (which carry both `args` and `argsText`), while `auiV0Encode` writes
 * exactly one of the two. Use {@link makeIsStoredMessagePart} to build the
 * predicate for a boundary.
 */
export const MAX_STORED_MESSAGE_DEPTH = 100;

/** Local-storage tool-calls: `MessageRepository.export()` writes runtime parts, which always carry both representations. */
export const localStorageToolCallGuard = (
  part: Record<string, unknown>,
): boolean =>
  typeof part.toolCallId === "string" &&
  typeof part.toolName === "string" &&
  isRecord(part.args) &&
  typeof part.argsText === "string";

/** aui/v0 tool-calls: `auiV0Encode` writes exactly one of `args` / `argsText`. */
export const auiV0ToolCallGuard = (part: Record<string, unknown>): boolean =>
  typeof part.toolCallId === "string" &&
  typeof part.toolName === "string" &&
  (isRecord(part.args) || typeof part.argsText === "string");

export const storedPartGuards = {
  text: (part) => typeof part.text === "string",
  reasoning: (part) =>
    (part.text === undefined || typeof part.text === "string") &&
    (part.unstable_summary === undefined ||
      typeof part.unstable_summary === "string") &&
    (typeof part.text === "string" ||
      typeof part.unstable_summary === "string"),
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
  "tool-call": localStorageToolCallGuard,
} satisfies Record<
  (ThreadUserMessagePart | ThreadAssistantMessagePart)["type"],
  (part: Record<string, unknown>) => boolean
>;

/**
 * Builds the stored-part predicate for a decode boundary. A part is readable
 * when it is not a known type at all (unknown types are kept for forward
 * compatibility with payloads written by newer releases) or when it passes
 * the guard for its known type — with the boundary's tool-call guard.
 */
export const makeIsStoredMessagePart =
  (toolCallGuard: (part: Record<string, unknown>) => boolean) =>
  (value: unknown): value is Record<string, unknown> & { type: string } =>
    isRecord(value) &&
    typeof value.type === "string" &&
    (!Object.hasOwn(storedPartGuards, value.type) ||
      (value.type === "tool-call"
        ? toolCallGuard(value)
        : storedPartGuards[value.type as keyof typeof storedPartGuards](
            value,
          )));

export const isStoredMessagePart = makeIsStoredMessagePart(
  localStorageToolCallGuard,
);

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
