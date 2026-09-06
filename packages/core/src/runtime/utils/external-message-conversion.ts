import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ToolExecutionStatus } from "../../runtimes/tool-invocations/ToolInvocationTracker";
import type {
  ThreadAssistantMessage,
  ThreadMessage,
  ToolCallMessagePart,
} from "../../types/message";
import type { MessageTiming } from "../../types/message";
import { generateErrorMessageId } from "../../utils/id";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";
import {
  getAutoStatus,
  isAutoStatus,
  isInterruptedToolCall,
  isPendingToolCall,
} from "./auto-status";
import {
  bindExternalStoreMessage,
  FALLBACK_ID_PREFIX,
  getExternalStoreMessages,
  symbolInnerMessage,
} from "./external-store-message";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "./thread-message-like";

export type JoinStrategy = "concat-content" | "none";

export type ExternalMessageConverterMessage =
  | (ThreadMessageLike & {
      readonly convertConfig?: {
        readonly joinStrategy?: JoinStrategy;
      };
    })
  | {
      role: "tool";
      toolCallId: string;
      toolName?: string | undefined;
      result: any;
      artifact?: any;
      isError?: boolean;
      messages?: readonly ThreadMessage[];
    };

export type ExternalMessageConverterMetadata = {
  readonly toolStatuses?: Record<string, ToolExecutionStatus>;
  readonly error?: ReadonlyJSONValue;
  readonly cancelledMessageIds?: ReadonlySet<string>;
  readonly messageTiming?: Record<string, MessageTiming>;
};

export type ExternalMessageConverterCallback<T> = (
  message: T,
  metadata: ExternalMessageConverterMetadata,
) => ExternalMessageConverterMessage | ExternalMessageConverterMessage[];

export type ExternalMessageConverterCallbackResult<T> = {
  input: T;
  outputs: ExternalMessageConverterMessage[];
};

export type ExternalMessageConverterChunk<T> = {
  inputs: T[];
  outputs: ExternalMessageConverterMessage[];
};

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

const stringifyForError = (value: unknown) => {
  let text;
  try {
    text = value instanceof Error ? String(value) : JSON.stringify(value);
  } catch {
    /* circular */
  }
  text ??= String(value);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
};

const toCallbackOutputs = (
  output: ExternalMessageConverterMessage | ExternalMessageConverterMessage[],
  input: unknown,
): ExternalMessageConverterMessage[] => {
  const outputs = Array.isArray(output) ? output : [output];
  for (const o of outputs) {
    const valid =
      typeof o === "object" &&
      o !== null &&
      (o.role === "tool" ||
        ((o.role === "assistant" || o.role === "user" || o.role === "system") &&
          (typeof o.content === "string" || Array.isArray(o.content))));
    if (!valid)
      throw new Error(
        `External message converter: the converter callback returned an invalid message (${stringifyForError(o)}) for input ${stringifyForError(input)}. Return an empty array to skip a message.`,
      );
  }
  // Providers can emit tool results without a usable id (react-langchain maps
  // a missing tool_call_id to ""); converters must not throw on those, so the
  // result is dropped like any other orphaned tool output.
  return outputs.filter((o) => {
    if (o.role !== "tool") return true;
    if (typeof o.toolCallId === "string" && o.toolCallId.length > 0)
      return true;
    if (!warnedDroppedToolResults.has(o)) {
      warnedDroppedToolResults.add(o);
      console.warn(
        `External message converter: dropping a tool result without a toolCallId (${stringifyForError(o)}) for input ${stringifyForError(input)}.`,
      );
    }
    return false;
  });
};

const warnedDroppedToolResults = new WeakSet<object>();

export const convertExternalMessageCallback = <T>(
  input: T,
  callback: ExternalMessageConverterCallback<T>,
  metadata: ExternalMessageConverterMetadata,
): ExternalMessageConverterCallbackResult<T> => ({
  input,
  outputs: toCallbackOutputs(callback(input, metadata), input),
});

const mergeInnerMessages = (existing: object, incoming: object) => ({
  [symbolInnerMessage]: [
    ...((existing as any)[symbolInnerMessage] ?? []),
    ...((incoming as any)[symbolInnerMessage] ?? []),
  ],
});

