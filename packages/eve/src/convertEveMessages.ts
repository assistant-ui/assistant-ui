import {
  fromThreadMessageLike,
  toAssistantError,
  type AppendMessage,
  type CompleteAttachment,
  type DataMessagePart,
  type FileMessagePart,
  type MessagePartStreamStatus,
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
import {
  httpUrlPattern,
  resolveFilePartSource,
} from "@assistant-ui/core/internal";
import type {
  EveAuthorizationOutcome,
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessageData,
  EveMessageInputRequest,
  EveMessagePart,
} from "eve/react";
import type { InputResponse } from "eve/client";

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

  const isLast = index === messages.length - 1;
  const hasPendingApproval = message.parts.some(
    (part) =>
      part.type === "dynamic-tool" && part.state === "approval-requested",
  );
  // Scoped to the stale-marker case so a terminalized or errored turn keeps its
  // own status; the hold only claims the fall-through that reads as cancelled.
  const hasPendingAuthorization =
    message.metadata?.status === "streaming" &&
    (!isLast || options.error === undefined) &&
    message.parts.some(
      (part) => part.type === "authorization" && part.state === "required",
    );

  if (hasPendingApproval) {
    return { type: "requires-action", reason: "tool-calls" };
  }

  // A connector authorization is answered outside the thread, so the turn is
  // held on external input rather than on a tool call awaiting a result.
  if (hasPendingAuthorization) {
    return { type: "requires-action", reason: "interrupt" };
  }

  if (message.metadata?.status === "failed") {
    return { type: "incomplete", reason: "error" };
  }

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
        : option.id === "cancel"
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
  kind: inputRequest.kind,
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

/**
 * Payload of the `authorization` data part the Eve runtime emits for a
 * connector authorization challenge. `state` discriminates a pending challenge
 * from a settled one; every other field is present only when Eve projected it.
 * This converter drops a `url` whose scheme is not `http(s)`, so a renderer can
 * link to it without checking the scheme itself; Eve itself passes through
 * whatever the connector supplied. Eve's
 * `turnId` and `stepIndex` part identity is omitted: a renderer receives the
 * one part it renders, in Eve's own step order, so display never has to
 * re-identify a challenge among several.
 */
export type EveAuthorizationData = {
  readonly state: EveAuthorizationPart["state"];
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly url?: string;
  readonly userCode?: string;
  readonly instructions?: string;
  readonly expiresAt?: string;
  readonly outcome?: EveAuthorizationOutcome;
  readonly reason?: string;
};

const convertAuthorizationPart = (
  part: EveAuthorizationPart,
): DataMessagePart<EveAuthorizationData> => ({
  type: "data",
  name: "authorization",
  data: {
    state: part.state,
    name: part.name,
    ...(part.displayName !== undefined && { displayName: part.displayName }),
    ...(part.description !== undefined && { description: part.description }),
    ...(part.authorization?.url !== undefined &&
      httpUrlPattern.test(part.authorization.url) && {
        url: part.authorization.url,
      }),
    ...(part.authorization?.userCode !== undefined && {
      userCode: part.authorization.userCode,
    }),
    ...(part.authorization?.instructions !== undefined && {
      instructions: part.authorization.instructions,
    }),
    ...(part.authorization?.expiresAt !== undefined && {
      expiresAt: part.authorization.expiresAt,
    }),
    ...(part.outcome !== undefined && { outcome: part.outcome }),
    ...(part.reason !== undefined && { reason: part.reason }),
  },
});

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

// Eve's `state` is a run marker: the reducer settles a part to "done" only on
// `reasoning.completed`, `message.completed`, or `turn.cancelled`.
// `emitStreamContent` does not flush leftover reasoning on a tool-call, so a
// non-last reasoning part stays `streaming` until the model stream ends and the
// leftover flush runs. Mapping `streaming` to running would pin that block
// open. Only `done` is trustworthy; an unsettled part falls back to core's
// last-part rule.
const partStateToStatus = (
  state: "done" | "streaming" | undefined,
): MessagePartStreamStatus | undefined =>
  state === "done" ? { type: "complete" } : undefined;

const convertAssistantPart = (
  part: EveMessagePart,
): ThreadAssistantMessagePart | null => {
  switch (part.type) {
    case "text":
    case "reasoning": {
      const status = partStateToStatus(part.state);
      return {
        type: part.type,
        text: part.text,
        ...(status && { status }),
      };
    }

    case "step-start":
      return null;

    case "dynamic-tool":
      return convertDynamicToolPart(part);

    case "authorization":
      return convertAuthorizationPart(part);

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
 * Structural subset of the `string | UserContent` message content Eve's `send`
 * API accepts. The helpers declare the shapes they produce and leave
 * assignability to the send call site, checked against the installed version.
 */
export type EveMessageContent =
  | string
  | (
      | { readonly type: "text"; readonly text: string }
      | {
          readonly type: "file";
          readonly data: string;
          readonly mediaType: string;
          readonly filename?: string;
        }
    )[];

/**
 * Converts an assistant-ui append message into the message payload accepted by
 * Eve's `send` API.
 */
export const getEveMessageContent = (
  message: AppendMessage,
): EveMessageContent => {
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
        const source = resolveFilePartSource({ data, mimeType: mediaType });
        return {
          type: "file" as const,
          data:
            source.kind === "url"
              ? source.url
              : `data:${mediaType};base64,${source.data}`,
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
 * When `inputRequest` is known, every returned response carries either an
 * option the request declares or a free-form answer. A literal option match
 * wins, then the `"approve"` / `"cancel"` option the response's boolean decision
 * names, then the response's `reason` text when the request takes a free-form
 * answer (`display: "text"`, `allowFreeform`, or no options at all, and never
 * `display: "confirmation"`) and the response is not a refusal.
 * A one-argument call, or a part with no request, still forwards a caller
 * `optionId` as it always has, including ids the request never declared.
 *
 * A response the known request cannot record as the answer it asked for throws
 * instead of being submitted, because eve resolves a request the moment any
 * response for it arrives, and an empty one is recorded as an answer with no
 * content. Not sending leaves the request pending, so the caller can retry or
 * the user can answer it as an ordinary message.
 *
 * With no request to map against — a one-argument call, or a part carrying no
 * `toolMetadata.eve.inputRequest` — the response maps as it always has, to the
 * literal `"approve"` / `"cancel"` option every eve approval declares. Guessing
 * a display mode is what this mapper stopped doing; an unknown request is not
 * a guess about one.
 */
export const toEveInputResponse = (
  response: RespondToToolApprovalOptions,
  inputRequest?: EveMessageInputRequest,
): InputResponse => {
  const requestId = response.approvalId;
  const options = inputRequest?.options;
  const text = response.reason;

  if (response.optionId !== undefined) {
    if (
      !inputRequest ||
      options?.some((option) => option.id === response.optionId)
    ) {
      return {
        requestId,
        optionId: response.optionId,
        ...(text && { text }),
      };
    }
    throw new Error(
      `Eve input request "${requestId}" has no option with id "${response.optionId}"; respond with one of: ${
        options?.length
          ? options.map((option) => option.id).join(", ")
          : "(the request carries no options)"
      }`,
    );
  }

  const decisionOptionId = response.approved ? "approve" : "cancel";
  // Eve's harness always declares `approve`/`cancel` on a `tool-approval`
  // request, so honoring the kind when the options were dropped keeps a
  // non-spec approval payload answerable rather than stuck. A tool-approval
  // that declares its own options still requires one of them.
  if (
    !inputRequest ||
    (inputRequest.kind === "tool-approval" && !options?.length) ||
    options?.some((option) => option.id === decisionOptionId)
  ) {
    return { requestId, optionId: decisionOptionId, ...(text && { text }) };
  }

  // Eve recognises an approval by its literal two-option `approve`/`cancel`
  // shape, so past this point the request is a question and the boolean
  // carries no decision eve would act on.
  const acceptsText =
    inputRequest.display !== "confirmation" &&
    (inputRequest.display === "text" ||
      inputRequest.allowFreeform === true ||
      !options?.length);
  if (acceptsText && text && response.approved !== false) {
    return { requestId, text };
  }

  throw new Error(
    `Eve input request "${requestId}" (${inputRequest.prompt}) was not answered by this response; ${
      options?.length
        ? `respond with one of: ${options.map((option) => option.id).join(", ")}`
        : !acceptsText
          ? "the request declares no options to respond with"
          : response.approved === false
            ? "a refusal carries no answer for a free-form request; resend with `approved` unset or true and the answer in the response reason"
            : "pass the answer as the response reason, because the request takes a free-form answer"
    }`,
  );
};
