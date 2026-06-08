import { isRecord, isStringArray } from "../common";
import { parseMessage } from "../message";
import type { MessagePreview } from "../message";
import type {
  ComposerPreview,
  SuggestionPreview,
  ThreadListItemPreview,
  ThreadListPreview,
  ThreadPreview,
} from "./types";

export const parseSuggestionPreview = (
  value: unknown,
): SuggestionPreview | null => {
  if (!isRecord(value)) return null;
  if (typeof value.prompt !== "string") return null;
  return { prompt: value.prompt };
};

export const parseComposerPreview = (
  value: unknown,
): ComposerPreview | undefined => {
  if (!isRecord(value)) return undefined;

  const text = typeof value.text === "string" ? value.text : "";
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.length
    : 0;

  return {
    textLength: text.length,
    attachments,
    ...(typeof value.role === "string" ? { role: value.role } : {}),
    ...(typeof value.isEditing === "boolean"
      ? { isEditing: value.isEditing }
      : {}),
    ...(typeof value.canCancel === "boolean"
      ? { canCancel: value.canCancel }
      : {}),
    ...(typeof value.isEmpty === "boolean" ? { isEmpty: value.isEmpty } : {}),
    ...(typeof value.type === "string" ? { type: value.type } : {}),
  };
};

const parseMessages = (value: unknown): MessagePreview[] =>
  Array.isArray(value)
    ? value
        .map((message, index) => parseMessage(message, index))
        .filter((message): message is MessagePreview => Boolean(message))
    : [];

export const parseThreadListItemPreview = (
  value: unknown,
): ThreadListItemPreview | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  return {
    id: value.id,
    ...(typeof value.title === "string" ? { title: value.title } : {}),
    ...(typeof value.status === "string" ? { status: value.status } : {}),
    ...(typeof value.externalId === "string"
      ? { externalId: value.externalId }
      : {}),
    ...(typeof value.remoteId === "string" ? { remoteId: value.remoteId } : {}),
  };
};

export const parseThreadPreview = (value: unknown): ThreadPreview | null => {
  if (!isRecord(value)) return null;

  const messages = parseMessages(value.messages);

  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions
        .map((suggestion) => parseSuggestionPreview(suggestion))
        .filter((suggestion): suggestion is SuggestionPreview =>
          Boolean(suggestion),
        )
    : [];

  const capabilities = isRecord(value.capabilities)
    ? Object.entries(value.capabilities)
        .filter(([, flag]) => flag === true)
        .map(([name]) => name)
    : [];

  const composer = parseComposerPreview(value.composer);

  return {
    messageCount: messages.length,
    messages,
    suggestions,
    capabilities,
    ...(typeof value.isDisabled === "boolean"
      ? { isDisabled: value.isDisabled }
      : {}),
    ...(typeof value.isLoading === "boolean"
      ? { isLoading: value.isLoading }
      : {}),
    ...(typeof value.isRunning === "boolean"
      ? { isRunning: value.isRunning }
      : {}),
    ...(composer ? { composer } : {}),
  };
};

export const parseThreadListPreview = (
  value: unknown,
): ThreadListPreview | null => {
  if (!isRecord(value)) return null;

  const threadItems = Array.isArray(value.threadItems)
    ? value.threadItems
        .map((item) => parseThreadListItemPreview(item))
        .filter((item): item is ThreadListItemPreview => Boolean(item))
    : [];

  const main = parseThreadPreview(value.main);

  return {
    threadIds: isStringArray(value.threadIds),
    archivedThreadIds: isStringArray(value.archivedThreadIds),
    threadItems,
    ...(typeof value.mainThreadId === "string"
      ? { mainThreadId: value.mainThreadId }
      : {}),
    ...(typeof value.newThreadId === "string"
      ? { newThreadId: value.newThreadId }
      : value.newThreadId === null
        ? { newThreadId: null }
        : {}),
    ...(typeof value.isLoading === "boolean"
      ? { isLoading: value.isLoading }
      : {}),
    ...(main ? { main } : {}),
  };
};
