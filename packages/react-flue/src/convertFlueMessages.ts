import {
  fromThreadMessageLike,
  toAssistantError,
  type AppendMessage,
  type CompleteAttachment,
  type DataMessagePart,
  type FileMessagePart,
  type MessageStatus,
  type PartProviderMetadata,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ThreadMessageLike,
  type ThreadUserMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  httpUrlPattern,
  resolveFilePartSource,
} from "@assistant-ui/core/internal";
import type {
  DeliveredAttachment,
  FlueConversationMessage,
  FlueConversationPart,
} from "@flue/react";

const ASSISTANT_COMPLETE_STATUS = {
  type: "complete",
  reason: "stop",
} satisfies MessageStatus;

const ASSISTANT_RUNNING_STATUS = {
  type: "running",
} satisfies MessageStatus;

const USER_STATUS = {
  type: "complete",
  reason: "unknown",
} satisfies MessageStatus;

export type ConvertFlueMessagesOptions = {
  readonly error?: unknown;
  readonly isRunning?: boolean | undefined;
  readonly getCreatedAt?:
    | ((message: FlueConversationMessage) => Date)
    | undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toJsonObject = (value: unknown): ToolCallMessagePart["args"] => {
  if (isRecord(value)) return value as ToolCallMessagePart["args"];
  if (value === undefined) return {};
  return { value } as ToolCallMessagePart["args"];
};

const stringifyArgs = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "";
  }
};

const toProviderMetadata = (
  value: Record<string, unknown>,
): PartProviderMetadata => ({ flue: value as PartProviderMetadata[string] });

const convertToolPart = (
  part: Extract<FlueConversationPart, { type: "dynamic-tool" }>,
): ToolCallMessagePart => {
  const common: ToolCallMessagePart = {
    type: "tool-call",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    args: toJsonObject(part.input),
    argsText: stringifyArgs(part.input),
    ...(part.durationMs !== undefined && {
      providerMetadata: toProviderMetadata({ durationMs: part.durationMs }),
    }),
  };

  switch (part.state) {
    case "output-available":
      return { ...common, result: part.output };
    case "output-error":
      return {
        ...common,
        result: { error: part.errorText },
        isError: true,
      };
    default:
      return common;
  }
};

const convertFilePart = (
  part: Extract<FlueConversationPart, { type: "file" }>,
): FileMessagePart | null => {
  if (part.url === undefined) return null;
  return {
    type: "file",
    data: part.url,
    mimeType: part.mediaType,
    ...(httpUrlPattern.test(part.url) && { sourceType: "url" as const }),
    ...(part.filename && { filename: part.filename }),
    ...((part.id !== undefined || part.size !== undefined) && {
      providerMetadata: toProviderMetadata({
        ...(part.id !== undefined && { id: part.id }),
        ...(part.size !== undefined && { size: part.size }),
      }),
    }),
  };
};

const convertDataPart = (
  part: Extract<FlueConversationPart, { type: `data-${string}` }>,
): DataMessagePart => ({
  type: "data",
  name: part.type.slice("data-".length),
  data: part.data,
});

const convertAssistantPart = (
  part: FlueConversationPart,
): ThreadAssistantMessagePart | null => {
  switch (part.type) {
    case "text":
    case "reasoning":
      return {
        type: part.type,
        text: part.text,
        status: { type: part.state === "done" ? "complete" : "running" },
      };
    case "dynamic-tool":
      return convertToolPart(part);
    case "file":
      return convertFilePart(part);
    default:
      return convertDataPart(part);
  }
};

const convertUserPart = (
  part: FlueConversationPart,
): ThreadUserMessagePart | null => {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "file":
      return convertFilePart(part);
    default:
      return null;
  }
};

const toUserAttachments = (
  parts: readonly FlueConversationPart[],
): CompleteAttachment[] =>
  parts.flatMap((part, index) => {
    if (part.type !== "file") return [];
    const file = convertFilePart(part);
    if (file === null) return [];
    return [
      {
        id: part.id ?? String(index),
        type: file.mimeType.startsWith("image/") ? "image" : "file",
        name: part.filename ?? "file",
        content: [file],
        contentType: file.mimeType,
        status: { type: "complete" },
      },
    ];
  });