export const joinExternalMessages = (
  messages: readonly ExternalMessageConverterMessage[],
): ThreadMessageLike => {
  const assistantMessage: Mutable<Omit<ThreadMessageLike, "metadata">> & {
    content: Exclude<ThreadMessageLike["content"][0], string>[];
    metadata?: Mutable<ThreadMessageLike["metadata"]>;
  } = {
    role: "assistant",
    content: [],
  };
  for (const output of messages) {
    if (output.role === "tool") {
      const toolCallIdx = assistantMessage.content.findIndex(
        (c) => c.type === "tool-call" && c.toolCallId === output.toolCallId,
      );
      // Ignore orphaned tool results so one bad tool message does not
      // prevent rendering the rest of the conversation.
      if (toolCallIdx !== -1) {
        const toolCall = assistantMessage.content[
          toolCallIdx
        ]! as ToolCallMessagePart;
        if (output.toolName != null) {
          if (toolCall.toolName !== output.toolName)
            throw new Error(
              `Tool call name ${output.toolCallId} ${output.toolName} does not match existing tool call ${toolCall.toolName}`,
            );
        }
        assistantMessage.content[toolCallIdx] = {
          ...toolCall,
          ...{
            [symbolInnerMessage]: [
              ...((toolCall as any)[symbolInnerMessage] ?? []),
              output,
            ],
          },
          result: output.result,
          artifact: output.artifact,
          isError: output.isError,
          messages: output.messages,
        };
      }
    } else {
      const role = output.role;
      const content = (
        typeof output.content === "string"
          ? [{ type: "text" as const, text: output.content }]
          : output.content
      ).map((c) => ({
        ...c,
        ...{ [symbolInnerMessage]: [output] },
      }));
      switch (role) {
        case "system":
        case "user":
          return {
            ...output,
            content,
          };
        case "assistant":
          if (assistantMessage.content.length === 0) {
            assistantMessage.id = output.id;
            assistantMessage.createdAt ??= output.createdAt;
            assistantMessage.status ??= output.status;

            if (output.attachments) {
              assistantMessage.attachments = [
                ...(assistantMessage.attachments ?? []),
                ...output.attachments,
              ];
            }
          }

          if (output.metadata) {
            assistantMessage.metadata ??= {};
            if (output.metadata.unstable_state !== undefined) {
              assistantMessage.metadata.unstable_state =
                output.metadata.unstable_state;
            }
            if (output.metadata.unstable_annotations) {
              assistantMessage.metadata.unstable_annotations = [
                ...(assistantMessage.metadata.unstable_annotations ?? []),
                ...output.metadata.unstable_annotations,
              ];
            }
            if (output.metadata.unstable_data) {
              assistantMessage.metadata.unstable_data = [
                ...(assistantMessage.metadata.unstable_data ?? []),
                ...output.metadata.unstable_data,
              ];
            }
            if (output.metadata.steps) {
              assistantMessage.metadata.steps = [
                ...(assistantMessage.metadata.steps ?? []),
                ...output.metadata.steps,
              ];
            }
            if (output.metadata.custom) {
              assistantMessage.metadata.custom = {
                ...(assistantMessage.metadata.custom ?? {}),
                ...output.metadata.custom,
              };
            }

            if (output.metadata.timing) {
              assistantMessage.metadata.timing = output.metadata.timing;
            }

            if (output.metadata.submittedFeedback) {
              assistantMessage.metadata.submittedFeedback =
                output.metadata.submittedFeedback;
            }

            if (output.metadata.isOptimistic) {
              assistantMessage.metadata.isOptimistic = true;
            }
            // TODO keep this in sync with ThreadMessageLike["metadata"] / fromThreadMessageLike
          }

          // Add content parts, merging reasoning parts with same parentId
          for (const part of content) {
            if (part.type === "tool-call" && part.toolCallId) {
              const existingIdx = assistantMessage.content.findIndex(
                (c) =>
                  c.type === "tool-call" && c.toolCallId === part.toolCallId,
              );
              if (existingIdx !== -1) {
                const existing = assistantMessage.content[
                  existingIdx
                ] as typeof part;
                assistantMessage.content[existingIdx] = {
                  ...existing,
                  ...part,
                  ...mergeInnerMessages(existing, part),
                };
                continue;
              }
            }

            if (
              part.type === "reasoning" &&
              "parentId" in part &&
              part.parentId
            ) {
              const existingIdx = assistantMessage.content.findIndex(
                (c) =>
                  c.type === "reasoning" &&
                  "parentId" in c &&
                  c.parentId === part.parentId,
              );
              if (existingIdx !== -1) {
                const existing = assistantMessage.content[
                  existingIdx
                ] as typeof part;
                assistantMessage.content[existingIdx] = {
                  ...existing,
                  text: `${existing.text}\n\n${part.text}`,
                  ...mergeInnerMessages(existing, part),
                };
                continue;
              }
            }
            assistantMessage.content.push(part);
          }
          break;
        default: {
          const unsupportedRole: never = role;
          throw new Error(`Unknown message role: ${unsupportedRole}`);
        }
      }
    }
  }
  return assistantMessage;
};

export const chunkExternalMessages = <T>(
  callbackResults: ExternalMessageConverterCallbackResult<T>[],
  joinStrategy?: JoinStrategy,
) => {
  const results: ExternalMessageConverterChunk<T>[] = [];
  let isAssistant = false;
  let pendingNone = false; // true if the previous assistant message had joinStrategy "none"
  let inputs: T[] = [];
  let outputs: ExternalMessageConverterMessage[] = [];

  const flush = () => {
    if (outputs.length) {
      results.push({
        inputs,
        outputs,
      });
    }
    inputs = [];
    outputs = [];
    isAssistant = false;
    pendingNone = false;
  };

  for (const callbackResult of callbackResults) {
    for (const output of callbackResult.outputs) {
      if (
        (pendingNone && output.role !== "tool") ||
        !isAssistant ||
        output.role === "user" ||
        output.role === "system"
      ) {
        flush();
      }
      isAssistant = output.role === "assistant" || output.role === "tool";

      if (inputs.at(-1) !== callbackResult.input) {
        inputs.push(callbackResult.input);
      }
      outputs.push(output);

      if (
        output.role === "assistant" &&
        (output.convertConfig?.joinStrategy === "none" ||
          joinStrategy === "none")
      ) {
        pendingNone = true;
      }
    }
  }
  flush();
  return results;
};

