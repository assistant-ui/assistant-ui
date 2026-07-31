import type {
  CompleteAttachment,
  MessageStatus,
  SourceProviderMetadata,
  ThreadMessage,
  ToolApprovalOption,
} from "@assistant-ui/core";
import { fromThreadMessageLike } from "../runtime-cores/external-store/ThreadMessageLike";
import type { CloudMessage } from "assistant-cloud";
import { isJSONValue } from "@assistant-ui/core/internal";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import type { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";

type AuiV0ToolApproval = {
  readonly id: string;
  readonly approved?: boolean;
  readonly reason?: string;
  readonly isAutomatic?: boolean;
  readonly options?: readonly ToolApprovalOption[];
  readonly optionId?: string;
  readonly resolution?: "cancelled" | "expired";
};

type AuiV0MessagePart =
  | {
      readonly type: "text";
      readonly text: string;
    }
  | {
      readonly type: "reasoning";
      readonly text: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "url";
      readonly id: string;
      readonly url: string;
      readonly title?: string;
      readonly providerMetadata?: SourceProviderMetadata;
    }
  | {
      readonly type: "source";
      readonly sourceType: "document";
      readonly id: string;
      readonly title: string;
      readonly mediaType: string;
      readonly filename?: string;
      readonly providerMetadata?: SourceProviderMetadata;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly args: ReadonlyJSONObject;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
      readonly approval?: AuiV0ToolApproval;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly argsText: string;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
      readonly approval?: AuiV0ToolApproval;
    }
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
    };

type AuiV0AttachmentPart =
  | {
      readonly type: "text";
      readonly text: string;
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
      return { type: "text", text: part.text };

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
          return { type: "text", text: part.text };

        case "reasoning":
          return { type: "reasoning", text: part.text };

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
          };

        case "tool-call": {
          if (!isJSONValue(part.result)) {
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
            ...(part.result
              ? { result: part.result as ReadonlyJSONValue }
              : undefined),
            ...(part.isError ? { isError: true } : undefined),
            ...(part.approval ? { approval: part.approval } : undefined),
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
          };

        default: {
          const unhandledType: "audio" | "data" | "generative-ui" = type;
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
  const message = fromThreadMessageLike(
    {
      id: cloudMessage.id,
      createdAt: cloudMessage.created_at,
      ...payload,
    },
    cloudMessage.id,
    { type: "complete", reason: "unknown" },
  );

  return {
    parentId: cloudMessage.parent_id,
    message,
  };
}
