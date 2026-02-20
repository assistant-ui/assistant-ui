import { CloudMessage } from "assistant-cloud";
import { ReadonlyJSONObject, ReadonlyJSONValue } from "assistant-stream/utils";
import { ThreadMessage } from "../../types";
import { MessageStatus } from "../../types/AssistantTypes";
import { isJSONValue } from "../../utils/json/is-json";
import { fromThreadMessageLike } from "../runtime-cores/external-store/ThreadMessageLike";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";

type AuiToolCallPart =
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
    };

type AuiNonComponentMessagePart =
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
  | AuiToolCallPart
  | {
      readonly type: "image";
      readonly image: string;
    }
  | {
      readonly type: "file";
      readonly data: string;
      readonly mimeType: string;
      readonly filename?: string;
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

type AuiComponentMessagePart = {
  readonly type: "component";
  readonly name: string;
  readonly instanceId?: string;
  readonly parentId?: string;
  readonly props?: ReadonlyJSONObject;
};

export type AuiCodecMessagePart =
  | AuiNonComponentMessagePart
  | AuiComponentMessagePart;

export type AuiCodecMessage = {
  readonly role: "assistant" | "user" | "system";
  readonly status?: MessageStatus;
  readonly content: readonly AuiCodecMessagePart[];
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

export const encodeAuiMessage = (
  message: ThreadMessage,
  options: {
    allowComponent: boolean;
    formatLabel: "aui/v0" | "aui/v1";
  },
): AuiCodecMessage => {
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
            ...(part.result !== undefined
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

        case "audio":
          return {
            type: "audio",
            audio: part.audio,
          };

        case "data":
          return {
            type: "data",
            name: part.name,
            data: part.data as ReadonlyJSONValue,
          };

        case "component":
          if (!options.allowComponent) {
            throw new Error(
              `Message part type not supported by ${options.formatLabel}: component`,
            );
          }
          return {
            type: "component",
            name: part.name,
            ...(part.instanceId !== undefined
              ? { instanceId: part.instanceId }
              : {}),
            ...(part.parentId !== undefined ? { parentId: part.parentId } : {}),
            ...(part.props !== undefined ? { props: part.props } : {}),
          };

        default: {
          const unhandledType: never = type;
          throw new Error(
            `Message part type not supported by ${options.formatLabel}: ${unhandledType}`,
          );
        }
      }
    }),
    metadata: message.metadata as AuiCodecMessage["metadata"],
    ...(status ? { status } : undefined),
  };
};

export const decodeAuiMessage = <TFormat extends string>(
  cloudMessage: CloudMessage & { format: TFormat },
): ExportedMessageRepositoryItem => {
  const payload = cloudMessage.content as unknown as AuiCodecMessage;
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
};
