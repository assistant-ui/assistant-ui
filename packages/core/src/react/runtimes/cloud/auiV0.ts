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
  isStoredAttachment,
  isKnownStoredMessagePart,
  isStoredMessagePart,
} from "../../../utils/json/stored-message";
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

type AuiV0MessageInput = Omit<AuiV0Message, "createdAt"> & {
  readonly createdAt?: Date | undefined;
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

const isAuiV0ToolCallPart = (part: Record<string, unknown>) =>
  part.type === "tool-call" &&
  typeof part.toolCallId === "string" &&
  typeof part.toolName === "string" &&
  (isRecord(part.args) || typeof part.argsText === "string");

const isAuiV0StoredMessagePart = (
  value: unknown,
): value is Record<string, unknown> & { type: string } => {
  if (!isStoredMessagePart(value)) return false;
  if (value.type === "audio") {
    return (
      isRecord(value.audio) &&
      (value.audio.format === "mp3" || value.audio.format === "wav")
    );
  }
  return value.type !== "data" || value.data !== undefined;
};

const isAuiV0MessagePart = (
  value: unknown,
): value is Record<string, unknown> & { type: string } =>
  isAuiV0StoredMessagePart(value) ||
  (isRecord(value) && isAuiV0ToolCallPart(value));

const decodeAuiV0Attachments = (
  attachments: unknown,
): {
  attachments: ThreadMessageLike["attachments"] | undefined;
  unreadableAttachmentCount: number;
} => {
  if (attachments === undefined) {
    return { attachments: undefined, unreadableAttachmentCount: 0 };
  }
  if (!Array.isArray(attachments)) {
    throw new Error("Cloud message attachments must be an array.");
  }

  let unreadableAttachmentCount = 0;
  return {
    attachments: attachments.flatMap<CompleteAttachment>((attachment) => {
      if (!isStoredAttachment(attachment)) {
        unreadableAttachmentCount += 1;
        return [];
      }
      return [
        {
          ...attachment,
          content: attachment.content.filter(isAuiV0StoredMessagePart),
        } as unknown as CompleteAttachment,
      ];
    }),
    unreadableAttachmentCount,
  };
};

const decodeAuiV0MessagePart = (
  part: unknown,
  payload: AuiV0MessageInput,
  fallbackId: string,
  index: number,
  depth: number,
): { content: readonly unknown[]; unreadablePartCount: number } => {
  if (!isAuiV0MessagePart(part)) {
    return { content: [], unreadablePartCount: 1 };
  }

  let decodedPart: Record<string, unknown> = part;
  let unreadablePartCount = 0;
  if (part.type === "tool-call" && part.messages !== undefined) {
    const { messages, ...toolCall } = part;
    decodedPart = Array.isArray(messages)
      ? {
          ...toolCall,
          messages: messages.flatMap((message, nestedIndex) => {
            if (!isRecord(message)) {
              unreadablePartCount += 1;
              return [];
            }
            try {
              const createdAt =
                message.createdAt !== undefined
                  ? new Date(String(message.createdAt))
                  : payload.createdAt;
              return [
                decodeAuiV0Message(
                  {
                    ...message,
                    ...(createdAt !== undefined ? { createdAt } : {}),
                  } as unknown as AuiV0MessageInput,
                  typeof message.id === "string"
                    ? message.id
                    : `${fallbackId}-${part.toolCallId}-${index}-${nestedIndex}`,
                  depth + 1,
                ),
              ];
            } catch {
              unreadablePartCount += 1;
              return [];
            }
          }),
        }
      : toolCall;
  }

  if (part.type !== "tool-call" && !isKnownStoredMessagePart(part)) {
    if (!part.type.startsWith("data-")) {
      return { content: [decodedPart], unreadablePartCount };
    }
  }

  try {
    return {
      content: fromThreadMessageLike(
        {
          role: payload.role,
          content: [decodedPart],
        } as unknown as ThreadMessageLike,
        `${fallbackId}-${index}`,
        { type: "complete", reason: "unknown" },
      ).content,
      unreadablePartCount,
    };
  } catch {
    return { content: [], unreadablePartCount: unreadablePartCount + 1 };
  }
};

const decodeAuiV0Message = (
  payload: AuiV0MessageInput,
  fallbackId: string,
  depth = 0,
): ThreadMessage => {
  if (depth > MAX_STORED_MESSAGE_DEPTH) {
    throw new Error("Cloud message nesting exceeds the maximum depth.");
  }

  if (!Array.isArray(payload.content)) {
    throw new Error("Cloud message content must be an array.");
  }

  const decodedParts = payload.content.map((part, index) =>
    decodeAuiV0MessagePart(part, payload, fallbackId, index, depth),
  );
  const unreadablePartCount = decodedParts.reduce(
    (count, part) => count + part.unreadablePartCount,
    0,
  );
  const { attachments, unreadableAttachmentCount } = decodeAuiV0Attachments(
    payload.attachments,
  );
  const unreadableItemCount = unreadablePartCount + unreadableAttachmentCount;
  if (unreadableItemCount > 0) {
    console.warn(
      `[assistant-ui] Dropped ${unreadableItemCount} unreadable persisted item${unreadableItemCount === 1 ? "" : "s"} from cloud message ${fallbackId}.`,
    );
  }
  const content = decodedParts.flatMap((part) => part.content);
  if (payload.role === "system") {
    return fromThreadMessageLike(
      { ...payload, content, attachments } as unknown as ThreadMessageLike,
      fallbackId,
      { type: "complete", reason: "unknown" },
    );
  }

  const message = fromThreadMessageLike(
    { ...payload, content: [], attachments } as unknown as ThreadMessageLike,
    fallbackId,
    { type: "complete", reason: "unknown" },
  );
  return { ...message, content } as unknown as ThreadMessage;
};
