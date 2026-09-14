import { type AssistantStream, createAssistantStream } from "assistant-stream";
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAui } from "@assistant-ui/store";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
  ThreadStep,
  RunConfig,
  CompleteAttachment,
  MessageModality,
  MessagePartStreamStatus,
  MessageStatus,
  MessageTiming,
  PartProviderMetadata,
  GenerativeUIMessagePart,
  ToolApprovalOption,
  ToolCallMessagePart,
  ToolModelContentPart,
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import { isJSONObject, isJSONValue, isRecord } from "../../utils/json/is-json";
import {
  RuntimeAdapterProvider,
  type RuntimeAdapters,
} from "../runtimes/RuntimeAdapterProvider";
import type { TitleGenerationAdapter } from "./TitleGenerationAdapter";

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

class KeyedMutationQueue {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(key: string, mutation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key);
    const result = previous ? previous.then(mutation) : mutation();
    const tail = result.then(
      () => undefined,
      () => undefined,
    );

    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });

    return result;
  }
}

const mutationQueues = new WeakMap<AsyncStorageLike, KeyedMutationQueue>();

const getMutationQueue = (storage: AsyncStorageLike): KeyedMutationQueue => {
  let queue = mutationQueues.get(storage);
  if (!queue) {
    queue = new KeyedMutationQueue();
    mutationQueues.set(storage, queue);
  }
  return queue;
};

type LocalStorageAdapterOptions = {
  storage: AsyncStorageLike;
  prefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

type StoredThreadMetadata = {
  remoteId: string;
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
  custom?: Record<string, unknown> | undefined;
};

type StoredSystemMessage = Extract<ThreadMessage, { role: "system" }>;
type StoredUserMessage = Extract<ThreadMessage, { role: "user" }>;
type StoredAssistantMessage = Extract<ThreadMessage, { role: "assistant" }>;
type StoredMessageLikePart = Exclude<
  ThreadMessageLike["content"],
  string
>[number];

const parseJSON = (raw: string | null): unknown => {
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
  };
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isMessageRole = (value: unknown): value is ThreadMessage["role"] =>
  value === "system" || value === "user" || value === "assistant";

const DEFAULT_STORED_MESSAGE_STATUS = {
  type: "complete",
  reason: "unknown",
} as const satisfies MessageStatus;
const MAX_STORED_MESSAGE_DEPTH = 100;
type KnownStoredMessagePartType =
  | StoredAssistantMessage["content"][number]["type"]
  | StoredUserMessage["content"][number]["type"];
const KNOWN_STORED_MESSAGE_PART_TYPES = {
  text: true,
  reasoning: true,
  "tool-call": true,
  source: true,
  file: true,
  image: true,
  data: true,
  "generative-ui": true,
  audio: true,
} satisfies Record<KnownStoredMessagePartType, true>;
const STORED_MESSAGE_MODALITIES = {
  voice: true,
} satisfies Record<MessageModality, true>;

const isStoredMessageModality = (value: unknown): value is MessageModality =>
  typeof value === "string" && Object.hasOwn(STORED_MESSAGE_MODALITIES, value);

const parseStoredMessageStatus = (value: unknown): MessageStatus => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return DEFAULT_STORED_MESSAGE_STATUS;
  }
  if (value.type === "running") return value as MessageStatus;
  if (
    (value.type === "requires-action" ||
      value.type === "complete" ||
      value.type === "incomplete") &&
    (typeof value.reason !== "string" || value.reason.length === 0)
  ) {
    return DEFAULT_STORED_MESSAGE_STATUS;
  }

  return value as unknown as MessageStatus;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseStoredMessageTiming = (value: unknown): MessageTiming | undefined =>
  isRecord(value) ? (value as MessageTiming) : undefined;

const parseStoredPartStatus = (
  value: unknown,
): MessagePartStreamStatus | undefined => {
  if (!isRecord(value)) return undefined;
  if (value.type === "running" || value.type === "complete") {
    return { type: value.type };
  }
  if (
    value.type === "incomplete" &&
    (value.reason === "cancelled" ||
      value.reason === "length" ||
      value.reason === "content-filter" ||
      value.reason === "other" ||
      value.reason === "error")
  ) {
    return { type: "incomplete", reason: value.reason };
  }
  return undefined;
};

