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
  type ToolApprovalDisplay,
  type ToolApprovalOption,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  httpUrlPattern,
  resolveFileMediaType,
  resolveFilePartSource,
  resolveImageMediaType,
  toMediaWireUrl,
} from "@assistant-ui/core/internal";
import type {
  EveMessage,
  EveMessagePart,
  EveToolPart,
  Interaction,
} from "eve/react";
import type { ConversationState, SessionStreamEvent } from "eve/client";
import {
  APPROVE_OPTION_ID,
  DENY_OPTION_ID,
  type Answer,
  type InteractionOutcome,
} from "eve/events";

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
  readonly isRunning?: boolean | undefined;
  readonly error?: unknown;
  readonly getCreatedAt?: ((message: EveMessage) => Date) | undefined;
  readonly events?: readonly SessionStreamEvent[] | undefined;
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
  interruptedTurns: ReadonlyMap<string, MessageStatus>,
): MessageStatus => {
  if (message.role !== "assistant") return USER_FALLBACK_STATUS;

  const interrupted =
    message.metadata?.turnId === undefined
      ? undefined
      : interruptedTurns.get(message.metadata.turnId);
  if (interrupted) return interrupted;

  const isLast = index === messages.length - 1;
  const interactions = message.parts.flatMap((part) =>
    part.type === "interaction"
      ? [part]
      : part.type === "tool" && part.interaction
        ? [part.interaction]
        : [],
  );
  const hasPendingApproval = interactions.some(
    (interaction) =>
      interaction.status === "open" && interaction.request.kind !== "sign-in",
  );
  const hasPendingAuthorization =
    message.metadata?.status === "streaming" &&
    (!isLast || options.error === undefined) &&
    interactions.some(
      (interaction) =>
        interaction.status === "open" && interaction.request.kind === "sign-in",
    );

  if (hasPendingApproval) {
    return { type: "requires-action", reason: "tool-calls" };
  }
  if (hasPendingAuthorization) {
    return { type: "requires-action", reason: "interrupt" };
  }

  if (message.metadata?.status === "failed") {
    return { type: "incomplete", reason: "error" };
  }

  if (isLast && options.isRunning === true) {
    return ASSISTANT_RUNNING_STATUS;
  }
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
  inputRequest: Interaction["request"] | undefined,
): readonly ToolApprovalOption[] | undefined => {
  const options = inputRequest?.options;
  if (!options || options.length === 0) return undefined;

  return options.map((option) => ({
    id: option.id,
    kind:
      option.id === APPROVE_OPTION_ID
        ? "allow-once"
        : option.id === DENY_OPTION_ID
          ? "reject-once"
          : `_${option.id}`,
    ...(option.label && { label: option.label }),
    ...(option.description && { description: option.description }),
  }));
};

const isDroppedOptionApproval = (inputRequest: Interaction["request"]) =>
  inputRequest.kind === "approval" && !inputRequest.options?.length;

const acceptsFreeformAnswer = (inputRequest: Interaction["request"]): boolean =>
  inputRequest.display !== "confirmation" &&
  !isDroppedOptionApproval(inputRequest) &&
  (inputRequest.display === "text" ||
    inputRequest.allowFreeform === true ||
    !inputRequest.options?.length);

const toolApprovalDisplay = (
  inputRequest: Interaction["request"],
): ToolApprovalDisplay => {
  if (isDroppedOptionApproval(inputRequest)) return "decision";

  switch (inputRequest.display) {
    case "confirmation":
      return "decision";
    case "select":
      return "select";
    case "text":
      return "text";
    default:
      if (inputRequest.kind === "approval") return "decision";
      return inputRequest.options?.length ? "select" : "text";
  }
};

const toApproval = (
  interaction: Interaction,
): NonNullable<ToolCallMessagePart["approval"]> => {
  const request = interaction.request;
  const options = toolApprovalOptionsFromInputRequest(request);
  const settled = interaction.status === "settled";
  const approved =
    interaction.outcome === "accepted"
      ? true
      : interaction.outcome === "declined"
        ? false
        : undefined;

  return {
    id: interaction.interactionId,
    prompt: request.prompt,
    display: toolApprovalDisplay(request),
    ...(acceptsFreeformAnswer(request) && { allowFreeform: true }),
    ...(settled && approved !== undefined && { approved }),
    ...(settled &&
      approved === undefined && {
        resolution:
          interaction.outcome === "expired"
            ? ("expired" as const)
            : ("cancelled" as const),
      }),
    ...(interaction.reason && { reason: interaction.reason }),
    ...(settled &&
      interaction.answer?.optionId !== undefined && {
        optionId: interaction.answer.optionId,
      }),
    ...(settled &&
      interaction.answer?.text !== undefined && {
        text: interaction.answer.text,
      }),
    ...(options && { options }),
  };
};

