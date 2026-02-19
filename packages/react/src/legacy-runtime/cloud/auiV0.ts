import type { MessageStatus, ThreadMessage } from "@assistant-ui/core";
import { fromThreadMessageLike } from "../runtime-cores/external-store/ThreadMessageLike";
import { CloudMessage } from "assistant-cloud";
import { isJSONValue } from "../../utils/json/is-json";
import { ReadonlyJSONObject, ReadonlyJSONValue } from "assistant-stream/utils";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";

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
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly args: ReadonlyJSONObject;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly argsText: string;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
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
    };

type AuiV0Message = {
  readonly role: "assistant" | "user" | "system";
  readonly status?: MessageStatus;
  readonly content: readonly AuiV0MessagePart[];
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

export function auiV0Encode(message: ThreadMessage): AuiV0Message {
  // TODO attachments are currently intentionally ignored
  // info: ID and createdAt are ignored (we use the server value instead)

  const status: MessageStatus | undefined =
    message.status?.type === "running"
      ? { type: "incomplete", reason: "cancelled" }
      : message.status;

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
          return {
            type: "source",
            sourceType: part.sourceType,
            id: part.id,
            url: part.url,
            ...(part.title ? { title: part.title } : undefined),
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
          };

        default: {
          if (type.startsWith("data-")) return null;
          const unhandledType = type;
          throw new Error(
            `Message part type not supported by aui/v0: ${unhandledType}`,
          );
        }
      }
    }).filter((part): part is AuiV0MessagePart => part !== null),
    metadata: message.metadata as AuiV0Message["metadata"],
    ...(status ? { status } : undefined),
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