const parseStoredProviderMetadata = (
  value: unknown,
): PartProviderMetadata | undefined => {
  if (
    !isRecord(value) ||
    !Object.values(value).every((entry) => isJSONObject(entry))
  ) {
    return undefined;
  }
  return value as PartProviderMetadata;
};

const parseStoredThreadStep = (value: unknown): ThreadStep | null =>
  isRecord(value) ? (value as ThreadStep) : null;

const parseStoredAssistantMetadata = (
  value: unknown,
): StoredAssistantMessage["metadata"] => {
  const metadata = isRecord(value) ? value : {};
  const submittedFeedback = isRecord(metadata.submittedFeedback)
    ? metadata.submittedFeedback
    : undefined;
  const submittedFeedbackType = submittedFeedback?.type;
  const timing = parseStoredMessageTiming(metadata.timing);

  return {
    unstable_state: isJSONValue(metadata.unstable_state)
      ? metadata.unstable_state
      : null,
    unstable_annotations: Array.isArray(metadata.unstable_annotations)
      ? metadata.unstable_annotations.filter((entry) => isJSONValue(entry))
      : [],
    unstable_data: Array.isArray(metadata.unstable_data)
      ? metadata.unstable_data.filter((entry) => isJSONValue(entry))
      : [],
    steps: Array.isArray(metadata.steps)
      ? metadata.steps.flatMap((step) => {
          const parsed = parseStoredThreadStep(step);
          return parsed ? [parsed] : [];
        })
      : [],
    ...(submittedFeedbackType === "positive" ||
    submittedFeedbackType === "negative"
      ? { submittedFeedback: { type: submittedFeedbackType } }
      : undefined),
    ...(timing !== undefined ? { timing } : undefined),
    ...(metadata.isOptimistic === true ? { isOptimistic: true } : undefined),
    ...(isStoredMessageModality(metadata.modality)
      ? { modality: metadata.modality }
      : undefined),
    custom: isRecord(metadata.custom) ? metadata.custom : {},
  };
};

const parseStoredToolModelContent = (
  value: unknown,
): ToolModelContentPart[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((entry): ToolModelContentPart[] => {
    if (!isRecord(entry)) return [];
    if (entry.type === "text" && typeof entry.text === "string") {
      return [{ type: "text", text: entry.text }];
    }
    if (
      entry.type === "file" &&
      typeof entry.data === "string" &&
      typeof entry.mediaType === "string" &&
      (entry.filename === undefined || typeof entry.filename === "string")
    ) {
      return [
        {
          type: "file",
          data: entry.data,
          mediaType: entry.mediaType,
          ...(typeof entry.filename === "string"
            ? { filename: entry.filename }
            : undefined),
        },
      ];
    }
    return [];
  });
};

const parseStoredToolApprovalOption = (
  value: unknown,
): ToolApprovalOption | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.kind !== "string"
  ) {
    return null;
  }

  const confirm =
    value.confirm === true || value.confirm === false
      ? value.confirm
      : isRecord(value.confirm) &&
          (value.confirm.title === undefined ||
            typeof value.confirm.title === "string") &&
          (value.confirm.description === undefined ||
            typeof value.confirm.description === "string")
        ? {
            ...(typeof value.confirm.title === "string"
              ? { title: value.confirm.title }
              : undefined),
            ...(typeof value.confirm.description === "string"
              ? { description: value.confirm.description }
              : undefined),
          }
        : undefined;

  return {
    id: value.id,
    kind: value.kind,
    ...(typeof value.label === "string" ? { label: value.label } : undefined),
    ...(typeof value.description === "string"
      ? { description: value.description }
      : undefined),
    ...(Array.isArray(value.grants) &&
    value.grants.every((grant) => typeof grant === "string")
      ? { grants: value.grants }
      : undefined),
    ...(confirm !== undefined ? { confirm } : undefined),
  };
};