const toMessageStatus = (
  message: FlueConversationMessage,
  index: number,
  messages: readonly FlueConversationMessage[],
  options: ConvertFlueMessagesOptions,
): MessageStatus => {
  if (message.role !== "assistant") return USER_STATUS;
  if (index === messages.length - 1 && options.error !== undefined) {
    return {
      type: "incomplete",
      reason: "error",
      error: toAssistantError(options.error),
    };
  }
  if (index === messages.length - 1 && options.isRunning) {
    return ASSISTANT_RUNNING_STATUS;
  }
  return ASSISTANT_COMPLETE_STATUS;
};

const toSystemText = (parts: readonly FlueConversationPart[]) =>
  parts
    .flatMap((part) =>
      part.type === "text" || part.type === "reasoning" ? [part.text] : [],
    )
    .join("\n");

/** Convert one materialized Flue message into an assistant-ui message. */
export const convertFlueMessage = (
  message: FlueConversationMessage,
  index: number,
  messages: readonly FlueConversationMessage[],
  options: ConvertFlueMessagesOptions = {},
): ThreadMessage => {
  const common = {
    id: message.id,
    createdAt: options.getCreatedAt?.(message) ?? new Date(),
    metadata: {
      custom: {
        ...(message.metadata ?? {}),
        purpose: message.purpose,
        display: message.display,
        ...(message.submissionId && { submissionId: message.submissionId }),
        ...(message.turnId && { turnId: message.turnId }),
        ...(message.signal && { signal: message.signal }),
        ...(message.settlement && { settlement: message.settlement }),
      },
    },
  };

  const like: ThreadMessageLike =
    message.role === "assistant"
      ? {
          ...common,
          role: "assistant",
          content: message.parts
            .map(convertAssistantPart)
            .filter((part) => part !== null),
        }
      : message.role === "user"
        ? {
            ...common,
            role: "user",
            content: message.parts
              .map(convertUserPart)
              .filter((part) => part !== null),
            attachments: toUserAttachments(message.parts),
          }
        : {
            ...common,
            role: "system",
            content: [{ type: "text", text: toSystemText(message.parts) }],
          };

  return fromThreadMessageLike(
    like,
    message.id,
    toMessageStatus(message, index, messages, options),
  );
};

/** Convert the visible Flue conversation into assistant-ui thread messages. */
export const convertFlueMessages = (
  messages: readonly FlueConversationMessage[],
  options: ConvertFlueMessagesOptions = {},
): ThreadMessage[] => {
  const visible = messages.filter((message) => message.display === "visible");
  return visible.map((message, index) =>
    convertFlueMessage(message, index, visible, options),
  );
};

export type FlueSendMessage = {
  readonly message: string;
  readonly images?: readonly DeliveredAttachment[] | undefined;
};

const toDeliveredImage = (
  data: string,
  mimeType: string,
  filename?: string,
): DeliveredAttachment => {
  const source = resolveFilePartSource({ data, mimeType });
  if (source.kind === "url") {
    throw new Error("Flue image attachments must contain base64 data.");
  }
  if (!source.mimeType.startsWith("image/")) {
    throw new Error("Flue only supports image attachments.");
  }
  return {
    type: "image",
    data: source.data,
    mimeType: source.mimeType,
    ...(filename && { filename }),
  };
};

/** Convert one assistant-ui append into Flue's text-and-images send shape. */
export const getFlueSendMessage = (message: AppendMessage): FlueSendMessage => {
  if (message.role !== "user") {
    throw new Error("Flue only accepts user messages.");
  }

  const text: string[] = [];
  const images: DeliveredAttachment[] = [];

  const appendPart = (
    part: AppendMessage["content"][number],
    attachment?: CompleteAttachment,
  ) => {
    switch (part.type) {
      case "text":
        text.push(part.text);
        break;
      case "image":
        images.push(
          toDeliveredImage(
            part.image,
            attachment?.contentType ?? "image/*",
            part.filename ?? attachment?.name,
          ),
        );
        break;
      case "file":
        images.push(
          toDeliveredImage(
            part.data,
            part.mimeType,
            part.filename ?? attachment?.name,
          ),
        );
        break;
      case "data":
        break;
      default: {
        throw new Error(`Unsupported Flue message part type: ${part.type}`);
      }
    }
  };

  for (const part of message.content) appendPart(part);
  for (const attachment of message.attachments ?? []) {
    for (const part of attachment.content) appendPart(part, attachment);
  }

  return {
    message: text.join("\n"),
    ...(images.length > 0 && { images }),
  };
};
