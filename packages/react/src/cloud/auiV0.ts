import { JSONObject } from "@ai-sdk/provider";
import { ThreadMessage } from "../types";
import { MessageStatus } from "../types/AssistantTypes";
import { fromThreadMessageLike } from "../runtimes/external-store/ThreadMessageLike";
import { CloudMessage } from "./AssistantCloudThreadMessages";
import { isJSONValue } from "../utils/json/is-json";
import {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../utils/json/json-value";
import { ExportedMessageRepositoryItem } from "../runtimes/utils/MessageRepository";

type AuiV0MessageContentPart =
  | {
      readonly type: "text";
      readonly text: string;
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
    };

type AuiV0Message = {
  readonly role: "assistant" | "user" | "system";
  readonly status?: MessageStatus;
  readonly content: readonly AuiV0MessageContentPart[];
  readonly metadata: {
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly {
      readonly usage?: {
        readonly promptTokens: number;
        readonly completionTokens: number;
      };
    }[];
    readonly custom: Readonly<JSONObject>;
  };
};

export const auiV0Encode = (message: ThreadMessage): AuiV0Message => {
  // TODO attachments are currently intentionally ignored
  // info: ID and createdAt are ignored (we use the server value instead)
  return {
    role: message.role,
    content: message.content.map((part) => {
      const type = part.type;
      switch (type) {
        case "text": {
          return {
            type: "text",
            text: part.text,
          };
        }

        case "tool-call": {
          if (!isJSONValue(part.result)) {
            console.warn(
              "tool-call result is not JSON! " + JSON.stringify(part),
            );
          }
          return {
            type: "tool-call",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            ...(JSON.stringify(part.args) === part.argsText
              ? {
                  args: part.args,
                }
              : { argsText: part.argsText }),
            ...(part.result
              ? { result: part.result as ReadonlyJSONValue }
              : {}),
            ...(part.isError ? { isError: true } : {}),
          };
        }

        default: {
          const unhandledType: "ui" | "image" | "file" | "audio" = type;
          throw new Error(
            `Content part type not supported by aui/v0: ${unhandledType}`,
          );
        }
      }
    }),
    metadata: message.metadata as AuiV0Message["metadata"],
    ...(message.status
      ? {
          status:
            message.status?.type === "running"
              ? {
                  type: "incomplete",
                  reason: "cancelled",
                }
              : message.status,
        }
      : undefined),
  };
};

export const auiV0Decode = (
  cloudMessage: CloudMessage & { format: "aui/v0" },
): ExportedMessageRepositoryItem => {
  const payload = cloudMessage.content as unknown as AuiV0Message;
  const message = fromThreadMessageLike(
    {
      id: cloudMessage.id,
      createdAt: cloudMessage.created_at,
      ...payload,
    },
    cloudMessage.id,
    {
      type: "complete",
      reason: "unknown",
    },
  );

  return {
    parentId: cloudMessage.parent_id,
    message,
  };
};