const parseStoredToolApproval = (
  value: unknown,
): ToolCallMessagePart["approval"] | undefined => {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;

  return {
    id: value.id,
    ...(typeof value.prompt === "string"
      ? { prompt: value.prompt }
      : undefined),
    ...(value.display === "decision" ||
    value.display === "select" ||
    value.display === "text"
      ? { display: value.display }
      : undefined),
    ...(typeof value.allowFreeform === "boolean"
      ? { allowFreeform: value.allowFreeform }
      : undefined),
    ...(typeof value.approved === "boolean"
      ? { approved: value.approved }
      : undefined),
    ...(typeof value.reason === "string"
      ? { reason: value.reason }
      : undefined),
    ...(typeof value.isAutomatic === "boolean"
      ? { isAutomatic: value.isAutomatic }
      : undefined),
    ...(Array.isArray(value.options)
      ? {
          options: value.options.flatMap((option) => {
            const parsed = parseStoredToolApprovalOption(option);
            return parsed ? [parsed] : [];
          }),
        }
      : undefined),
    ...(typeof value.optionId === "string"
      ? { optionId: value.optionId }
      : undefined),
    ...(typeof value.text === "string" ? { text: value.text } : undefined),
    ...(value.resolution === "cancelled" || value.resolution === "expired"
      ? { resolution: value.resolution }
      : undefined),
  };
};

const parseStoredToolCall = (
  value: Record<string, unknown>,
  depth: number,
  parentMessageId: string,
  partIndex: number,
  parentCreatedAt: Date,
): StoredMessageLikePart | undefined => {
  if (typeof value.toolName !== "string") return undefined;

  const parsedModelContent = parseStoredToolModelContent(value.modelContent);
  const approval = parseStoredToolApproval(value.approval);
  const providerMetadata = parseStoredProviderMetadata(value.providerMetadata);
  const messages = Array.isArray(value.messages)
    ? value.messages.flatMap((message, messageIndex) => {
        const parsed = parseStoredNestedThreadMessage(
          message,
          depth + 1,
          `${parentMessageId}/part-${partIndex}/message-${messageIndex}`,
          parentCreatedAt,
        );
        return parsed ? [parsed] : [];
      })
    : undefined;
  const timing =
    isRecord(value.timing) && isFiniteNumber(value.timing.startedAt)
      ? {
          startedAt: value.timing.startedAt,
          ...(isFiniteNumber(value.timing.completedAt)
            ? { completedAt: value.timing.completedAt }
            : undefined),
        }
      : undefined;
  const interrupt =
    isRecord(value.interrupt) &&
    value.interrupt.type === "human" &&
    "payload" in value.interrupt &&
    isJSONValue(value.interrupt.payload)
      ? { type: "human" as const, payload: value.interrupt.payload }
      : undefined;
  const mcp =
    isRecord(value.mcp) &&
    (value.mcp.app === undefined ||
      (isRecord(value.mcp.app) &&
        typeof value.mcp.app.resourceUri === "string" &&
        (value.mcp.app.mimeType === undefined ||
          typeof value.mcp.app.mimeType === "string") &&
        (value.mcp.app.serverId === undefined ||
          typeof value.mcp.app.serverId === "string") &&
        (value.mcp.app.visibility === undefined ||
          (Array.isArray(value.mcp.app.visibility) &&
            value.mcp.app.visibility.every(
              (entry) => entry === "model" || entry === "app",
            )))))
      ? value.mcp
      : undefined;

  return {
    type: "tool-call",
    toolCallId:
      typeof value.toolCallId === "string" && value.toolCallId.length > 0
        ? value.toolCallId
        : `${parentMessageId}/part-${partIndex}`,
    toolName: value.toolName,
    ...(isJSONObject(value.args) ? { args: value.args } : undefined),
    ...(typeof value.argsText === "string"
      ? { argsText: value.argsText }
      : undefined),
    ...(isJSONValue(value.result) ? { result: value.result } : undefined),
    ...(typeof value.isError === "boolean"
      ? { isError: value.isError }
      : undefined),
    ...(isJSONValue(value.artifact) ? { artifact: value.artifact } : undefined),
    ...(timing !== undefined ? { timing } : undefined),
    ...(mcp !== undefined ? { mcp } : undefined),
    ...(providerMetadata !== undefined ? { providerMetadata } : undefined),
    ...(parsedModelContent !== undefined
      ? { modelContent: parsedModelContent }
      : undefined),
    ...(interrupt !== undefined ? { interrupt } : undefined),
    ...(approval !== undefined ? { approval } : undefined),
    ...(typeof value.parentId === "string"
      ? { parentId: value.parentId }
      : undefined),
    ...(messages !== undefined ? { messages } : undefined),
  };
};

