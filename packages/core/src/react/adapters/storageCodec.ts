import type { MessageModality, RunConfig, ThreadMessage } from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import type { MessageStorageEntry } from "../../adapters/thread-history";
import { isRecord } from "../../utils/json/is-json";
import {
  MAX_STORED_MESSAGE_DEPTH,
  isStoredMessageStatus,
  isStoredMessagePart,
  isStoredMessageRole,
  parseStoredAttachment,
  parseStoredDate,
  parseStoredThreadSteps,
} from "../../runtime/utils/stored-message-parts";

export type StoredThreadMetadata = {
  remoteId: string;
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
  custom?: Record<string, unknown> | undefined;
  formats?: string[];
};

export type PendingThreadDeletion = {
  remoteId: string;
  keys: string[];
};

type StoredSystemMessage = Extract<ThreadMessage, { role: "system" }>;
type StoredUserMessage = Extract<ThreadMessage, { role: "user" }>;
type StoredAssistantMessage = Extract<ThreadMessage, { role: "assistant" }>;

export const parseJSON = (raw: string | null): unknown => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
};

const parseStoredThread = (value: unknown): StoredThreadMetadata | null => {
  if (!isRecord(value) || typeof value.remoteId !== "string") return null;

  const status = value.status ?? "regular";
  if (status !== "regular" && status !== "archived") return null;

  return {
    remoteId: value.remoteId,
    status,
    ...(typeof value.externalId === "string"
      ? { externalId: value.externalId }
      : undefined),
    ...(typeof value.title === "string" ? { title: value.title } : undefined),
    ...(isRecord(value.custom) ? { custom: value.custom } : undefined),
    ...(Array.isArray(value.formats) &&
    value.formats.every((format) => typeof format === "string")
      ? { formats: value.formats }
      : undefined),
  };
};

export const parsePendingThreadDeletions = (
  raw: string | null,
): PendingThreadDeletion[] => {
  const parsed = parseJSON(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.remoteId !== "string" ||
      !Array.isArray(item.keys) ||
      item.keys.length === 0 ||
      !item.keys.every((key) => typeof key === "string")
    ) {
      return [];
    }

    return [{ remoteId: item.remoteId, keys: item.keys }];
  });
};

export const formattedMessagesKey = (
  prefix: string,
  remoteId: string,
  format: string,
) => `${prefix}formatted-messages:${JSON.stringify([remoteId, format])}`;

const messageModalities = {
  voice: true,
} satisfies Record<MessageModality, true>;

const isMessageModality = (value: unknown): value is MessageModality =>
  typeof value === "string" && Object.hasOwn(messageModalities, value);

const parseStoredMessageParts = (
  content: unknown[],
  depth: number,
): unknown[] =>
  content.flatMap((part) => {
    if (!isStoredMessagePart(part)) return [];
    if (part.type !== "tool-call" || part.messages === undefined) return [part];

    const { messages, ...toolCall } = part;
    if (!Array.isArray(messages)) return [toolCall];
    return [
      {
        ...toolCall,
        messages: messages.flatMap((item) => {
          const message = parseStoredThreadMessage(item, depth + 1);
          return message ? [message] : [];
        }),
      },
    ];
  });

