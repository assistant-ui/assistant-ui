import type {
  MessageStatus,
  SourceProviderMetadata,
  ThreadMessage,
  ToolCallMessagePartMcpMetadata,
  ToolCallTiming,
  ToolApprovalDisplay,
  ToolApprovalOption,
  ReasoningMessagePart,
} from "../../../types/message";
import type { CompleteAttachment } from "../../../types/attachment";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../../runtime/utils/thread-message-like";
import type { CloudMessage } from "assistant-cloud";
import { isJSONValue } from "../../../utils/json/is-json";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import type { ExportedMessageRepositoryItem } from "../../../runtime/utils/message-repository";

type AuiV0ToolApproval = {
  readonly id: string;
  readonly prompt?: string;
  readonly display?: ToolApprovalDisplay;
  readonly allowFreeform?: boolean;
  readonly approved?: boolean;
  readonly reason?: string;
  readonly isAutomatic?: boolean;
  readonly options?: readonly ToolApprovalOption[];
  readonly optionId?: string;
  readonly text?: string;
  readonly resolution?: "cancelled" | "expired";
};

type AuiV0MessagePart =
  | {
      readonly type: "text";
      readonly text: string;
      readonly parentId?: string;
    }
  | {
      readonly type: "reasoning";
      readonly text: string;
      readonly unstable_summary?: string;
      readonly providerMetadata?: NonNullable<
        ReasoningMessagePart["providerMetadata"]
      >;
      readonly parentId?: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "url";
      readonly id: string;
      readonly url: string;
      readonly title?: string;
      readonly providerMetadata?: SourceProviderMetadata;
      readonly parentId?: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "document";
      readonly id: string;
      readonly title: string;
      readonly mediaType: string;
      readonly filename?: string;
      readonly providerMetadata?: SourceProviderMetadata;
      readonly parentId?: string;
    }
  | (AuiV0ToolCallPart &
      ({ readonly args: ReadonlyJSONObject } | { readonly argsText: string }))
  | {
      readonly type: "image";
      readonly image: string;
    }
  | {
      readonly type: "file";
      readonly data: string;
      readonly mimeType: string;
      readonly filename?: string;
      readonly sourceType?: "url" | "id";
      readonly parentId?: string;
    }
  | {
      readonly type: "data";
      readonly name: string;
      readonly data: ReadonlyJSONValue;
    }
  | {
      readonly type: "audio";
      readonly audio: {
        readonly data: string;
        readonly format: "mp3" | "wav";
      };
    }
  | {
      readonly type: "generative-ui";
      readonly spec: ReadonlyJSONObject;
      readonly id?: string;
      readonly parentId?: string;
    };

type AuiV0ToolCallPart = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result?: ReadonlyJSONValue;
  readonly isError?: true;
  readonly interrupt?: {
    readonly type: "human";
    readonly payload: ReadonlyJSONValue;
  };
  readonly timing?: ToolCallTiming;
  readonly mcp?: ToolCallMessagePartMcpMetadata;
  readonly approval?: AuiV0ToolApproval;
  readonly parentId?: string;
  readonly messages?: readonly AuiV0Message[];
};

type AuiV0AttachmentPart =
  | {
      readonly type: "text";
      readonly text: string;
      readonly parentId?: string;
    }
  | {
      readonly type: "image";
      readonly image: string;
      readonly filename?: string;
    }
  | {
      readonly type: "file";
      readonly data: string;
      readonly mimeType: string;
      readonly filename?: string;
      readonly sourceType?: "url" | "id";
      readonly parentId?: string;
    }
  | {
      readonly type: "audio";
      readonly audio: {
        readonly data: string;
        readonly format: "mp3" | "wav";
      };
    }
  | {
      readonly type: "data";
      readonly name: string;
      readonly data: ReadonlyJSONValue;
    };

type AuiV0Attachment = {
  readonly id: string;
  readonly type: CompleteAttachment["type"];
  readonly name: string;
  readonly contentType?: string;
  readonly status: CompleteAttachment["status"];
  readonly content: readonly AuiV0AttachmentPart[];
};

