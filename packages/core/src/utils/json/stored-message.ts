import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../../types/message";
import { isRecord } from "./is-json";

const storedPartGuards = {
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

export const isStoredMessagePart = (
  value: unknown,
): value is Record<string, unknown> & { type: string } =>
  isRecord(value) &&
  typeof value.type === "string" &&
  (!Object.hasOwn(storedPartGuards, value.type) ||
    storedPartGuards[value.type as keyof typeof storedPartGuards](value));

export const isKnownStoredMessagePart = (
  value: Record<string, unknown> & { type: string },
) => Object.hasOwn(storedPartGuards, value.type);

export const isStoredAttachment = (
  value: unknown,
): value is Record<string, unknown> & { content: unknown[] } =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.name === "string" &&
  isRecord(value.status) &&
  value.status.type === "complete" &&
  Array.isArray(value.content);