const isStoredGenerativeUINode = (value: unknown, depth = 0): boolean => {
  if (depth > MAX_STORED_MESSAGE_DEPTH) return false;
  if (typeof value === "string") return true;
  if (!isRecord(value) || typeof value.component !== "string") return false;
  return (
    (value.props === undefined || isJSONObject(value.props)) &&
    (value.key === undefined || typeof value.key === "string") &&
    (value.children === undefined ||
      (Array.isArray(value.children) &&
        value.children.every((child) =>
          isStoredGenerativeUINode(child, depth + 1),
        )))
  );
};

const parseStoredAssistantPart = (
  value: Record<string, unknown>,
  depth: number,
  parentMessageId: string,
  partIndex: number,
  parentCreatedAt: Date,
): StoredMessageLikePart | undefined => {
  const providerMetadata = parseStoredProviderMetadata(value.providerMetadata);
  const parentId =
    typeof value.parentId === "string" ? { parentId: value.parentId } : {};

  switch (value.type) {
    case "text": {
      const status = parseStoredPartStatus(value.status);
      if (typeof value.text !== "string") return undefined;
      return {
        type: "text",
        text: value.text,
        ...parentId,
        ...(status !== undefined ? { status } : undefined),
        ...(providerMetadata !== undefined ? { providerMetadata } : undefined),
      };
    }
    case "reasoning": {
      const status = parseStoredPartStatus(value.status);
      if (
        typeof value.text !== "string" ||
        (value.unstable_summary !== undefined &&
          typeof value.unstable_summary !== "string")
      ) {
        return undefined;
      }
      return {
        type: "reasoning",
        text: value.text,
        ...parentId,
        ...(typeof value.unstable_summary === "string"
          ? { unstable_summary: value.unstable_summary }
          : undefined),
        ...(status !== undefined ? { status } : undefined),
        ...(providerMetadata !== undefined ? { providerMetadata } : undefined),
      };
    }
    case "file":
      if (
        typeof value.data !== "string" ||
        typeof value.mimeType !== "string"
      ) {
        return undefined;
      }
      return {
        type: "file",
        data: value.data,
        mimeType: value.mimeType,
        ...parentId,
        ...(typeof value.filename === "string"
          ? { filename: value.filename }
          : undefined),
        ...(value.sourceType === "url" || value.sourceType === "id"
          ? { sourceType: value.sourceType }
          : undefined),
        ...(providerMetadata !== undefined ? { providerMetadata } : undefined),
      };
    case "image":
      if (typeof value.image !== "string") return undefined;
      return {
        type: "image",
        image: value.image,
        ...(typeof value.filename === "string"
          ? { filename: value.filename }
          : undefined),
        ...(providerMetadata !== undefined ? { providerMetadata } : undefined),
      };
    case "source":
      if (
        value.sourceType === "url" &&
        typeof value.id === "string" &&
        typeof value.url === "string"
      ) {
        return {
          type: "source",
          sourceType: "url",
          id: value.id,
          url: value.url,
          ...parentId,
          ...(typeof value.title === "string"
            ? { title: value.title }
            : undefined),
          ...(providerMetadata !== undefined
            ? { providerMetadata }
            : undefined),
        };
      }
      if (
        value.sourceType === "document" &&
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.mediaType === "string"
      ) {
        return {
          type: "source",
          sourceType: "document",
          id: value.id,
          title: value.title,
          mediaType: value.mediaType,
          ...parentId,
          ...(typeof value.filename === "string"
            ? { filename: value.filename }
            : undefined),
          ...(providerMetadata !== undefined
            ? { providerMetadata }
            : undefined),
        };
      }
      return undefined;
    case "data":
      if (typeof value.name !== "string" || !("data" in value))
        return undefined;
      return { type: "data", name: value.name, data: value.data };
    case "generative-ui":
      if (
        !isRecord(value.spec) ||
        !("root" in value.spec) ||
        !(
          isStoredGenerativeUINode(value.spec.root) ||
          (Array.isArray(value.spec.root) &&
            value.spec.root.every((node) => isStoredGenerativeUINode(node)))
        )
      ) {
        return undefined;
      }
      return {
        type: "generative-ui",
        spec: value.spec as GenerativeUIMessagePart["spec"],
        ...parentId,
        ...(typeof value.id === "string" ? { id: value.id } : undefined),
      };
    case "tool-call":
      return parseStoredToolCall(
        value,
        depth,
        parentMessageId,
        partIndex,
        parentCreatedAt,
      );
    default:
      return undefined;
  }
};

