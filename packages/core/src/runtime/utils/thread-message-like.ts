import { parsePartialJsonObject } from "assistant-stream/utils";
import { generateId } from "../../utils/id";
import { parseDataUrl } from "../../utils/data-url";
import type {
  ThreadStep,
  MessageStatus,
  ImageMessagePart,
  ThreadMessage,
  ThreadAssistantMessagePart,
  ThreadAssistantMessage,
  ThreadUserMessagePart,
  ThreadUserMessage,
  ThreadSystemMessage,
  DataMessagePart,
} from "../../types/message";
import type { CompleteAttachment } from "../../types/attachment";
import type {
  MessageModality,
  MessageTiming,
  PartProviderMetadata,
  TextMessagePart,
  ToolCallTiming,
  ToolCallMessagePart,
  ToolCallMessagePartMcpMetadata,
  ToolModelContentPart,
  Unstable_ToolInteractionLog,
} from "../../types/message";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import { readToolInteractionLog } from "./tool-interactions";

type DataPrefixedPart = {
  readonly type: `data-${string}`;
  readonly data: any;
};

type ThreadMessageLikePart =
  | ThreadUserMessagePart
  | ThreadAssistantMessagePart
  | DataPrefixedPart
  | {
      readonly type: "tool-call";
      readonly toolCallId?: string;
      readonly toolName: string;
      readonly args?: ReadonlyJSONObject;
      readonly argsText?: string;
      readonly artifact?: any;
      readonly modelContent?: readonly ToolModelContentPart[] | undefined;
      readonly result?: any | undefined;
      readonly isError?: boolean | undefined;
      readonly isPreliminary?: boolean | undefined;
      readonly parentId?: string | undefined;
      readonly messages?: readonly ThreadMessage[] | undefined;
      readonly interrupt?: { type: "human"; payload: unknown };
      readonly timing?: ToolCallTiming;
      readonly mcp?: ToolCallMessagePartMcpMetadata;
      readonly providerMetadata?: PartProviderMetadata;
      readonly approval?: NonNullable<ToolCallMessagePart["approval"]>;
      readonly unstable_interactions?: Unstable_ToolInteractionLog;
    };

export type ThreadMessageLike = {
  readonly role: "assistant" | "user" | "system";
  readonly content: string | readonly ThreadMessageLikePart[];
  readonly id?: string | undefined;
  readonly createdAt?: Date | undefined;
  readonly status?: MessageStatus | undefined;
  readonly attachments?:
    | readonly (Omit<CompleteAttachment, "content"> & {
        readonly content: readonly (ThreadUserMessagePart | DataPrefixedPart)[];
      })[]
    | undefined;
  readonly metadata?:
    | {
        readonly unstable_state?: ReadonlyJSONValue | undefined;
        readonly unstable_annotations?:
          | readonly ReadonlyJSONValue[]
          | undefined;
        readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
        readonly steps?: readonly ThreadStep[] | undefined;
        readonly timing?: MessageTiming | undefined;
        readonly submittedFeedback?:
          | {
              readonly type: "positive" | "negative";
              readonly comment?: string;
            }
          | undefined;
        readonly isOptimistic?: boolean | undefined;
        readonly modality?: MessageModality | undefined;
        readonly custom?: Record<string, unknown> | undefined;
      }
    | undefined;
};

const convertDataPrefixedPart = (
  type: string,
  data: unknown,
): DataMessagePart | undefined => {
  if (!type?.startsWith("data-")) return undefined;
  return { type: "data", name: type.substring(5), data };
};

/**
 * @deprecated This API is experimental and may change without notice.
 */
