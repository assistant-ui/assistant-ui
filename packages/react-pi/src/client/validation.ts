import { isRecord } from "@assistant-ui/core/internal";
import type {
  PiAssistantMessage,
  PiAssistantMessageDelta,
  PiHostUiRequest,
  PiThreadMetadata,
  PiThreadSnapshot,
  PiTranscriptMessage,
} from "../types";

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isOptionalBoolean = (value: unknown): boolean =>
  value === undefined || typeof value === "boolean";

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const isStringArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isUserContentPart = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "text") return typeof value.text === "string";
  if (value.type === "image") {
    return typeof value.data === "string" && typeof value.mimeType === "string";
  }
  return true;
};

const isUserContent = (value: unknown): boolean =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every(isUserContentPart));

const isToolCall = (value: unknown): boolean =>
  isRecord(value) &&
  value.type === "toolCall" &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  (value.arguments == null || isRecord(value.arguments)) &&
  isOptionalString(value.thoughtSignature);

const isAssistantContentPart = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "text") {
    return (
      typeof value.text === "string" && isOptionalString(value.textSignature)
    );
  }
  if (value.type === "thinking") {
    return (
      typeof value.thinking === "string" &&
      isOptionalString(value.thinkingSignature) &&
      isOptionalBoolean(value.redacted)
    );
  }
  if (value.type === "toolCall") return isToolCall(value);
  return true;
};

const isUsage = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.input === "number" &&
  typeof value.output === "number" &&
  typeof value.cacheRead === "number" &&
  typeof value.cacheWrite === "number" &&
  typeof value.totalTokens === "number" &&
  isRecord(value.cost) &&
  typeof value.cost.input === "number" &&
  typeof value.cost.output === "number" &&
  typeof value.cost.cacheRead === "number" &&
  typeof value.cost.cacheWrite === "number" &&
  typeof value.cost.total === "number";

export const isAssistantMessage = (
  value: unknown,
): value is PiAssistantMessage =>
  isRecord(value) &&
  value.role === "assistant" &&
  Array.isArray(value.content) &&
  value.content.every(isAssistantContentPart) &&
  typeof value.api === "string" &&
  typeof value.provider === "string" &&
  typeof value.model === "string" &&
  isOptionalString(value.responseModel) &&
  isOptionalString(value.responseId) &&
  isUsage(value.usage) &&
  typeof value.stopReason === "string" &&
  isOptionalString(value.errorMessage) &&
  typeof value.timestamp === "number";

export const isCompleteTranscriptMessage = (
  value: unknown,
): value is PiTranscriptMessage => {
  if (!isRecord(value) || typeof value.role !== "string") return false;

  switch (value.role) {
    case "user":
      return (
        isUserContent(value.content) && typeof value.timestamp === "number"
      );
    case "assistant":
      return isAssistantMessage(value);
    case "toolResult":
      return (
        typeof value.toolCallId === "string" &&
        typeof value.toolName === "string" &&
        Array.isArray(value.content) &&
        value.content.every(isUserContentPart) &&
        typeof value.isError === "boolean" &&
        typeof value.timestamp === "number"
      );
    case "bashExecution":
      return (
        typeof value.command === "string" &&
        typeof value.output === "string" &&
        (value.exitCode === undefined || typeof value.exitCode === "number") &&
        typeof value.cancelled === "boolean" &&
        typeof value.truncated === "boolean" &&
        isOptionalString(value.fullOutputPath) &&
        typeof value.timestamp === "number" &&
        isOptionalBoolean(value.excludeFromContext)
      );
    case "custom":
      return (
        typeof value.customType === "string" &&
        isUserContent(value.content) &&
        typeof value.display === "boolean" &&
        typeof value.timestamp === "number"
      );
    case "branchSummary":
      return (
        typeof value.summary === "string" &&
        typeof value.fromId === "string" &&
        typeof value.timestamp === "number"
      );
    case "compactionSummary":
      return (
        typeof value.summary === "string" &&
        typeof value.tokensBefore === "number" &&
        typeof value.timestamp === "number"
      );
    default:
      return true;
  }
};