const parseStoredAssistantContent = (
  content: unknown[],
  depth: number,
  parentMessageId: string,
  parentCreatedAt: Date,
): StoredAssistantMessage["content"] =>
  content.flatMap((rawPart, partIndex) => {
    if (!isRecord(rawPart) || typeof rawPart.type !== "string") return [];
    if (!Object.hasOwn(KNOWN_STORED_MESSAGE_PART_TYPES, rawPart.type)) {
      if (!rawPart.type.startsWith("data-")) {
        return [
          rawPart as unknown as StoredAssistantMessage["content"][number],
        ];
      }
      if (!("data" in rawPart)) return [];
    }

    const part = Object.hasOwn(KNOWN_STORED_MESSAGE_PART_TYPES, rawPart.type)
      ? parseStoredAssistantPart(
          rawPart,
          depth,
          parentMessageId,
          partIndex,
          parentCreatedAt,
        )
      : rawPart;
    if (!part) return [];

    if (part.type === "text" || part.type === "reasoning") {
      return [part as unknown as StoredAssistantMessage["content"][number]];
    }

    try {
      const message = fromThreadMessageLike(
        { role: "assistant", content: [part] } as unknown as ThreadMessageLike,
        "stored-part",
        DEFAULT_STORED_MESSAGE_STATUS,
      );
      return message.role === "assistant" ? message.content : [];
    } catch {
      return [];
    }
  });

const isStoredUserContentPart = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "text":
      return typeof value.text === "string";
    case "image":
      return typeof value.image === "string";
    case "file":
      return (
        typeof value.data === "string" && typeof value.mimeType === "string"
      );
    case "audio":
      return (
        isRecord(value.audio) &&
        typeof value.audio.data === "string" &&
        (value.audio.format === "mp3" || value.audio.format === "wav")
      );
    case "data":
      return typeof value.name === "string" && "data" in value;
    default:
      return (
        !Object.hasOwn(KNOWN_STORED_MESSAGE_PART_TYPES, value.type) &&
        (!value.type.startsWith("data-") || "data" in value)
      );
  }
};

const parseStoredUserContent = (
  content: unknown[],
): StoredUserMessage["content"] =>
  content.flatMap((part) => {
    if (!isStoredUserContentPart(part)) return [];
    try {
      const message = fromThreadMessageLike(
        { role: "user", content: [part] } as unknown as ThreadMessageLike,
        "stored-part",
        DEFAULT_STORED_MESSAGE_STATUS,
      );
      return message.role === "user" ? message.content : [];
    } catch {
      return [part as unknown as StoredUserMessage["content"][number]];
    }
  });

const parseStoredSystemContent = (
  content: unknown[],
): StoredSystemMessage["content"][number] => {
  const parts = parseStoredUserContent(content);
  const textPart = parts.find((part) => part.type === "text");
  return textPart ?? { type: "text", text: "" };
};

const parseStoredAttachment = (value: unknown): CompleteAttachment | null => {
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
    id: value.id,
    type: value.type,
    name: value.name,
    status: { type: "complete" },
    content: [...parseStoredUserContent(value.content)],
    ...(typeof value.contentType === "string"
      ? { contentType: value.contentType }
      : undefined),
  };
};

function parseStoredThreadMessage(
  value: unknown,
  depth = 0,
): ThreadMessage | null {
  if (depth > MAX_STORED_MESSAGE_DEPTH) return null;
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!isMessageRole(value.role)) return null;
  if (!Array.isArray(value.content)) return null;

  const createdAt = parseDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  if (value.role === "assistant") {
    return {
      id: value.id,
      role: "assistant",
      content: parseStoredAssistantContent(
        value.content,
        depth,
        value.id,
        createdAt,
      ),
      status: parseStoredMessageStatus(value.status),
      createdAt,
      metadata: parseStoredAssistantMetadata(metadata),
    };
  }

  if (value.role === "user") {
    return {
      id: value.id,
      role: "user",
      content: parseStoredUserContent(value.content),
      attachments: Array.isArray(value.attachments)
        ? value.attachments.flatMap((attachment) => {
            const parsed = parseStoredAttachment(attachment);
            return parsed ? [parsed] : [];
          })
        : [],
      createdAt,
      metadata: {
        ...(isStoredMessageModality(metadata.modality)
          ? { modality: metadata.modality }
          : undefined),
        custom: metadata.custom,
      },
    };
  }

  const content = parseStoredSystemContent(value.content);

  return {
    id: value.id,
    role: "system",
    content: [content],
    createdAt,
    metadata: { custom: metadata.custom },
  };
}

