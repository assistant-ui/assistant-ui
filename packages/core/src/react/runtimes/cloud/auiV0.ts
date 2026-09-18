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
import { isJSONValue, isRecord } from "../../../utils/json/is-json";
import {
  MAX_STORED_MESSAGE_DEPTH,
  isStoredAuiV0RolePart,
  isStoredMessageRole,
  parseStoredAttachment,
  parseStoredDate,
} from "../../../runtime/utils/stored-message-parts";
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

const readableAuiV0Parts = (
  role: AuiV0Message["role"],
  content: readonly unknown[],
  depth: number,
): AuiV0MessagePart[] =>
  content.flatMap((part) => {
    if (!isStoredAuiV0RolePart(role, part)) return [];
    if (part.type !== "tool-call" || part.messages === undefined)
      return [part as unknown as AuiV0MessagePart];

    const { messages, ...toolCall } = part;
    if (!Array.isArray(messages) || depth >= MAX_STORED_MESSAGE_DEPTH)
      return [toolCall as unknown as AuiV0MessagePart];
    return [
      {
        ...toolCall,
        messages: messages.flatMap((message) => {
          const nested = readableAuiV0Message(message, depth + 1);
          return nested ? [nested] : [];
        }),
      } as unknown as AuiV0MessagePart,
    ];
  });

const readableAuiV0Attachments = (
  attachments: readonly unknown[],
): AuiV0Attachment[] =>
  attachments.flatMap((attachment) => {
    const parsed = parseStoredAttachment(attachment, (value) =>
      isStoredAuiV0RolePart("user", value),
    );
    return parsed ? [parsed as unknown as AuiV0Attachment] : [];
  });

const readableAuiV0Message = (
  value: unknown,
  depth: number,
): AuiV0Message | null => {
  if (
    !isRecord(value) ||
    !isStoredMessageRole(value.role) ||
    !Array.isArray(value.content)
  ) {
    return null;
  }

  const { role } = value;
  const content = readableAuiV0Parts(role, value.content, depth);
  // fromThreadMessageLike takes a system row only with exactly one text part,
  // so one that no longer matches after filtering is dropped here rather than
  // costing the row or the tool call that carries it.
  if (role === "system" && content.length !== 1) return null;

  const { attachments, createdAt, ...rest } = value;
  // decodeAuiV0Message turns a nested createdAt into a Date without checking
  // it, and encodeNestedMessage later calls toISOString on the result, so an
  // unparseable one would reject the next write to the message that holds it.
  // Dropping the field falls back to the parent's timestamp.
  const storedCreatedAt = parseStoredDate(createdAt);
  return {
    ...rest,
    ...(storedCreatedAt ? { createdAt } : undefined),
    content,
    // Only a user row carries attachments; fromThreadMessageLike throws on any
    // other role, which would cost the row instead of the misplaced field.
    ...(role === "user" && Array.isArray(attachments)
      ? { attachments: readableAuiV0Attachments(attachments) }
      : undefined),
  } as unknown as AuiV0Message;
};

/**
 * Decodes a stored row, dropping the parts, attachments and nested messages
 * that cannot be read back instead of rejecting the row, and returning null
 * when the row itself is unreadable. Loading a thread must not fail because a
 * single stored row is malformed.
 */
export function auiV0DecodeSafely(
  cloudMessage: CloudMessage & { format: "aui/v0" },
): ExportedMessageRepositoryItem | null {
  try {
    const payload = readableAuiV0Message(cloudMessage.content, 0);
    if (!payload) throw new Error("stored row is not an aui/v0 message");

    return {
      parentId: cloudMessage.parent_id,
      message: decodeAuiV0Message(
        {
          ...payload,
          id: cloudMessage.id,
          createdAt: cloudMessage.created_at,
        },
        cloudMessage.id,
      ),
    };
  } catch (error) {
    console.warn(
      `aui/v0: dropping unreadable message ${cloudMessage.id}`,
      error,
    );
    return null;
  }
}

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
      content: payload.content.map((part, index) => {
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