export const isAssistantMessageDelta = (
  value: unknown,
): value is PiAssistantMessageDelta => {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  const hasContentIndex =
    Number.isSafeInteger(value.contentIndex) &&
    (value.contentIndex as number) >= 0;

  switch (value.type) {
    case "start":
      return isAssistantMessage(value.partial);
    case "text_start":
    case "thinking_start":
    case "toolcall_start":
      return hasContentIndex && isAssistantMessage(value.partial);
    case "text_delta":
    case "thinking_delta":
    case "toolcall_delta":
      return (
        hasContentIndex &&
        typeof value.delta === "string" &&
        isAssistantMessage(value.partial)
      );
    case "text_end":
    case "thinking_end":
      return (
        hasContentIndex &&
        typeof value.content === "string" &&
        isAssistantMessage(value.partial)
      );
    case "toolcall_end":
      return (
        hasContentIndex &&
        isToolCall(value.toolCall) &&
        isAssistantMessage(value.partial)
      );
    case "done":
      return (
        typeof value.reason === "string" && isAssistantMessage(value.message)
      );
    case "error":
      return (
        typeof value.reason === "string" && isAssistantMessage(value.error)
      );
    default:
      return true;
  }
};

export const isContextUsage = (value: unknown): boolean =>
  isRecord(value) &&
  (value.tokens === null || typeof value.tokens === "number") &&
  typeof value.contextWindow === "number" &&
  (value.percent === null || typeof value.percent === "number");

export const isHostUiRequest = (value: unknown): value is PiHostUiRequest => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.kind !== "string" ||
    !isOptionalString(value.toolCallId) ||
    !isOptionalNumber(value.timeoutMs)
  ) {
    return false;
  }

  switch (value.kind) {
    case "confirm":
      return (
        typeof value.title === "string" && typeof value.message === "string"
      );
    case "select":
      return typeof value.title === "string" && isStringArray(value.options);
    case "input":
      return (
        typeof value.title === "string" && isOptionalString(value.placeholder)
      );
    case "editor":
      return typeof value.title === "string" && isOptionalString(value.prefill);
    default:
      return true;
  }
};

const isQueuedMessage = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.mode === "string" &&
  typeof value.content === "string";

const isThreadConfig = (value: unknown): boolean =>
  value === undefined ||
  (isRecord(value) &&
    isOptionalString(value.provider) &&
    isOptionalString(value.modelId) &&
    isOptionalString(value.thinkingLevel));

export const isThreadMetadata = (value: unknown): value is PiThreadMetadata =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.length > 0 &&
  typeof value.status === "string" &&
  (value.queuedMessages === undefined ||
    (Array.isArray(value.queuedMessages) &&
      value.queuedMessages.every(isQueuedMessage))) &&
  isOptionalString(value.title) &&
  isOptionalString(value.workspacePath) &&
  isOptionalBoolean(value.archived) &&
  isOptionalBoolean(value.compactionActive) &&
  isOptionalBoolean(value.retryActive) &&
  isOptionalNumber(value.retryAttempt) &&
  isOptionalString(value.runningRunId) &&
  isThreadConfig(value.config) &&
  (value.contextUsage === undefined || isContextUsage(value.contextUsage)) &&
  isOptionalString(value.sessionFile) &&
  isOptionalString(value.parentSessionPath) &&
  isOptionalNumber(value.messageCount) &&
  isOptionalString(value.createdAt) &&
  isOptionalString(value.updatedAt);

const isRenderableTranscriptMessage = (
  value: unknown,
): value is PiTranscriptMessage => {
  if (!isRecord(value) || typeof value.role !== "string") return false;

  switch (value.role) {
    case "user":
      return isUserContent(value.content);
    case "assistant":
      return (
        Array.isArray(value.content) &&
        value.content.every(isAssistantContentPart)
      );
    case "toolResult":
      return (
        typeof value.toolCallId === "string" &&
        Array.isArray(value.content) &&
        value.content.every(isUserContentPart)
      );
    case "bashExecution":
      return (
        typeof value.command === "string" && typeof value.output === "string"
      );
    case "custom":
      return (
        typeof value.customType === "string" && isUserContent(value.content)
      );
    case "branchSummary":
    case "compactionSummary":
      return typeof value.summary === "string";
    default:
      return true;
  }
};

export const isThreadSnapshot = (value: unknown): value is PiThreadSnapshot =>
  isRecord(value) &&
  isThreadMetadata(value.metadata) &&
  isOptionalNumber(value.seq) &&
  Array.isArray(value.messages) &&
  value.messages.every(isRenderableTranscriptMessage) &&
  (value.hostUiRequests === undefined ||
    (Array.isArray(value.hostUiRequests) &&
      value.hostUiRequests.every(isHostUiRequest)));
