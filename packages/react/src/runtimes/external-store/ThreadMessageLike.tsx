import { parsePartialJsonObject } from "assistant-stream/utils";
import { generateId } from "../../utils/idUtils";
import {
  MessageStatus,
  TextMessagePart,
  ImageMessagePart,
  ThreadMessage,
  ThreadAssistantMessagePart,
  ThreadAssistantMessage,
  ThreadUserMessagePart,
  ThreadUserMessage,
  ThreadSystemMessage,
  CompleteAttachment,
  FileMessagePart,
  Unstable_AudioMessagePart,
} from "../../types";
import {
  ReasoningMessagePart,
  SourceMessagePart,
  ThreadStep,
} from "../../types/AssistantTypes";
import { ReadonlyJSONObject, ReadonlyJSONValue } from "assistant-stream/utils";
import { RoleMapping, mapRole } from "./RoleMapping";

export type ThreadMessageLike = {
  readonly role: "assistant" | "user" | "system" | (string & {});
  readonly content:
    | string
    | readonly (
        | TextMessagePart
        | ReasoningMessagePart
        | SourceMessagePart
        | ImageMessagePart
        | FileMessagePart
        | Unstable_AudioMessagePart
        | {
            readonly type: "tool-call";
            readonly toolCallId?: string;
            readonly toolName: string;
            readonly args?: ReadonlyJSONObject;
            readonly argsText?: string;
            readonly artifact?: any;
            readonly result?: any | undefined;
            readonly isError?: boolean | undefined;
          }
      )[];
  readonly id?: string | undefined;
  readonly createdAt?: Date | undefined;
  readonly status?: MessageStatus | undefined;
  readonly attachments?: readonly CompleteAttachment[] | undefined;
  readonly metadata?:
    | {
        readonly unstable_state?: ReadonlyJSONValue;
        readonly unstable_annotations?:
          | readonly ReadonlyJSONValue[]
          | undefined;
        readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
        readonly steps?: readonly ThreadStep[] | undefined;
        readonly custom?: Record<string, unknown> | undefined;
      }
    | undefined;
};

export const fromThreadMessageLike = (
  like: ThreadMessageLike,
  fallbackId: string,
  fallbackStatus: MessageStatus,
  roleMapping?: RoleMapping,
): ThreadMessage => {
  const {
    role: originalRole,
    id,
    createdAt,
    attachments,
    status,
    metadata,
  } = like;
  const common = {
    id: id ?? fallbackId,
    createdAt: createdAt ?? new Date(),
  };

  const mappedRole = mapRole(originalRole, roleMapping);

  const enhancedMetadata =
    originalRole !== mappedRole
      ? {
          ...metadata,
          custom: {
            ...metadata?.custom,
            originalRole,
          },
        }
      : metadata;

  const content =
    typeof like.content === "string"
      ? [{ type: "text" as const, text: like.content }]
      : like.content;

  if (mappedRole !== "user" && attachments?.length)
    throw new Error("attachments are only supported for user messages");

  if (mappedRole !== "assistant" && status)
    throw new Error("status is only supported for assistant messages");

  if (mappedRole !== "assistant" && enhancedMetadata?.steps)
    throw new Error("metadata.steps is only supported for assistant messages");

  switch (mappedRole) {
    case "assistant":
      return {
        ...common,
        role: mappedRole,
        content: content
          .map((part): ThreadAssistantMessagePart | null => {
            const type = part.type;
            switch (type) {
              case "text":
              case "reasoning":
                if (part.text.trim().length === 0) return null;
                return part;

              case "file":
              case "source":
                return part;

              case "tool-call": {
                if (part.args) {
                  return {
                    ...part,
                    toolCallId: part.toolCallId ?? "tool-" + generateId(),
                    args: part.args,
                    argsText: JSON.stringify(part.args),
                  };
                }
                return {
                  ...part,
                  toolCallId: part.toolCallId ?? "tool-" + generateId(),
                  args:
                    part.args ??
                    parsePartialJsonObject(part.argsText ?? "") ??
                    {},
                  argsText: part.argsText ?? "",
                };
              }

              default: {
                const unhandledType: "image" | "audio" = type;
                throw new Error(
                  `Unsupported assistant message part type: ${unhandledType}`,
                );
              }
            }
          })
          .filter((c) => !!c),
        status: status ?? fallbackStatus,
        metadata: {
          unstable_state: enhancedMetadata?.unstable_state ?? null,
          unstable_annotations: enhancedMetadata?.unstable_annotations ?? [],
          unstable_data: enhancedMetadata?.unstable_data ?? [],
          custom: enhancedMetadata?.custom ?? {},
          steps: enhancedMetadata?.steps ?? [],
        },
      } satisfies ThreadAssistantMessage;

    case "user":
      return {
        ...common,
        role: mappedRole,
        content: content.map((part): ThreadUserMessagePart => {
          const type = part.type;
          switch (type) {
            case "text":
            case "image":
            case "audio":
            case "file":
              return part;

            default: {
              const unhandledType: "tool-call" | "reasoning" | "source" = type;
              throw new Error(
                `Unsupported user message part type: ${unhandledType}`,
              );
            }
          }
        }),
        attachments: attachments ?? [],
        metadata: {
          custom: enhancedMetadata?.custom ?? {},
        },
      } satisfies ThreadUserMessage;

    case "system":
      if (content.length !== 1 || content[0]!.type !== "text")
        throw new Error(
          "System messages must have exactly one text message part.",
        );

      return {
        ...common,
        role: mappedRole,
        content: content as [TextMessagePart],
        metadata: {
          custom: enhancedMetadata?.custom ?? {},
        },
      } satisfies ThreadSystemMessage;

    default: {
      const unsupportedRole: never = mappedRole;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};
