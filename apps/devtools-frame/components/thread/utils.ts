import type {
  ComposerPreview,
  MessagePreview,
  SuggestionPreview,
  ThreadListItemPreview,
  ThreadListPreview,
  ThreadPreview,
} from "./types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const formatBoolean = (value: boolean | undefined) =>
  typeof value === "boolean" ? String(value) : undefined;

export const formatDateTime = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export const truncate = (value: string, max = 120) =>
  value.length > max ? `${value.slice(0, max)}...` : value;

export const extractMessageSummary = (content: unknown): string => {
  if (!Array.isArray(content)) return "";

  for (const part of content) {
    if (!isRecord(part)) continue;
    const type = typeof part["type"] === "string" ? part["type"] : undefined;

    if (
      (type === "text" || type === "reasoning") &&
      typeof part["text"] === "string"
    ) {
      const text = part["text"].trim();
      if (text.length > 0) {
        return truncate(text, 160);
      }
    }

    if (type === "tool-call" && typeof part["toolName"] === "string") {
      return `Tool call: ${part["toolName"]}`;
    }

    if (type === "image" && typeof part["filename"] === "string") {
      return `Image: ${part["filename"]}`;
    }

    if (type === "file" && typeof part["filename"] === "string") {
      return `File: ${part["filename"]}`;
    }
  }

  const fallback = content.find((item) => typeof item === "string") as
    | string
    | undefined;
  if (fallback) {
    return truncate(fallback, 160);
  }

  return "";
};

export const extractAttachmentNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((attachment) => {
      if (!isRecord(attachment)) return null;

      if (
        typeof attachment["name"] === "string" &&
        attachment["name"].length > 0
      ) {
        return attachment["name"];
      }

      if (
        typeof attachment["filename"] === "string" &&
        attachment["filename"].length > 0
      ) {
        return attachment["filename"];
      }

      if (
        typeof attachment["type"] === "string" &&
        attachment["type"].length > 0
      ) {
        return attachment["type"];
      }

      if (typeof attachment["id"] === "string" && attachment["id"].length > 0) {
        return attachment["id"];
      }

      return null;
    })
    .filter((name): name is string => Boolean(name));
};

export const parseSuggestionPreview = (
  value: unknown,
): SuggestionPreview | null => {
  if (!isRecord(value)) return null;
  if (typeof value["prompt"] !== "string") return null;
  return { prompt: value["prompt"] };
};

export const parseComposerPreview = (
  value: unknown,
): ComposerPreview | undefined => {
  if (!isRecord(value)) return undefined;

  const text = typeof value["text"] === "string" ? value["text"] : "";
  const attachments = Array.isArray(value["attachments"])
    ? value["attachments"].length
    : 0;

  return {
    textLength: text.length,
    attachments,
    ...(typeof value["role"] === "string" ? { role: value["role"] } : {}),
    ...(typeof value["isEditing"] === "boolean"
      ? { isEditing: value["isEditing"] }
      : {}),
    ...(typeof value["canCancel"] === "boolean"
      ? { canCancel: value["canCancel"] }
      : {}),
    ...(typeof value["isEmpty"] === "boolean"
      ? { isEmpty: value["isEmpty"] }
      : {}),
    ...(typeof value["type"] === "string" ? { type: value["type"] } : {}),
  };
};

export const parseMessagePreview = (
  value: unknown,
  index: number,
): MessagePreview | null => {
  if (!isRecord(value)) return null;

  const id = typeof value["id"] === "string" ? value["id"] : `message-${index}`;
  const role = typeof value["role"] === "string" ? value["role"] : "unknown";
  const summary = extractMessageSummary(value["content"]);

  return {
    id,
    role,
    summary,
    attachments: extractAttachmentNames(value["attachments"]),
    ...(typeof value["createdAt"] === "string"
      ? { createdAt: value["createdAt"] }
      : {}),
    ...(typeof value["status"] === "string" ? { status: value["status"] } : {}),
  };
};

export const parseThreadListItemPreview = (
  value: unknown,
): ThreadListItemPreview | null => {
  if (!isRecord(value) || typeof value["id"] !== "string") return null;

  return {
    id: value["id"],
    ...(typeof value["title"] === "string" ? { title: value["title"] } : {}),
    ...(typeof value["status"] === "string" ? { status: value["status"] } : {}),
    ...(typeof value["externalId"] === "string"
      ? { externalId: value["externalId"] }
      : {}),
    ...(typeof value["remoteId"] === "string"
      ? { remoteId: value["remoteId"] }
      : {}),
  };
};

export const parseThreadPreview = (value: unknown): ThreadPreview | null => {
  if (!isRecord(value)) return null;

  const messages = Array.isArray(value["messages"])
    ? value["messages"]
        .map((message, index) => parseMessagePreview(message, index))
        .filter((message): message is MessagePreview => Boolean(message))
    : [];

  const suggestions = Array.isArray(value["suggestions"])
    ? value["suggestions"]
        .map((suggestion) => parseSuggestionPreview(suggestion))
        .filter((suggestion): suggestion is SuggestionPreview =>
          Boolean(suggestion),
        )
    : [];

  const capabilities = isRecord(value["capabilities"])
    ? Object.entries(value["capabilities"])
        .filter(([, flag]) => flag === true)
        .map(([name]) => name)
    : [];

  const composer = parseComposerPreview(value["composer"]);

  return {
    messageCount: messages.length,
    messages,
    suggestions,
    capabilities,
    ...(typeof value["isDisabled"] === "boolean"
      ? { isDisabled: value["isDisabled"] }
      : {}),
    ...(typeof value["isLoading"] === "boolean"
      ? { isLoading: value["isLoading"] }
      : {}),
    ...(typeof value["isRunning"] === "boolean"
      ? { isRunning: value["isRunning"] }
      : {}),
    ...(composer ? { composer } : {}),
  };
};

export const parseThreadListPreview = (
  value: unknown,
): ThreadListPreview | null => {
  if (!isRecord(value)) return null;

  const threadItems = Array.isArray(value["threadItems"])
    ? value["threadItems"]
        .map((item) => parseThreadListItemPreview(item))
        .filter((item): item is ThreadListItemPreview => Boolean(item))
    : [];

  const main = parseThreadPreview(value["main"]);

  return {
    threadIds: isStringArray(value["threadIds"]),
    archivedThreadIds: isStringArray(value["archivedThreadIds"]),
    threadItems,
    ...(typeof value["mainThreadId"] === "string"
      ? { mainThreadId: value["mainThreadId"] }
      : {}),
    ...(typeof value["newThreadId"] === "string"
      ? { newThreadId: value["newThreadId"] }
      : value["newThreadId"] === null
        ? { newThreadId: null }
        : {}),
    ...(typeof value["isLoading"] === "boolean"
      ? { isLoading: value["isLoading"] }
      : {}),
    ...(main ? { main } : {}),
  };
};