function parseStoredNestedThreadMessage(
  value: unknown,
  depth: number,
  fallbackId: string,
  fallbackCreatedAt: Date,
): ThreadMessage | null {
  const parsed =
    isRecord(value) && value.id === ""
      ? null
      : parseStoredThreadMessage(value, depth);
  if (parsed || depth > MAX_STORED_MESSAGE_DEPTH || !isRecord(value)) {
    return parsed;
  }
  if (!isMessageRole(value.role) || !Array.isArray(value.content)) return null;
  const id =
    typeof value.id === "string" && value.id.length > 0 ? value.id : fallbackId;
  const createdAt = parseDate(value.createdAt) ?? fallbackCreatedAt;

  if (value.role === "assistant") {
    return {
      id,
      role: "assistant",
      content: parseStoredAssistantContent(value.content, depth, id, createdAt),
      status: parseStoredMessageStatus(value.status),
      createdAt,
      metadata: parseStoredAssistantMetadata(value.metadata),
    };
  }
  if (value.role === "user") {
    return {
      id,
      role: "user",
      content: parseStoredUserContent(value.content),
      attachments: Array.isArray(value.attachments)
        ? value.attachments.flatMap((attachment) => {
            const parsedAttachment = parseStoredAttachment(attachment);
            return parsedAttachment ? [parsedAttachment] : [];
          })
        : [],
      createdAt,
      metadata: {
        ...(isRecord(value.metadata) &&
        isStoredMessageModality(value.metadata.modality)
          ? { modality: value.metadata.modality }
          : undefined),
        custom:
          isRecord(value.metadata) && isRecord(value.metadata.custom)
            ? value.metadata.custom
            : {},
      },
    };
  }

  const content = parseStoredSystemContent(value.content);

  return {
    id,
    role: "system",
    content: [content],
    createdAt,
    metadata: {
      custom:
        isRecord(value.metadata) && isRecord(value.metadata.custom)
          ? value.metadata.custom
          : {},
    },
  };
}

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

  const message = parseStoredThreadMessage(value.message);
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

class AsyncStorageHistoryAdapter implements ThreadHistoryAdapter {
  private storage: AsyncStorageLike;
  private getAui: () => ReturnType<typeof useAui>;
  private prefix: string;
  private mutationQueue: KeyedMutationQueue;

  constructor(
    storage: AsyncStorageLike,
    getAui: () => ReturnType<typeof useAui>,
    prefix: string,
    mutationQueue: KeyedMutationQueue,
  ) {
    this.storage = storage;
    this.getAui = getAui;
    this.prefix = prefix;
    this.mutationQueue = mutationQueue;
  }

  private get aui(): ReturnType<typeof useAui> {
    return this.getAui();
  }

  private _messagesKey(remoteId: string) {
    return `${this.prefix}messages:${remoteId}`;
  }

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.aui.threadListItem.getState().remoteId;
    if (!remoteId) return { messages: [] };

    const raw = await this.storage.getItem(this._messagesKey(remoteId));
    return parseStoredMessageRepository(raw);
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    const { remoteId } = await this.aui.threadListItem.initialize();

    const key = this._messagesKey(remoteId);
    await this.mutationQueue.run(key, async () => {
      const raw = await this.storage.getItem(key);
      const stored = parseJSON(raw);
      const repository = isRecord(stored) ? stored : {};
      const messages = Array.isArray(repository.messages)
        ? [...repository.messages]
        : [];

      const idx = messages.findIndex(
        (entry) =>
          isRecord(entry) &&
          isRecord(entry.message) &&
          entry.message.id === item.message.id,
      );
      if (idx >= 0) {
        messages[idx] = item;
      } else {
        messages.push(item);
      }

      await this.storage.setItem(
        key,
        JSON.stringify({
          ...repository,
          messages,
          headId: item.message.id,
        }),
      );
    });
  }
}

const useLocalStorageThreadAdapters = (
  storage: AsyncStorageLike,
  prefix: string,
  mutationQueue: KeyedMutationQueue,
): RuntimeAdapters => {
  const aui = useAui();
  // Not useEffectEvent: history adapter methods run during render (SSR load).
  const auiRef = useRef(aui);
  useEffect(() => {
    auiRef.current = aui;
  });
  const [history] = useState(
    () =>
      new AsyncStorageHistoryAdapter(
        storage,
        () => auiRef.current,
        prefix,
        mutationQueue,
      ),
  );
  return useMemo(() => ({ history }), [history]);
};

