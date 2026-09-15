import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../../types/message";
import { isJSONValue, isRecord } from "./is-json";

export const MAX_STORED_MESSAGE_DEPTH = 100;

const isStoredGenerativeUINode = (
  value: unknown,
  currentDepth: number = 0,
): boolean => {
  if (currentDepth > MAX_STORED_MESSAGE_DEPTH) return false;
  if (typeof value === "string") return true;
  if (!isRecord(value) || typeof value.component !== "string") return false;

  return (
    (value.props === undefined ||
      (isRecord(value.props) && isJSONValue(value.props))) &&
    (value.key === undefined || typeof value.key === "string") &&
    (value.children === undefined ||
      (Array.isArray(value.children) &&
        value.children.every((child) =>
          isStoredGenerativeUINode(child, currentDepth + 1),
        )))
  );
};

const isStoredGenerativeUISpec = (value: unknown): boolean =>
  isRecord(value) &&
  Object.hasOwn(value, "root") &&
  (isStoredGenerativeUINode(value.root) ||
    (Array.isArray(value.root) &&
      value.root.every((node) => isStoredGenerativeUINode(node))));

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
    (part.audio.format === "mp3" || part.audio.format === "wav"),
  data: (part) => typeof part.name === "string",
  source: (part) =>
    typeof part.id === "string" &&
    (part.sourceType === "url"
      ? typeof part.url === "string"
      : part.sourceType === "document" &&
        typeof part.title === "string" &&
        typeof part.mediaType === "string"),
  "generative-ui": (part) => isStoredGenerativeUISpec(part.spec),
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