const toToolProviderMetadata = (
  interaction: Interaction,
): PartProviderMetadata => {
  const request = interaction.request;
  return {
    eve: {
      interaction: {
        interactionId: interaction.interactionId,
        prompt: request.prompt,
        kind: request.kind,
        ...(request.display !== undefined && { display: request.display }),
        ...(request.allowFreeform !== undefined && {
          allowFreeform: request.allowFreeform,
        }),
        ...(request.options && {
          options: request.options.map((option) => ({ ...option })),
        }),
      },
    },
  };
};

const convertToolPart = (
  part: EveToolPart,
): Omit<ToolCallMessagePart, "args"> &
  Partial<Pick<ToolCallMessagePart, "args">> => {
  const toolCall: ReturnType<typeof convertToolPart> = {
    type: "tool-call",
    toolCallId: part.callId,
    toolName: part.name,
    ...(part.state !== "streaming" && { args: toJsonObject(part.input) }),
    argsText:
      part.state === "streaming" ? part.inputText : stringifyArgs(part.input),
    ...(part.interaction && {
      approval: toApproval(part.interaction),
      providerMetadata: toToolProviderMetadata(part.interaction),
    }),
  };

  switch (part.state) {
    case "completed":
      return { ...toolCall, result: part.output };
    case "failed":
    case "rejected":
    case "cancelled":
      return {
        ...toolCall,
        result: {
          error:
            part.error?.message ??
            part.interaction?.reason ??
            (part.state === "rejected"
              ? "Tool approval denied"
              : part.state === "cancelled"
                ? "Tool call cancelled"
                : "Tool call failed"),
        },
        isError: true,
      };
    default:
      return part.output === undefined
        ? toolCall
        : { ...toolCall, result: part.output, isPreliminary: true };
  }
};

export type EveAuthorizationData = {
  readonly state: "required" | "completed";
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly url?: string;
  readonly userCode?: string;
  readonly instructions?: string;
  readonly expiresAt?: string;
  readonly outcome?:
    | "authorized"
    | "declined"
    | "failed"
    | "timed-out"
    | "cancelled";
  readonly reason?: string;
};

const toAuthorizationOutcome = (
  outcome: InteractionOutcome,
): NonNullable<EveAuthorizationData["outcome"]> => {
  switch (outcome) {
    case "accepted":
      return "authorized";
    case "declined":
    case "invalid":
      return "declined";
    case "expired":
      return "timed-out";
    case "failed":
      return "failed";
    default:
      return "cancelled";
  }
};

const convertAuthorizationPart = (
  interaction: Interaction,
): DataMessagePart<EveAuthorizationData> => {
  const signIn = interaction.request.signIn;
  return {
    type: "data",
    name: "authorization",
    data: {
      state: interaction.status === "open" ? "required" : "completed",
      name: signIn?.name ?? interaction.request.title ?? "sign-in",
      ...(signIn?.displayName !== undefined && {
        displayName: signIn.displayName,
      }),
      description: interaction.request.prompt,
      ...(signIn?.url !== undefined &&
        httpUrlPattern.test(signIn.url) && { url: signIn.url }),
      ...(signIn?.userCode !== undefined && { userCode: signIn.userCode }),
      ...(signIn?.instructions !== undefined && {
        instructions: signIn.instructions,
      }),
      ...(signIn?.expiresAt !== undefined && { expiresAt: signIn.expiresAt }),
      ...(interaction.outcome !== undefined && {
        outcome: toAuthorizationOutcome(interaction.outcome),
      }),
      ...(interaction.reason !== undefined && { reason: interaction.reason }),
    },
  };
};