type AuiV0Message = {
  readonly id?: string;
  readonly createdAt?: string;
  readonly role: "assistant" | "user" | "system";
  readonly status?: MessageStatus;
  readonly content: readonly AuiV0MessagePart[];
  readonly attachments?: readonly AuiV0Attachment[];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly {
      readonly usage?: {
        readonly inputTokens: number;
        readonly outputTokens: number;
      };
    }[];
    readonly custom: ReadonlyJSONObject;
  };
};

const encodeAttachmentPart = (
  part: CompleteAttachment["content"][number],
): AuiV0AttachmentPart => {
  const type = part.type;
  switch (type) {
    case "text":
      return {
        type: "text",
        text: part.text,
        ...(part.parentId !== undefined
          ? { parentId: part.parentId }
          : undefined),
      };

    case "image":
      return {
        type: "image",
        image: part.image,
        ...(part.filename != null ? { filename: part.filename } : undefined),
      };

    case "file":
      return {
        type: "file",
        data: part.data,
        mimeType: part.mimeType,
        ...(part.filename != null ? { filename: part.filename } : undefined),
        ...(part.sourceType != null
          ? { sourceType: part.sourceType }
          : undefined),
        ...(part.parentId !== undefined
          ? { parentId: part.parentId }
          : undefined),
      };

    case "audio":
      return {
        type: "audio",
        audio: { data: part.audio.data, format: part.audio.format },
      };

    case "data": {
      if (!isJSONValue(part.data)) {
        console.warn(`attachment data is not JSON! ${JSON.stringify(part)}`);
      }
      return {
        type: "data",
        name: part.name,
        data: part.data as ReadonlyJSONValue,
      };
    }

    default: {
      const unhandledType: never = type;
      throw new Error(
        `Attachment part type not supported by aui/v0: ${unhandledType}`,
      );
    }
  }
};

const encodeAttachments = (
  message: ThreadMessage,
): readonly AuiV0Attachment[] | undefined => {
  if (message.role !== "user" || message.attachments.length === 0) {
    return undefined;
  }

  return message.attachments.map(
    ({ id, type, name, contentType, status, content }) => ({
      id,
      type,
      name,
      status,
      ...(contentType != null ? { contentType } : undefined),
      content: content.map(encodeAttachmentPart),
    }),
  );
};

