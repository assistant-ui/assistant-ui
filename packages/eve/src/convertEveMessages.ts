import {
  fromThreadMessageLike,
  toAssistantError,
  type AppendMessage,
  type CompleteAttachment,
  type FileMessagePart,
  type MessageStatus,
  type PartProviderMetadata,
  type RespondToToolApprovalOptions,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ThreadMessageLike,
  type ThreadUserMessagePart,
  type ToolApprovalOption,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import { httpUrlPattern, parseDataUrl } from "@assistant-ui/core/internal";
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

const ASSISTANT_CANCELLED_STATUS = {
  type: "incomplete",
  reason: "cancelled",
} satisfies MessageStatus;

const USER_FALLBACK_STATUS = {
  type: "complete",
  reason: "unknown",
} satisfies MessageStatus;

export type ConvertEveMessagesOptions = {
  /**
   * Marks the last assistant message as running while Eve is submitting or
   * streaming. When omitted, a message carrying Eve's `"streaming"` marker is
   * treated as running; pass `false` to settle interrupted messages to a
   * terminal status.
   */
  readonly isRunning?: boolean | undefined;
  /**
   * The Eve session error, mapped onto the assistant message it interrupted.
   */
  readonly error?: unknown;
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

  const isLast = index === messages.length - 1;
  if (isLast && options.isRunning === true) {
    return ASSISTANT_RUNNING_STATUS;
  }

  // Eve's default reducer never terminalizes the "streaming" marker on
  // cancellation or turn/session failure, so liveness comes from isRunning and
  // a leftover marker means the turn was interrupted.
  if (message.metadata?.status === "streaming") {
    if (options.isRunning === undefined) {
      return ASSISTANT_RUNNING_STATUS;
    }
    if (isLast && options.error !== undefined) {
      return {
        type: "incomplete",
        reason: "error",
        error: toAssistantError(options.error),
      };
    }
    return ASSISTANT_CANCELLED_STATUS;
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

const toJsonSafeInputRequest = (
  inputRequest: EveMessageInputRequest,
): PartProviderMetadata[string] => ({
  requestId: inputRequest.requestId,
  prompt: inputRequest.prompt,
  ...(inputRequest.display !== undefined && { display: inputRequest.display }),
  ...(inputRequest.allowFreeform !== undefined && {
    allowFreeform: inputRequest.allowFreeform,
  }),
  ...(inputRequest.options && {
    options: inputRequest.options.map((option) => ({
      id: option.id,
      label: option.label,
      ...(option.description !== undefined && {
        description: option.description,
      }),
      ...(option.style !== undefined && { style: option.style }),
    })),
  }),
});

const toToolProviderMetadata = (
  part: EveDynamicToolPart,
): PartProviderMetadata | undefined => {
  const inputRequest = part.toolMetadata?.eve?.inputRequest;
  if (!inputRequest) return undefined;
  return { eve: { inputRequest: toJsonSafeInputRequest(inputRequest) } };
};

const convertDynamicToolPart = (
  part: EveDynamicToolPart,
): ToolCallMessagePart => {
  const approval = toApproval(part);
  const providerMetadata = toToolProviderMetadata(part);
  const toolCall: ToolCallMessagePart = {
    type: "tool-call",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    args: toJsonObject(part.input),
    argsText: stringifyArgs(part.input),
    ...(approval && { approval }),
    ...(providerMetadata && { providerMetadata }),
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

const convertFilePart = (
  part: Extract<EveMessagePart, { type: "file" }>,
): FileMessagePart | null => {
  if (part.url === undefined) return null;
  return {
    type: "file",
    data: part.url,
    mimeType: part.mediaType ?? "unknown/unknown",
    ...(part.filename && { filename: part.filename }),
    ...(httpUrlPattern.test(part.url) && { sourceType: "url" as const }),
  };
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

    case "file":
      return convertFilePart(part);

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

    case "file":
      return convertFilePart(part);

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

const toUserAttachments = (
  parts: readonly EveMessagePart[],
): CompleteAttachment[] => {
  const attachments: CompleteAttachment[] = [];
  for (const part of parts) {
    if (part.type !== "file") continue;
    const file = convertFilePart(part);
    if (file === null) continue;
    const isImage = file.mimeType.startsWith("image/");
    attachments.push({
      id: String(attachments.length),
      type: isImage ? "image" : "file",
      name: part.filename ?? "file",
      content: [
        isImage
          ? {
              type: "image",
              image: file.data,
              ...(part.filename && { filename: part.filename }),
            }
          : file,
      ],
      contentType: file.mimeType,
      status: { type: "complete" },
    });
  }
  return attachments;
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
          attachments: toUserAttachments(message.parts),
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

  const parts = content.flatMap((part) => {
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

      case "audio": {
        // A data URL's own media type wins over `mediaType` downstream, so the
        // envelope is rebuilt from the typed format rather than forwarded.
        const mediaType = `audio/${part.audio.format}`;
        const data = part.audio.data;
        return {
          type: "file" as const,
          data: httpUrlPattern.test(data)
            ? data
            : `data:${mediaType};base64,${parseDataUrl(data)?.data ?? data}`,
          mediaType,
        };
      }

      case "data":
        return [];

      default: {
        const _exhaustiveCheck:
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
 * Finds the pending input request answered by the given approval id, so the
 * response mapping can honor the request's display mode.
 */
export const findEveInputRequest = (
  data: EveMessageData,
  approvalId: string,
): EveMessageInputRequest | undefined => {
  for (const message of data.messages) {
    for (const part of message.parts) {
      if (part.type === "dynamic-tool" && part.approval?.id === approvalId) {
        return part.toolMetadata?.eve?.inputRequest;
      }
    }
  }
  return undefined;
};

/**
 * Converts an assistant-ui tool approval response into an Eve input response.
 *
 * Pass the originating input request (see {@link findEveInputRequest}) so the
 * mapping never emits an option id the request does not carry. A literal
 * option match always wins; a `display: "confirmation"` request is only ever
 * answered with one of its own `"approve"` / `"deny"` options; free-form
 * requests (`display: "text"`, `allowFreeform`, or no options at all) are
 * answered with the response's `reason` text, and only when the response is
 * not a refusal. A response that cannot be mapped honestly throws instead of
 * fabricating a decision or downgrading a refusal to an answer.
 */
export const toEveInputResponse = (
  response: RespondToToolApprovalOptions,
  inputRequest?: EveMessageInputRequest,
): InputResponse => {
  const requestId = response.approvalId;
  const options = inputRequest?.options;
  const text = response.reason;

  if (
    response.optionId !== undefined &&
    (!inputRequest || options?.some((o) => o.id === response.optionId))
  ) {
    return {
      requestId,
      optionId: response.optionId,
      ...(text && { text }),
    };
  }

  if (!inputRequest) {
    return {
      requestId,
      optionId: response.approved ? "approve" : "deny",
      ...(text && { text }),
    };
  }

  const fallbackOptionId = response.approved ? "approve" : "deny";
  if (options?.some((option) => option.id === fallbackOptionId)) {
    return { requestId, optionId: fallbackOptionId, ...(text && { text }) };
  }

  // Eve recognises an approval by its literal two-option `approve`/`deny`
  // shape, so a confirmation without those options can carry no decision and
  // must never be downgraded to a free-form answer.
  if (inputRequest.display === "confirmation") {
    throw new Error(
      `Eve input request "${requestId}" is a confirmation but carries no "${fallbackOptionId}" option; eve only recognises a confirmation with literal "approve" and "deny" options`,
    );
  }

  if (response.approved === false) {
    throw new Error(
      `Eve input request "${requestId}" has no literal "deny" option for this response; a request eve does not model as an approval can only be answered or left unanswered`,
    );
  }

  const acceptsText =
    inputRequest.display === "text" ||
    inputRequest.allowFreeform === true ||
    !options?.length;
  if (acceptsText) {
    if (text) {
      return { requestId, text };
    }
    throw new Error(
      `Eve input request "${requestId}" expects a free-form text answer; respond with the answer as the reason`,
    );
  }
  throw new Error(
    `Eve input request "${requestId}" has no matching option for this response; respond with one of: ${options!
      .map((option) => option.id)
      .join(", ")}`,
  );
};