export const fromThreadMessageLike = (
  like: ThreadMessageLike,
  fallbackId: string,
  fallbackStatus: MessageStatus,
): ThreadMessage => {
  const { role, id, createdAt, attachments, status, metadata } = like;
  const common = {
    id: id ?? fallbackId,
    createdAt: createdAt ?? new Date(),
  };

  const content =
    typeof like.content === "string"
      ? [{ type: "text" as const, text: like.content }]
      : like.content;

  const sanitizeImageContent = ({
    image,
    ...rest
  }: ImageMessagePart): ImageMessagePart | null => {
    if (typeof image !== "string") return null;
    if (parseDataUrl(image)?.mimeType.startsWith("image/")) {
      return { ...rest, image };
    }
    if (/^(https:\/\/|blob:)/i.test(image)) {
      return { ...rest, image };
    }
    console.warn(`Invalid image data format detected`);
    return null;
  };

  if (role !== "user" && attachments?.length)
    throw new Error("attachments are only supported for user messages");

  if (role !== "assistant" && status)
    throw new Error("status is only supported for assistant messages");

  if (role !== "assistant" && metadata?.steps)
    throw new Error("metadata.steps is only supported for assistant messages");

  switch (role) {
    case "assistant":
      return {
        ...common,
        role,
        content: content
          .map((part): ThreadAssistantMessagePart | null => {
            const type = part.type;
            switch (type) {
              case "text":
                if (!part.text?.trim()) return null;
                return part;

              case "reasoning":
                if (!part.text?.trim() && !part.unstable_summary?.trim())
                  return null;
                return part.text == null ? { ...part, text: "" } : part;

              case "file":
              case "source":
                return part;

              case "image":
                return sanitizeImageContent(part);

              case "data":
                return part;

              case "generative-ui":
                return part;

              case "tool-call": {
                const {
                  parentId,
                  messages,
                  unstable_interactions,
                  ...basePart
                } = part;
                const interactions = readToolInteractionLog(
                  unstable_interactions,
                );
                const commonProps = {
                  ...basePart,
                  toolCallId: part.toolCallId || `tool-${generateId()}`,
                  ...(parentId !== undefined && { parentId }),
                  ...(messages !== undefined && { messages }),
                  ...(interactions !== undefined && {
                    unstable_interactions: interactions,
                  }),
                };

                if (part.args) {
                  return {
                    ...commonProps,
                    args: part.args,
                    argsText: part.argsText ?? JSON.stringify(part.args),
                  };
                }
                return {
                  ...commonProps,
                  args: parsePartialJsonObject(part.argsText ?? "") ?? {},
                  argsText: part.argsText ?? "",
                };
              }

              case "audio": {
                const userOnlyType: Exclude<
                  typeof type,
                  ThreadAssistantMessagePart["type"]
                > = type;
                throw new Error(
                  `Unsupported assistant message part type: ${userOnlyType}`,
                );
              }

              default: {
                const dataType: `data-${string}` = type;
                const converted = convertDataPrefixedPart(dataType, part.data);
                if (converted) return converted;
                throw new Error(
                  `Unsupported assistant message part type: ${dataType}`,
                );
              }
            }
          })
          .filter((c) => !!c),
        status: status ?? fallbackStatus,
        metadata: {
          unstable_state: metadata?.unstable_state ?? null,
          unstable_annotations: metadata?.unstable_annotations ?? [],
          unstable_data: metadata?.unstable_data ?? [],
          custom: metadata?.custom ?? {},
          steps: metadata?.steps ?? [],
          ...(metadata?.timing && { timing: metadata.timing }),
          ...(metadata?.submittedFeedback && {
            submittedFeedback: metadata.submittedFeedback,
          }),
          ...(metadata?.isOptimistic && { isOptimistic: true }),
          ...(metadata?.modality && { modality: metadata.modality }),
        },
      } satisfies ThreadAssistantMessage;

    case "user":
      return {
        ...common,
        role,
        content: content
          .filter((part) => part.type !== "text" || part.text != null)
          .map((part): ThreadUserMessagePart => {
            const type = part.type;
            switch (type) {
              case "text":
              case "image":
              case "audio":
              case "file":
              case "data":
                return part;

              case "reasoning":
              case "source":
              case "generative-ui":
              case "tool-call": {
                const assistantOnlyType: Exclude<
                  typeof type,
                  ThreadUserMessagePart["type"]
                > = type;
                throw new Error(
                  `Unsupported user message part type: ${assistantOnlyType}`,
                );
              }

              default: {
                const dataType: `data-${string}` = type;
                const converted = convertDataPrefixedPart(dataType, part.data);
                if (converted) return converted;
                throw new Error(
                  `Unsupported user message part type: ${dataType}`,
                );
              }
            }
          }),
        attachments: (attachments ?? []).map((att) => ({
          ...att,
          content: (att.content ?? []).map((part): ThreadUserMessagePart => {
            const converted = convertDataPrefixedPart(
              part.type,
              (part as DataPrefixedPart).data,
            );
            return converted ?? (part as ThreadUserMessagePart);
          }),
        })),
        metadata: {
          custom: metadata?.custom ?? {},
          ...(metadata?.isOptimistic && { isOptimistic: true }),
          ...(metadata?.modality && { modality: metadata.modality }),
        },
      } satisfies ThreadUserMessage;

    case "system":
      if (content.length !== 1 || content[0]!.type !== "text")
        throw new Error(
          "System messages must have exactly one text message part.",
        );

      return {
        ...common,
        role,
        content: content as [TextMessagePart],
        metadata: {
          custom: metadata?.custom ?? {},
        },
      } satisfies ThreadSystemMessage;

    default: {
      const unsupportedRole: never = role;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};