export const shallowArrayEqual = (
  a: readonly unknown[],
  b: readonly unknown[],
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

type ExternalMessageConversionCache = {
  message: ThreadMessage | undefined;
  generatedFallbackMessages: WeakSet<object>;
};

export const convertExternalMessageChunk = <T>(
  message: ExternalMessageConverterChunk<T>,
  idx: number,
  chunkCount: number,
  isRunning: boolean,
  error: ReadonlyJSONValue | undefined,
  cache?: ExternalMessageConversionCache,
  cancelledMessageIds?: ReadonlySet<string>,
) => {
  const isLast = idx === chunkCount - 1;
  const joined = joinExternalMessages(message.outputs);
  const isCancelled =
    cancelledMessageIds !== undefined &&
    message.outputs.some(
      (output) =>
        output.role !== "tool" &&
        output.id != null &&
        cancelledMessageIds.has(output.id),
    );
  const hasInterruptedToolCalls =
    typeof joined.content === "object" &&
    joined.content.some(isInterruptedToolCall);
  const hasPendingToolCalls =
    typeof joined.content === "object" &&
    joined.content.some(isPendingToolCall);
  const autoStatus = getAutoStatus(
    isLast,
    isRunning,
    hasInterruptedToolCalls,
    hasPendingToolCalls,
    isLast ? error : undefined,
    isCancelled,
  );
  const fallbackId = `${FALLBACK_ID_PREFIX}${idx}`;

  const cachedMessage = cache?.message;
  if (
    cachedMessage &&
    (cachedMessage.role !== "assistant" ||
      !isAutoStatus(cachedMessage.status) ||
      cachedMessage.status === autoStatus ||
      (cachedMessage.status.type === "incomplete" &&
        cachedMessage.status.reason === "error" &&
        cachedMessage.status.error !== undefined &&
        autoStatus.type === "incomplete" &&
        autoStatus.reason === "error" &&
        autoStatus.error !== undefined &&
        (cachedMessage.status.error === autoStatus.error ||
          isJSONValueEqual(cachedMessage.status.error, autoStatus.error))))
  ) {
    const inputs = getExternalStoreMessages<T>(cachedMessage);
    if (shallowArrayEqual(inputs, message.inputs)) {
      // A positional fallback id goes stale when messages are prepended
      // or reordered; serving it unchanged makes two messages collide on
      // one id and the dedup downstream drops one of them.
      if (
        cache.generatedFallbackMessages.has(cachedMessage) &&
        cachedMessage.id !== fallbackId
      ) {
        const updated = { ...cachedMessage, id: fallbackId };
        cache.generatedFallbackMessages.add(updated);
        bindExternalStoreMessage(updated, message.inputs);
        return updated;
      }
      return cachedMessage;
    }
  }

  const newMessage = fromThreadMessageLike(joined, fallbackId, autoStatus);
  if (cache && joined.id == null) {
    cache.generatedFallbackMessages.add(newMessage);
  }
  bindExternalStoreMessage(newMessage, message.inputs);
  return newMessage;
};

function createErrorAssistantMessage(
  error: ReadonlyJSONValue,
): ThreadAssistantMessage {
  const msg: ThreadAssistantMessage = {
    id: generateErrorMessageId(),
    role: "assistant",
    content: [],
    status: { type: "incomplete", reason: "error", error },
    createdAt: new Date(),
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      custom: {},
      steps: [],
    },
  };
  bindExternalStoreMessage(msg, []);
  return msg;
}

export const completeExternalMessageConversion = (
  messages: ThreadMessage[],
  error: ReadonlyJSONValue | undefined,
) => {
  if (error) {
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") {
      messages.push(createErrorAssistantMessage(error));
    }
  }
  return messages;
};

export const convertExternalMessages = <T extends WeakKey>(
  messages: T[],
  callback: ExternalMessageConverterCallback<T>,
  isRunning: boolean,
  metadata: ExternalMessageConverterMetadata,
) => {
  const callbackResults = messages.map((message) =>
    convertExternalMessageCallback(message, callback, metadata),
  );
  const chunks = chunkExternalMessages(callbackResults);
  const result = chunks.map((message, idx) =>
    convertExternalMessageChunk(
      message,
      idx,
      chunks.length,
      isRunning,
      metadata.error,
      undefined,
      metadata.cancelledMessageIds,
    ),
  );
  return completeExternalMessageConversion(result, metadata.error);
};
