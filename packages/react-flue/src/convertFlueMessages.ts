import {
  toAssistantError,
  type AppendMessage,
  type CompleteAttachment,
  type DataMessagePart,
  type FileMessagePart,
  type MessageStatus,
  type PartProviderMetadata,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ThreadUserMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  convertExternalMessages,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import {
  httpUrlPattern,
  resolveFilePartSource,
  resolveImageMediaType,
} from "@assistant-ui/core/internal";
import type {
  DeliveredAttachment,
  FlueConversationMessage,
  FlueConversationPart,
  FlueConversationSettlement,
} from "@flue/react";

export type ConvertFlueMessagesOptions = {
  readonly error?: unknown;
  readonly isRunning?: boolean | undefined;
  readonly settlements?: readonly FlueConversationSettlement[] | undefined;
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

const toSettlementStatus = (
  message: FlueConversationMessage,
  options: ConvertFlueMessagesOptions,
): MessageStatus | undefined => {
  if (message.role !== "assistant" || message.submissionId === undefined) {
    return undefined;
  }
  const settlement = options.settlements?.find(
    (candidate) => candidate.submissionId === message.submissionId,
  );
  if (settlement?.outcome === "aborted") {
    return { type: "incomplete", reason: "cancelled" };
  }
  if (settlement?.outcome === "failed") {
    return {
      type: "incomplete",
      reason: "error",
      ...(settlement.error !== undefined && {
        error: toAssistantError(settlement.error),
      }),
    };
  }
  return undefined;
};

const toSystemText = (parts: readonly FlueConversationPart[]) =>
  parts
    .flatMap((part) =>
      part.type === "text" || part.type === "reasoning" ? [part.text] : [],
    )
    .join("\n");

const toCreatedAt = (message: FlueConversationMessage) => {
  const timestamp = message.metadata?.timestamp;
  if (typeof timestamp !== "string" && typeof timestamp !== "number") {
    return undefined;
  }
  const createdAt = new Date(timestamp);
  return Number.isNaN(createdAt.getTime()) ? undefined : createdAt;
};

/** Convert one materialized Flue message into an assistant-ui message. */
export const convertFlueMessage = (
  message: FlueConversationMessage,
  options: ConvertFlueMessagesOptions = {},
):
  | useExternalMessageConverter.Message
  | useExternalMessageConverter.Message[] => {
  if (message.display !== "visible") return [];

  const status = toSettlementStatus(message, options);
  const createdAt = options.getCreatedAt?.(message) ?? toCreatedAt(message);
  const common = {
    id: message.id,
    ...(createdAt && { createdAt }),
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

  const like: useExternalMessageConverter.Message =
    message.role === "assistant"
      ? {
          ...common,
          role: "assistant",
          convertConfig: { joinStrategy: "none" as const },
          ...(status && { status }),
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

  return like;
};

/** Convert the visible Flue conversation into assistant-ui thread messages. */
export const convertFlueMessages = (
  messages: readonly FlueConversationMessage[],
  options: ConvertFlueMessagesOptions = {},
): ThreadMessage[] => {
  return convertExternalMessages(
    [...messages],
    (message) => convertFlueMessage(message, options),
    options.isRunning ?? false,
    options.error === undefined
      ? {}
      : { error: toAssistantError(options.error) },
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
  const resolvedMimeType = resolveImageMediaType(data, mimeType);
  if (!resolvedMimeType.startsWith("image/")) {
    throw new Error("Flue only supports image attachments.");
  }
  return {
    type: "image",
    data: source.data,
    mimeType: resolvedMimeType,
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
            attachment?.contentType ?? "",
            part.filename ?? attachment?.name,
          ),
        );
        break;
      case "file":
        if (!part.mimeType.startsWith("image/")) {
          throw new Error("Flue only supports image attachments.");
        }
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
