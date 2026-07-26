import {
  fromThreadMessageLike,
  type AppendMessage,
  type MessageStatus,
  type RespondToToolApprovalOptions,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ThreadMessageLike,
  type ThreadUserMessagePart,
  type ToolApprovalOption,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import type {
  EveDynamicToolPart,
  EveMessage,
  EveMessageData,
  EveMessageInputRequest,
  EveMessagePart,
} from "eve/react";
import type { InputResponse, SendTurnPayload } from "eve/client";

const ASSISTANT_COMPLETE_STATUS = {
  type: "complete",
  reason: "stop",
} satisfies MessageStatus;

const ASSISTANT_RUNNING_STATUS = {
  type: "running",
} satisfies MessageStatus;

const USER_FALLBACK_STATUS = {
  type: "complete",
  reason: "unknown",
} satisfies MessageStatus;

export type ConvertEveMessagesOptions = {
  /**
   * Marks the last assistant message as running while Eve is submitting or
   * streaming.
   */
  readonly isRunning?: boolean | undefined;
  readonly getCreatedAt?: ((message: EveMessage) => Date) | undefined;
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

const toMessageStatus = (
  message: EveMessage,
  index: number,
  messages: readonly EveMessage[],
  options: ConvertEveMessagesOptions,
): MessageStatus => {
  if (message.role !== "assistant") return USER_FALLBACK_STATUS;

  const hasPendingApproval = message.parts.some(
    (part) =>
      part.type === "dynamic-tool" && part.state === "approval-requested",
  );

  if (hasPendingApproval) {
    return { type: "requires-action", reason: "tool-calls" };
  }

  if (message.metadata?.status === "failed") {
    return { type: "incomplete", reason: "error" };
  }

  if (
    message.metadata?.status === "streaming" ||
    (options.isRunning === true && index === messages.length - 1)
  ) {
    return ASSISTANT_RUNNING_STATUS;
  }

  return ASSISTANT_COMPLETE_STATUS;
};

const toolApprovalOptionsFromInputRequest = (
  inputRequest: EveMessageInputRequest | undefined,
): readonly ToolApprovalOption[] | undefined => {
  const options = inputRequest?.options;
  if (!options || options.length === 0) return undefined;

  return options.map((option) => ({
    id: option.id,
    kind:
      option.id === "approve"
        ? "allow-once"
        : option.id === "deny"
          ? "reject-once"
          : `_${option.id}`,
    ...(option.label && { label: option.label }),
    ...(option.description && { description: option.description }),
  }));
};

const toApproval = (
  part: EveDynamicToolPart,
): ToolCallMessagePart["approval"] | undefined => {
  if (
    part.state !== "approval-requested" &&
    part.state !== "approval-responded" &&
    part.state !== "output-available" &&
    part.state !== "output-error" &&
    part.state !== "output-denied"
  ) {
    return undefined;
  }

  const approval = part.approval;
  if (!approval) return undefined;
  const options = toolApprovalOptionsFromInputRequest(
    part.toolMetadata?.eve?.inputRequest,
  );

  return {
    id: approval.id,
    ...(approval.approved !== undefined && { approved: approval.approved }),
    ...(approval.reason && { reason: approval.reason }),
    ...(approval.isAutomatic !== undefined && {
      isAutomatic: approval.isAutomatic,
    }),
    ...(options && { options }),
  };
};

const convertDynamicToolPart = (
  part: EveDynamicToolPart,
): ToolCallMessagePart => {
  const approval = toApproval(part);
  const toolCall: ToolCallMessagePart = {
    type: "tool-call",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    args: toJsonObject(part.input),
    argsText: stringifyArgs(part.input),
    ...(approval && { approval }),
  };

  switch (part.state) {
    case "output-available":
      return { ...toolCall, result: part.output };

    case "output-error":
      return {
        ...toolCall,
        result: { error: part.errorText },
        isError: true,
      };

    case "output-denied":
      return {
        ...toolCall,
        result: { error: part.approval?.reason ?? "Tool approval denied" },
        isError: true,
      };

    default:
      return toolCall;
  }
};

const convertAssistantPart = (
  part: EveMessagePart,
): ThreadAssistantMessagePart | null => {
  switch (part.type) {
    case "text":
    case "reasoning":
      return { type: part.type, text: part.text };

    case "step-start":
      return null;

    case "dynamic-tool":
      return convertDynamicToolPart(part);

    default:
      return null;
  }
};

const convertUserPart = (
  part: EveMessagePart,
): ThreadUserMessagePart | null => {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };

    default:
      return null;
  }
};

const toUserContent = (
  parts: readonly EveMessagePart[],
): readonly ThreadUserMessagePart[] => {
  const content = parts.map(convertUserPart).filter((part) => part !== null);
  return content.length > 0 ? content : [{ type: "text", text: "" }];
};

/**
 * Converts a single Eve message into an assistant-ui thread message.
 */
export const convertEveMessage = (
  message: EveMessage,
  index: number,
  messages: readonly EveMessage[],
  options: ConvertEveMessagesOptions = {},
): ThreadMessage => {
  const createdAt = options.getCreatedAt?.(message) ?? new Date();
  const metadata = {
    ...(message.metadata?.optimistic && { isOptimistic: true }),
    custom: {
      ...(message.metadata ?? {}),
    },
  };

  const like: ThreadMessageLike =
    message.role === "user"
      ? {
          role: "user",
          id: message.id,
          createdAt,
          content: toUserContent(message.parts),
          attachments: [],
          metadata,
        }
      : {
          role: "assistant",
          id: message.id,
          createdAt,
          content: message.parts
            .map(convertAssistantPart)
            .filter((part) => part !== null),
          metadata,
        };

  return fromThreadMessageLike(
    like,
    message.id,
    toMessageStatus(message, index, messages, options),
  );
};

/**
 * Converts the full Eve message data object into assistant-ui thread messages.
 */
export const convertEveMessages = (
  data: EveMessageData,
  options: ConvertEveMessagesOptions = {},
): ThreadMessage[] =>
  data.messages.map((message, index, messages) =>
    convertEveMessage(message, index, messages, options),
  );

/**
 * Converts an assistant-ui append message into the message payload accepted by
 * Eve's `send` API.
 */
export const getEveMessageContent = (
  message: AppendMessage,
): NonNullable<SendTurnPayload["message"]> => {
  const content = [
    ...message.content,
    ...(message.attachments?.flatMap((attachment) => attachment.content) ?? []),
  ];

  const parts = content.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };

      case "file":
        return {
          type: "file" as const,
          data: part.data,
          mediaType: part.mimeType,
          ...(part.filename && { filename: part.filename }),
        };

      case "image":
        return {
          type: "file" as const,
          data: part.image,
          mediaType: "image/*",
          ...(part.filename && { filename: part.filename }),
        };

      default: {
        const _exhaustiveCheck:
          | "audio"
          | "data"
          | "generative-ui"
          | "reasoning"
          | "source"
          | "tool-call" = type;
        throw new Error(
          `Unsupported eve append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (parts.length === 1 && parts[0]?.type === "text") {
    return parts[0].text;
  }

  return parts;
};

/**
 * Converts an assistant-ui tool approval response into an Eve input response.
 */
export const toEveInputResponse = (
  response: RespondToToolApprovalOptions,
): InputResponse => ({
  requestId: response.approvalId,
  optionId: response.optionId ?? (response.approved ? "approve" : "deny"),
  ...(response.reason && { text: response.reason }),
});