export function auiV0Encode(message: ThreadMessage): AuiV0Message {
  // info: ID and createdAt are ignored (we use the server value instead)
  const status: MessageStatus | undefined =
    message.status?.type === "running"
      ? { type: "incomplete", reason: "cancelled" }
      : message.status;
  const attachments = encodeAttachments(message);

  return {
    role: message.role,
    content: message.content.map((part) => {
      const type = part.type;
      switch (type) {
        case "text":
          return {
            type: "text",
            text: part.text,
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
          };

        case "reasoning":
          return {
            type: "reasoning",
            text: part.text,
            ...(part.unstable_summary !== undefined
              ? { unstable_summary: part.unstable_summary }
              : undefined),
            ...(part.providerMetadata !== undefined
              ? { providerMetadata: part.providerMetadata }
              : undefined),
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
          };

        case "source":
          if (part.sourceType === "url") {
            return {
              type: "source",
              sourceType: "url",
              id: part.id,
              url: part.url,
              ...(part.title != null ? { title: part.title } : undefined),
              ...(part.providerMetadata != null
                ? { providerMetadata: part.providerMetadata }
                : undefined),
              ...(part.parentId !== undefined
                ? { parentId: part.parentId }
                : undefined),
            };
          }

          return {
            type: "source",
            sourceType: "document",
            id: part.id,
            title: part.title,
            mediaType: part.mediaType,
            ...(part.filename != null
              ? { filename: part.filename }
              : undefined),
            ...(part.providerMetadata != null
              ? { providerMetadata: part.providerMetadata }
              : undefined),
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
          };

        case "tool-call": {
          if (part.result !== undefined && !isJSONValue(part.result)) {
            console.warn(
              `tool-call result is not JSON! ${JSON.stringify(part)}`,
            );
          }
          return {
            type: "tool-call",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            ...(JSON.stringify(part.args) === part.argsText
              ? { args: part.args }
              : { argsText: part.argsText }),
            ...(part.result !== undefined
              ? { result: part.result as ReadonlyJSONValue }
              : undefined),
            ...(part.isError ? { isError: true } : undefined),
            ...(part.interrupt !== undefined
              ? {
                  interrupt: {
                    type: part.interrupt.type,
                    payload: part.interrupt.payload as ReadonlyJSONValue,
                  },
                }
              : undefined),
            ...(part.timing !== undefined
              ? { timing: part.timing }
              : undefined),
            ...(part.mcp !== undefined ? { mcp: part.mcp } : undefined),
            ...(part.approval ? { approval: part.approval } : undefined),
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
            ...(part.messages !== undefined
              ? { messages: part.messages.map(encodeNestedMessage) }
              : undefined),
          };
        }

        case "image":
          return { type: "image", image: part.image };

        case "file":
          return {
            type: "file",
            data: part.data,
            mimeType: part.mimeType,
            ...(part.filename ? { filename: part.filename } : undefined),
            ...(part.sourceType ? { sourceType: part.sourceType } : undefined),
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
          };

        case "data": {
          if (!isJSONValue(part.data)) {
            console.warn(`data part is not JSON! ${JSON.stringify(part)}`);
          }
          return {
            type: "data",
            name: part.name,
            data: part.data as ReadonlyJSONValue,
          };
        }

        case "audio":
          return {
            type: "audio",
            audio: { data: part.audio.data, format: part.audio.format },
          };

        case "generative-ui":
          return {
            type: "generative-ui",
            spec: part.spec as unknown as ReadonlyJSONObject,
            ...(part.id !== undefined ? { id: part.id } : undefined),
            ...(part.parentId !== undefined
              ? { parentId: part.parentId }
              : undefined),
          };

        default: {
          const unhandledType: never = type;
          throw new Error(
            `Message part type not supported by aui/v0: ${unhandledType}`,
          );
        }
      }
    }),
    metadata: message.metadata as AuiV0Message["metadata"],
    ...(status ? { status } : undefined),
    ...(attachments ? { attachments } : undefined),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const auiV0PartGuards = {
  text: (part) => typeof part.text === "string",
  reasoning: (part) =>
    typeof part.text === "string" || typeof part.unstable_summary === "string",
  source: (part) =>
    typeof part.id === "string" &&
    (part.sourceType === "url"
      ? typeof part.url === "string"
      : part.sourceType === "document" &&
        typeof part.title === "string" &&
        typeof part.mediaType === "string"),
  "tool-call": (part) =>
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    (part.args === undefined || isRecord(part.args)) &&
    (part.argsText === undefined || typeof part.argsText === "string"),
  image: (part) => typeof part.image === "string",
  file: (part) =>
    typeof part.data === "string" && typeof part.mimeType === "string",
  data: (part) => typeof part.name === "string",
  audio: (part) =>
    isRecord(part.audio) &&
    typeof part.audio.data === "string" &&
    typeof part.audio.format === "string",
  "generative-ui": (part) => isRecord(part.spec),
} satisfies Record<
  AuiV0MessagePart["type"],
  (part: Record<string, unknown>) => boolean
>;

const isAuiV0MessagePart = (
  value: unknown,
): value is Record<string, unknown> & { type: AuiV0MessagePart["type"] } =>
  isRecord(value) &&
  typeof value.type === "string" &&
  Object.hasOwn(auiV0PartGuards, value.type) &&
  auiV0PartGuards[value.type as keyof typeof auiV0PartGuards](value);

const sanitizeAuiV0Message = (value: unknown): AuiV0Message | null => {
  if (!isRecord(value)) return null;
  if (
    value.role !== "assistant" &&
    value.role !== "user" &&
    value.role !== "system"
  ) {
    return null;
  }
  if (!Array.isArray(value.content)) return null;
  const { role } = value;
  const content = sanitizeAuiV0MessageParts(value.content);
  const attachments =
    role === "user" ? sanitizeAuiV0Attachments(value.attachments) : undefined;
  // A row with nothing readable left is the malformed row itself.
  if (content.length === 0 && (!attachments || attachments.length === 0)) {
    return null;
  }
  return {
    ...value,
    role,
    content,
    ...(attachments !== undefined ? { attachments } : {}),
    // fromThreadMessageLike throws when these appear on the wrong role; drop
    // the misplaced field instead of the whole stored row.
    ...(role === "assistant" ? {} : { status: undefined }),
    ...(role === "assistant" || !isRecord(value.metadata)
      ? {}
      : { metadata: { ...value.metadata, steps: undefined } }),
  } as unknown as AuiV0Message;
};

const sanitizeAuiV0ToolCall = (
  part: Record<string, unknown> & { type: "tool-call" },
): Record<string, unknown> => {
  const { messages, ...toolCall } = part;
  if (!Array.isArray(messages)) return toolCall;
  return {
    ...toolCall,
    messages: messages.flatMap((item) => {
      const message = sanitizeAuiV0Message(item);
      return message ? [message] : [];
    }),
  };
};

const sanitizeAuiV0MessageParts = (content: unknown): AuiV0MessagePart[] =>
  Array.isArray(content)
    ? content.flatMap((part) => {
        if (!isAuiV0MessagePart(part)) return [];
        if (part.type === "tool-call") {
          return [
            sanitizeAuiV0ToolCall(
              part as Record<string, unknown> & { type: "tool-call" },
            ) as AuiV0MessagePart,
          ];
        }
        return [part as AuiV0MessagePart];
      })
    : [];

const sanitizeAuiV0Attachments = (
  attachments: unknown,
): AuiV0Attachment[] | undefined =>
  Array.isArray(attachments)
    ? attachments.flatMap((item) => {
        if (
          !isRecord(item) ||
          typeof item.id !== "string" ||
          typeof item.name !== "string" ||
          !isRecord(item.status) ||
          !Array.isArray(item.content)
        ) {
          return [];
        }
        return [
          {
            ...item,
            content: item.content.filter(isAuiV0MessagePart),
          } as unknown as AuiV0Attachment,
        ];
      })
    : undefined;

export function auiV0Decode(
  cloudMessage: CloudMessage & { format: "aui/v0" },
): ExportedMessageRepositoryItem {
  const payload = cloudMessage.content as unknown as AuiV0Message;
  const message = decodeAuiV0Message(
    {
      ...payload,
      id: cloudMessage.id,
      createdAt: cloudMessage.created_at,
    },
    cloudMessage.id,
  );

  return {
    parentId: cloudMessage.parent_id,
    message,
  };
}

/**
 * Same as {@link auiV0Decode} but returns null instead of throwing when the
 * stored row is malformed; a structurally unreadable row is dropped on its own
 * so the rest of the thread history still loads.
 */
export function auiV0DecodeSafely(
  cloudMessage: CloudMessage & { format: "aui/v0" },
): ExportedMessageRepositoryItem | null {
  const sanitized = sanitizeAuiV0Message(cloudMessage.content);
  if (!sanitized) {
    console.warn(
      `[aui/v0] dropping malformed stored message ${cloudMessage.id}`,
    );
    return null;
  }
  try {
    const message = decodeAuiV0Message(
      {
        ...sanitized,
        id: cloudMessage.id,
        createdAt: cloudMessage.created_at,
      },
      cloudMessage.id,
    );

    return {
      parentId: cloudMessage.parent_id,
      message,
    };
  } catch (error) {
    console.warn(
      `[aui/v0] dropping malformed stored message ${cloudMessage.id}:`,
      error,
    );
    return null;
  }
}

const encodeNestedMessage = (message: ThreadMessage): AuiV0Message => ({
  ...auiV0Encode(message),
  id: message.id,
  createdAt: message.createdAt.toISOString(),
});

const decodeAuiV0Message = (
  payload: Omit<AuiV0Message, "createdAt"> & {
    readonly createdAt?: Date | undefined;
  },
  fallbackId: string,
): ThreadMessage =>
  fromThreadMessageLike(
    {
      ...payload,
      content: sanitizeAuiV0MessageParts(payload.content).map((part, index) => {
        if (part.type !== "tool-call" || part.messages === undefined)
          return part;
        return {
          ...part,
          messages: part.messages.map((message, nestedIndex) =>
            decodeAuiV0Message(
              {
                ...message,
                createdAt:
                  message.createdAt !== undefined
                    ? new Date(message.createdAt)
                    : payload.createdAt,
              },
              message.id ??
                `${fallbackId}-${part.toolCallId}-${index}-${nestedIndex}`,
            ),
          ),
        };
      }),
    } as ThreadMessageLike,
    fallbackId,
    { type: "complete", reason: "unknown" },
  );