const convertInteractionPart = (
  interaction: Interaction,
): ThreadAssistantMessagePart => {
  if (interaction.request.kind === "sign-in")
    return convertAuthorizationPart(interaction);
  const approval = toApproval(interaction);
  return {
    type: "tool-call",
    toolCallId: interaction.interactionId,
    toolName: interaction.call?.name ?? interaction.request.kind,
    args: toJsonObject(interaction.call?.input),
    argsText: stringifyArgs(interaction.call?.input),
    approval,
    providerMetadata: toToolProviderMetadata(interaction),
    ...(interaction.status === "settled" && {
      result: interaction.answer ?? {
        outcome: interaction.outcome,
        reason: interaction.reason,
      },
      ...(interaction.outcome !== "accepted" && { isError: true }),
    }),
  };
};

const convertFilePart = (
  part: Extract<EveMessagePart, { type: "file" }>,
): FileMessagePart | null => {
  if (part.url === undefined) return null;
  return {
    type: "file",
    data: part.url,
    mimeType: resolveFileMediaType(part.url, part.mediaType),
    ...(part.filename && { filename: part.filename }),
    ...(httpUrlPattern.test(part.url) && { sourceType: "url" as const }),
  };
};
const partStateToStatus = (
  state: "done" | "streaming" | undefined,
): MessagePartStreamStatus | undefined =>
  state === "done" ? { type: "complete" } : undefined;

const convertAssistantPart = (
  part: EveMessagePart,
): ThreadAssistantMessagePart | ReturnType<typeof convertToolPart> | null => {
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

    case "tool":
      return convertToolPart(part);

    case "interaction":
      return convertInteractionPart(part);

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

    default:
      return null;
  }
};