const createHistoryProvider = (
  storage: AsyncStorageLike,
  prefix: string,
  mutationQueue: KeyedMutationQueue,
): FC<PropsWithChildren> => {
  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const adapters = useLocalStorageThreadAdapters(
      storage,
      prefix,
      mutationQueue,
    );
    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };
  return Provider;
};

export const createLocalStorageAdapter = (
  options: LocalStorageAdapterOptions,
): RemoteThreadListAdapter => {
  const { storage, prefix = "@assistant-ui:", titleGenerator } = options;

  const threadsKey = `${prefix}threads`;
  const messagesKey = (threadId: string) => `${prefix}messages:${threadId}`;
  const mutationQueue = getMutationQueue(storage);

  const loadThreadMetadata = async (): Promise<StoredThreadMetadata[]> => {
    const raw = await storage.getItem(threadsKey);
    return parseStoredThreadMetadata(raw);
  };

  const saveThreadMetadata = async (
    threads: StoredThreadMetadata[],
  ): Promise<void> => {
    await storage.setItem(threadsKey, JSON.stringify(threads));
  };

  const updateThreadMetadata = async (
    remoteId: string,
    update: (thread: StoredThreadMetadata) => void,
  ): Promise<void> => {
    await mutationQueue.run(threadsKey, async () => {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === remoteId);
      if (thread) {
        update(thread);
        await saveThreadMetadata(threads);
      }
    });
  };

  const adapter: RemoteThreadListAdapter = {
    unstable_Provider: createHistoryProvider(storage, prefix, mutationQueue),
    unstable_useAdapters: function useLocalStorageAdapters() {
      return useLocalStorageThreadAdapters(storage, prefix, mutationQueue);
    },

    async list(): Promise<RemoteThreadListResponse> {
      const threads = await loadThreadMetadata();
      return {
        threads: threads.map((t) => ({
          remoteId: t.remoteId,
          externalId: t.externalId,
          status: t.status,
          title: t.title,
          custom: t.custom,
        })),
      };
    },

    async initialize(
      threadId: string,
    ): Promise<RemoteThreadInitializeResponse> {
      const remoteId = threadId;
      return mutationQueue.run(threadsKey, async () => {
        const threads = await loadThreadMetadata();

        // Only add if not already present
        if (!threads.some((t) => t.remoteId === remoteId)) {
          threads.unshift({
            remoteId,
            status: "regular",
          });
          await saveThreadMetadata(threads);
        }

        return { remoteId, externalId: undefined };
      });
    },

    async rename(remoteId: string, newTitle: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.title = newTitle;
      });
    },

    async updateCustom(
      remoteId: string,
      custom: Record<string, unknown> | undefined,
    ): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.custom = custom;
      });
    },

    async archive(remoteId: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.status = "archived";
      });
    },

    async unarchive(remoteId: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.status = "regular";
      });
    },

    async delete(remoteId: string): Promise<void> {
      await mutationQueue.run(threadsKey, async () => {
        const threads = await loadThreadMetadata();
        const filtered = threads.filter((t) => t.remoteId !== remoteId);
        await saveThreadMetadata(filtered);
      });
      const key = messagesKey(remoteId);
      await mutationQueue.run(key, () => storage.removeItem(key));
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === threadId);
      if (!thread)
        throw new Error(
          `Stored thread "${threadId}" not found while fetching thread metadata.`,
        );
      return {
        remoteId: thread.remoteId,
        externalId: thread.externalId,
        status: thread.status,
        title: thread.title,
        custom: thread.custom,
      };
    },

    async generateTitle(
      remoteId: string,
      messages: readonly ThreadMessage[],
    ): Promise<AssistantStream> {
      if (titleGenerator) {
        const title = await titleGenerator.generateTitle(messages);

        // Update the stored title
        await updateThreadMetadata(remoteId, (thread) => {
          thread.title = title;
        });

        // Return a stream with a single text part
        return createAssistantStream((controller) => {
          controller.appendText(title);
        });
      }

      // No title generator — return empty stream
      return createAssistantStream(() => {});
    },
  };

  return adapter;
};