const parseStoredThreadMessage = (
  value: unknown,
  depth: number,
): ThreadMessage | null => {
  if (depth > MAX_STORED_MESSAGE_DEPTH) return null;
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!isStoredMessageRole(value.role)) return null;
  if (!Array.isArray(value.content)) return null;

  const createdAt = parseStoredDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  const modality = isMessageModality(metadata.modality)
    ? metadata.modality
    : undefined;

  if (value.role === "assistant") {
    const status = isStoredMessageStatus(value.status)
      ? value.status
      : { type: "complete", reason: "unknown" as const };

    const submittedFeedback = isRecord(metadata.submittedFeedback)
      ? metadata.submittedFeedback
      : undefined;
    const submittedFeedbackType = submittedFeedback?.type;
    const submittedFeedbackComment = submittedFeedback?.comment;

    return {
      id: value.id,
      role: "assistant",
      content: parseStoredMessageParts(
        value.content,
        depth,
      ) as StoredAssistantMessage["content"],
      status: status as StoredAssistantMessage["status"],
      createdAt,
      metadata: {
        unstable_state: (metadata.unstable_state ??
          null) as StoredAssistantMessage["metadata"]["unstable_state"],
        unstable_annotations: Array.isArray(metadata.unstable_annotations)
          ? (metadata.unstable_annotations as StoredAssistantMessage["metadata"]["unstable_annotations"])
          : [],
        unstable_data: Array.isArray(metadata.unstable_data)
          ? (metadata.unstable_data as StoredAssistantMessage["metadata"]["unstable_data"])
          : [],
        steps: parseStoredThreadSteps(metadata.steps),
        ...(submittedFeedbackType === "positive" ||
        submittedFeedbackType === "negative"
          ? {
              submittedFeedback: {
                type: submittedFeedbackType,
                ...(typeof submittedFeedbackComment === "string" &&
                submittedFeedbackComment !== ""
                  ? { comment: submittedFeedbackComment }
                  : undefined),
              },
            }
          : undefined),
        ...(metadata.timing !== undefined
          ? {
              timing: metadata.timing as NonNullable<
                StoredAssistantMessage["metadata"]["timing"]
              >,
            }
          : undefined),
        ...(metadata.isOptimistic === true
          ? { isOptimistic: true }
          : undefined),
        ...(modality !== undefined ? { modality } : undefined),
        custom: metadata.custom,
      },
    };
  }

  if (value.role === "user") {
    return {
      id: value.id,
      role: "user",
      content: parseStoredMessageParts(
        value.content,
        depth,
      ) as StoredUserMessage["content"],
      attachments: Array.isArray(value.attachments)
        ? value.attachments.flatMap((item) => {
            const attachment = parseStoredAttachment(item, isStoredMessagePart);
            return attachment ? [attachment] : [];
          })
        : [],
      createdAt,
      metadata: {
        ...(modality !== undefined ? { modality } : undefined),
        custom: metadata.custom,
      },
    };
  }

  const content = parseStoredMessageParts(value.content, depth);
  if (content.length !== 1) return null;

  return {
    id: value.id,
    role: "system",
    content: [content[0] as StoredSystemMessage["content"][0]],
    createdAt,
    metadata: {
      custom: metadata.custom,
    },
  };
};

export const parseStoredThreadMetadata = (
  raw: string | null,
): StoredThreadMetadata[] => {
  const parsed = parseJSON(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    const thread = parseStoredThread(item);
    return thread ? [thread] : [];
  });
};

const parseStoredMessageRepositoryItem = (
  value: unknown,
): ExportedMessageRepositoryItem | null => {
  if (!isRecord(value)) return null;

  const message = parseStoredThreadMessage(value.message, 0);
  if (!message) return null;

  const parentId = value.parentId;
  if (
    parentId !== undefined &&
    parentId !== null &&
    typeof parentId !== "string"
  ) {
    return null;
  }

  return {
    message,
    parentId: parentId ?? null,
    ...(isRecord(value.runConfig)
      ? { runConfig: value.runConfig as RunConfig }
      : undefined),
  };
};

export const parseStoredMessageRepository = (
  raw: string | null,
): ExportedMessageRepository => {
  const parsed = parseJSON(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) {
    return { messages: [] };
  }

  const candidateMessages = parsed.messages.flatMap((item) => {
    const parsedItem = parseStoredMessageRepositoryItem(item);
    return parsedItem ? [parsedItem] : [];
  });

  const acceptedIds = new Set<string>();
  const messages = candidateMessages.flatMap((item) => {
    if (acceptedIds.has(item.message.id)) return [];
    if (item.parentId !== null && !acceptedIds.has(item.parentId)) return [];

    acceptedIds.add(item.message.id);
    return [item];
  });

  const headId =
    parsed.headId === null ||
    (typeof parsed.headId === "string" &&
      messages.some((item) => item.message.id === parsed.headId))
      ? parsed.headId
      : undefined;

  return {
    ...(headId !== undefined ? { headId } : undefined),
    messages,
  };
};

export type StoredFormatEntry = MessageStorageEntry<Record<string, unknown>>;

export const parseStoredFormatEntries = (
  raw: string | null,
  format: string,
): StoredFormatEntry[] => {
  const parsed = parseJSON(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) return [];

  return parsed.messages.flatMap((entry) =>
    isRecord(entry) &&
    typeof entry.id === "string" &&
    (entry.parent_id === null || typeof entry.parent_id === "string") &&
    entry.format === format &&
    isRecord(entry.content)
      ? [
          {
            id: entry.id,
            parent_id: entry.parent_id,
            format,
            content: entry.content,
          },
        ]
      : [],
  );
};

export const serializeStoredThreadMetadata = (
  threads: StoredThreadMetadata[],
) => JSON.stringify(threads);

export const serializePendingThreadDeletions = (
  deletions: PendingThreadDeletion[],
) => JSON.stringify(deletions);

export const serializeStoredMessageRepository = (
  repository: ExportedMessageRepository,
) => JSON.stringify(repository);

export const serializeStoredFormatEntries = (messages: StoredFormatEntry[]) =>
  JSON.stringify({ messages });