const toUserContent = (
  parts: readonly EveMessagePart[],
  attachments: readonly CompleteAttachment[],
): readonly ThreadUserMessagePart[] => {
  const content = parts.map(convertUserPart).filter((part) => part !== null);
  return content.length > 0 || attachments.length > 0
    ? content
    : [{ type: "text", text: "" }];
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

export const convertEveMessage = (
  message: EveMessage,
  index: number,
  messages: readonly EveMessage[],
  options: ConvertEveMessagesOptions = {},
): ThreadMessage =>
  convertEveMessageWithInterruptions(
    message,
    index,
    messages,
    options,
    getInterruptedTurns(options.events),
  );

const convertEveMessageWithInterruptions = (
  message: EveMessage,
  index: number,
  messages: readonly EveMessage[],
  options: ConvertEveMessagesOptions,
  interruptedTurns: ReadonlyMap<string, MessageStatus>,
): ThreadMessage => {
  const createdAt = options.getCreatedAt?.(message) ?? new Date();
  const metadata = {
    ...(message.metadata?.optimistic && { isOptimistic: true }),
    custom: {
      ...(message.metadata ?? {}),
    },
  };

  const attachments =
    message.role === "user" ? toUserAttachments(message.parts) : [];
  const like: ThreadMessageLike =
    message.role === "user"
      ? {
          role: "user",
          id: message.id,
          createdAt,
          content: toUserContent(message.parts, attachments),
          attachments,
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
    toMessageStatus(message, index, messages, options, interruptedTurns),
  );
};

export type InterruptedTurnEventCache = {
  lastEvents: readonly SessionStreamEvent[];
  interruptions: readonly SessionStreamEvent[];
};

const isTurnInterruption = (event: SessionStreamEvent) =>
  (event.type === "turn.settled" && event.data.outcome !== "completed") ||
  (event.type === "session.ended" && event.data.outcome === "failed");

export const collectInterruptedTurnEvents = (
  events: readonly SessionStreamEvent[],
  cache: InterruptedTurnEventCache,
): readonly SessionStreamEvent[] => {
  if (events === cache.lastEvents) return cache.interruptions;

  const scanned = cache.lastEvents;
  const resumesScan =
    scanned.length === 0 ||
    events[scanned.length - 1] === scanned[scanned.length - 1];

  let interruptions = resumesScan ? cache.interruptions : [];
  for (let i = resumesScan ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    if (isTurnInterruption(event)) interruptions = [...interruptions, event];
  }

  cache.lastEvents = events;
  cache.interruptions = interruptions;
  return interruptions;
};

const getInterruptedTurns = (
  events: readonly SessionStreamEvent[] | undefined,
) => {
  const interrupted = new Map<string, MessageStatus>();
  const sessionFailures = new Map<string, MessageStatus>();
  for (const event of events ?? []) {
    if (event.type === "turn.settled" && event.data.outcome === "failed") {
      interrupted.set(event.data.turnId, {
        type: "incomplete",
        reason: "error",
        ...(event.data.error && { error: toAssistantError(event.data.error) }),
      });
    } else if (
      event.type === "turn.settled" &&
      event.data.outcome === "cancelled"
    ) {
      interrupted.set(event.data.turnId, ASSISTANT_CANCELLED_STATUS);
    } else if (
      event.type === "session.ended" &&
      event.data.outcome === "failed" &&
      event.data.cause &&
      "turnId" in event.data.cause
    ) {
      sessionFailures.set(event.data.cause.turnId, {
        type: "incomplete",
        reason: "error",
        ...(event.data.error && { error: toAssistantError(event.data.error) }),
      });
    }
  }
  for (const [turnId, status] of sessionFailures)
    interrupted.set(turnId, status);
  return interrupted;
};

export const convertEveMessages = (
  data: Pick<ConversationState, "messages">,
  options: ConvertEveMessagesOptions = {},
): ThreadMessage[] => {
  const interruptedTurns = getInterruptedTurns(options.events);
  return data.messages.map((message, index, messages) =>
    convertEveMessageWithInterruptions(
      message,
      index,
      messages,
      options,
      interruptedTurns,
    ),
  );
};

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

type OutboundPart = AppendMessage["content"][number] & {
  readonly contentType?: string | undefined;
};

export const getEveMessageContent = (
  message: AppendMessage,
): EveMessageContent => {
  const content: OutboundPart[] = [
    ...message.content,
    ...(message.attachments?.flatMap((attachment) =>
      attachment.content.map((part) => ({
        ...part,
        contentType: attachment.contentType,
      })),
    ) ?? []),
  ];

  const parts = content.flatMap((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };

      case "file": {
        const mediaType = resolveFileMediaType(
          part.data,
          part.mimeType || part.contentType,
        );
        return {
          type: "file" as const,
          data:
            part.sourceType === "id"
              ? part.data
              : toMediaWireUrl(part.data, mediaType),
          mediaType,
          ...(part.filename && { filename: part.filename }),
        };
      }

      case "image": {
        const mediaType = resolveImageMediaType(part.image, part.contentType);
        return {
          type: "file" as const,
          data: toMediaWireUrl(part.image, mediaType),
          mediaType,
          ...(part.filename && { filename: part.filename }),
        };
      }

      case "audio": {
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

export const findEveInputRequest = (
  data: Pick<ConversationState, "messages">,
  approvalId: string,
): Interaction["request"] | undefined => {
  for (const message of data.messages) {
    for (const part of message.parts) {
      const interaction =
        part.type === "interaction"
          ? part
          : part.type === "tool"
            ? part.interaction
            : undefined;
      if (interaction?.interactionId === approvalId) return interaction.request;
    }
  }
  return undefined;
};

export const toEveInputResponse = (
  response: RespondToToolApprovalOptions,
  inputRequest?: Interaction["request"],
): Answer => {
  const interactionId = response.approvalId;
  const options = inputRequest?.options;
  const text = response.text ?? response.reason;

  if (response.optionId !== undefined) {
    if (
      !inputRequest ||
      options?.some((option) => option.id === response.optionId)
    ) {
      return {
        interactionId,
        optionId: response.optionId,
        ...(text && { text }),
      };
    }
    throw new Error(
      `Eve interaction "${interactionId}" has no option with id "${response.optionId}"; respond with one of: ${
        options?.length
          ? options.map((option) => option.id).join(", ")
          : "(the request carries no options)"
      }`,
    );
  }

  const decisionOptionId = response.approved
    ? APPROVE_OPTION_ID
    : DENY_OPTION_ID;
  if (
    !inputRequest ||
    (inputRequest.kind === "approval" && !options?.length) ||
    options?.some((option) => option.id === decisionOptionId)
  ) {
    return { interactionId, optionId: decisionOptionId, ...(text && { text }) };
  }
  const acceptsText = acceptsFreeformAnswer(inputRequest);
  if (acceptsText && text && response.approved !== false) {
    return { interactionId, text };
  }

  throw new Error(
    `Eve interaction "${interactionId}" (${inputRequest.prompt}) was not answered by this response; ${
      options?.length
        ? `respond with one of: ${options.map((option) => option.id).join(", ")}`
        : !acceptsText
          ? "the request declares no options to respond with"
          : response.approved === false
            ? "a refusal carries no answer for a free-form request; resend with `approved` unset or true and the answer in the response text"
            : "pass the answer as the response text, because the request takes a free-form answer"
    }`,
  );
};
