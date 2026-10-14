import type {
  MessageFormatAdapter,
  MessageFormatItem,
} from "../../../adapters/thread-history";
import {
  isStoredMessageStatus,
  parseStoredThreadSteps,
} from "../../../runtime/utils/stored-message-parts";
import {
  createRunTelemetryToolCall,
  deriveRunOutcome,
  describeRunError,
  extractRunTelemetryModelId,
  normalizeRunTelemetryUsage,
  type RunMessageTelemetry,
  type RunReportOutcome,
  type RunReportStepInit,
  type RunTelemetryUsageInit,
  truncateRunTelemetryText,
} from "assistant-cloud";
import {
  extractAISDKRunTelemetry,
  type AISDKMessageLike,
} from "assistant-cloud/ai-sdk";

export type StepTimestamp = { start_ms: number; end_ms: number };

export function mergeStepTimestamps(
  steps: RunReportStepInit[] | undefined,
  timestamps: StepTimestamp[] | undefined,
): RunReportStepInit[] | undefined {
  if (!timestamps) return steps;
  if (!steps) {
    return timestamps.map(({ start_ms, end_ms }) => ({
      startMs: start_ms,
      endMs: end_ms,
    }));
  }

  const len = Math.min(steps.length, timestamps.length);
  return steps.map((step, index) => ({
    ...step,
    ...(index < len
      ? {
          startMs: timestamps[index]!.start_ms,
          endMs: timestamps[index]!.end_ms,
        }
      : undefined),
  }));
}

export type RunMessageInfo = {
  localMessageId?: string;
  status?: "completed" | "incomplete" | "error";
  outcomeType?: RunReportOutcome;
  error?: string;
  errorCode?: string;
  firstTokenMs?: number;
  traceId?: string;
  provider?: string;
};

export function extractLastRunMessageInfo<
  TMessage,
  TStorageFormat extends Record<string, unknown>,
>(
  items: MessageFormatItem<TMessage>[],
  formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
): RunMessageInfo | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    const info = extractRunMessageInfo(
      item.message,
      formatAdapter.format,
      formatAdapter.getId(item.message),
    );
    if (info) return info;
  }
  return undefined;
}

export function mergeRunMessageInfo(
  stored: RunMessageInfo | undefined,
  observed: RunMessageInfo | undefined,
): RunMessageInfo | undefined {
  if (!observed) return stored;
  const { localMessageId: _observedId, ...outcome } = observed;
  return { ...stored, ...outcome };
}

export function extractRunMessageInfo(
  message: unknown,
  format: string,
  localMessageId?: string,
): RunMessageInfo | undefined {
  if (!isRecord(message) || message.role !== "assistant") return undefined;

  const status = isRecord(message.status) ? message.status : undefined;
  const metadata = isRecord(message.metadata) ? message.metadata : undefined;
  const custom = isRecord(metadata?.custom) ? metadata.custom : undefined;
  const timing = isRecord(metadata?.timing) ? metadata.timing : undefined;
  const firstTokenTime = timing?.firstTokenTime;
  const firstTokenMs =
    typeof firstTokenTime === "number" && Number.isFinite(firstTokenTime)
      ? Math.round(firstTokenTime)
      : undefined;
  const finishReason =
    status?.type === "incomplete"
      ? typeof status.reason === "string"
        ? status.reason
        : undefined
      : typeof metadata?.finishReason === "string"
        ? metadata.finishReason
        : undefined;
  const failed = status?.type === "incomplete" && status.reason === "error";
  const outcome = deriveRunOutcome({ finishReason, isError: failed });
  const outcomeType = outcome.outcome;
  const runStatus =
    outcome.status === "error"
      ? "error"
      : status?.type === "incomplete"
        ? "incomplete"
        : finishReason !== undefined
          ? outcome.status
          : undefined;
  const failure = failed ? describeRunError(status.error) : {};
  const messageId =
    localMessageId ?? (typeof message.id === "string" ? message.id : undefined);
  const traceId =
    format === "aui/v0"
      ? custom?.traceId
      : format === "ai-sdk/v6"
        ? metadata?.traceId
        : undefined;
  const provider =
    typeof custom?.provider === "string"
      ? custom.provider
      : typeof metadata?.provider === "string"
        ? metadata.provider
        : undefined;

  return {
    ...(messageId ? { localMessageId: messageId } : undefined),
    ...(runStatus !== undefined ? { status: runStatus } : undefined),
    ...(outcomeType ? { outcomeType } : undefined),
    ...failure,
    ...(firstTokenMs != null && firstTokenMs >= 0
      ? { firstTokenMs }
      : undefined),
    ...(typeof traceId === "string" ? { traceId } : undefined),
    ...(provider !== undefined ? { provider } : undefined),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

const usageTokenKeys = [
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "cachedInputTokens",
  "promptTokens",
  "completionTokens",
] as const;

const readTokenCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;

const readStoredTelemetryUsage = (
  value: unknown,
): RunTelemetryUsageInit | undefined => {
  if (!isRecord(value) || Array.isArray(value)) return undefined;

  const usage: Record<string, unknown> = {};
  for (const key of usageTokenKeys) {
    const count = readTokenCount(value[key]);
    if (count !== undefined) usage[key] = count;
  }

  const cacheReadTokens =
    isRecord(value.inputTokenDetails) && !Array.isArray(value.inputTokenDetails)
      ? readTokenCount(value.inputTokenDetails.cacheReadTokens)
      : undefined;
  if (cacheReadTokens !== undefined) {
    usage.inputTokenDetails = { cacheReadTokens };
  }

  const reasoningTokens =
    isRecord(value.outputTokenDetails) &&
    !Array.isArray(value.outputTokenDetails)
      ? readTokenCount(value.outputTokenDetails.reasoningTokens)
      : undefined;
  if (reasoningTokens !== undefined) {
    usage.outputTokenDetails = { reasoningTokens };
  }

  return Object.keys(usage).length > 0
    ? (usage as RunTelemetryUsageInit)
    : undefined;
};

const parseStoredTelemetrySteps = (
  value: unknown,
): { usage?: RunTelemetryUsageInit }[] =>
  parseStoredThreadSteps(value).map((step) => {
    const usage = readStoredTelemetryUsage(
      (step as Record<string, unknown>).usage,
    );
    return usage ? { usage } : {};
  });

export function extractTelemetry<T>(
  format: string,
  content: T,
): RunMessageTelemetry | null {
  switch (format) {
    case "aui/v0":
      return extractAuiV0(content);
    case "ai-sdk/v6":
      return extractAISDKRunTelemetry([content as AISDKMessageLike]);
    default:
      return null;
  }
}

export function extractRunTelemetry<T>(
  format: string,
  runMessages: T[],
): RunMessageTelemetry | null {
  if (format === "ai-sdk/v6") {
    return extractAISDKRunTelemetry(runMessages as AISDKMessageLike[]);
  }
  for (let i = runMessages.length - 1; i >= 0; i--) {
    const result = extractTelemetry(format, runMessages[i]!);
    if (result) return result;
  }
  return null;
}

export function extractAuiV0<T>(content: T): RunMessageTelemetry | null {
  const msg = content as {
    role?: string;
    status?: unknown;
    content?: readonly {
      type: string;
      text?: string;
      toolName?: string;
      toolCallId?: string;
      args?: unknown;
      argsText?: string;
      result?: unknown;
    }[];
    metadata?: {
      modelId?: string;
      steps?: unknown;
      custom?: Record<string, unknown> & { modelId?: string };
    };
  };

  if (msg.role !== "assistant") return null;
  // A status the persistence boundary rejects carries no verdict, so reporting
  // one would label the run from a value the thread itself never restores.
  if (msg.status !== undefined && !isStoredMessageStatus(msg.status))
    return null;
  const statusType =
    isRecord(msg.status) && typeof msg.status.type === "string"
      ? msg.status.type
      : undefined;
  // A non-terminal write is not a finished run; reporting it would mislabel it
  // "completed" and double-count steps once the terminal write reports.
  if (statusType === "running" || statusType === "requires-action") {
    return null;
  }

  const toolCalls = msg.content
    ?.filter((p) => p.type === "tool-call" && p.toolName && p.toolCallId)
    .map((p) =>
      createRunTelemetryToolCall({
        toolName: p.toolName!,
        toolCallId: p.toolCallId!,
        args: p.args,
        result: p.result,
        argsText: p.argsText,
      }),
    );

  const textParts = msg.content?.filter((p) => p.type === "text" && p.text);
  const outputText =
    textParts && textParts.length > 0
      ? truncateRunTelemetryText(textParts.map((p) => p.text).join(""))
      : undefined;

  const steps = parseStoredTelemetrySteps(msg.metadata?.steps);
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let reasoningTokens: number | undefined;
  let cachedInputTokens: number | undefined;
  if (steps && steps.length > 0) {
    let totalInput = 0;
    let totalOutput = 0;
    let totalReasoning = 0;
    let totalCachedInput = 0;
    let hasInput = false;
    let hasOutput = false;
    let hasReasoning = false;
    let hasCachedInput = false;
    for (const step of steps) {
      if (!step.usage) continue;
      const usage = normalizeRunTelemetryUsage(step.usage);
      if (!usage) continue;
      if (usage.inputTokens != null) {
        totalInput += usage.inputTokens;
        hasInput = true;
      }
      if (usage.outputTokens != null) {
        totalOutput += usage.outputTokens;
        hasOutput = true;
      }
      if (usage.reasoningTokens != null) {
        totalReasoning += usage.reasoningTokens;
        hasReasoning = true;
      }
      if (usage.cachedInputTokens != null) {
        totalCachedInput += usage.cachedInputTokens;
        hasCachedInput = true;
      }
    }
    inputTokens = hasInput ? totalInput : undefined;
    outputTokens = hasOutput ? totalOutput : undefined;
    reasoningTokens = hasReasoning ? totalReasoning : undefined;
    cachedInputTokens = hasCachedInput ? totalCachedInput : undefined;
  }

  const status = statusType === "incomplete" ? "incomplete" : "completed";

  const metadata = msg.metadata?.custom as Record<string, unknown> | undefined;
  const modelId = extractRunTelemetryModelId(
    msg.metadata as Record<string, unknown> | undefined,
  );

  const telemetrySteps: RunReportStepInit[] | undefined =
    steps.length > 0 ? steps : undefined;

  return {
    status,
    ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(steps?.length ? { totalSteps: steps.length } : undefined),
    ...(inputTokens != null ||
    outputTokens != null ||
    reasoningTokens != null ||
    cachedInputTokens != null
      ? {
          usage: {
            ...(inputTokens != null ? { inputTokens } : undefined),
            ...(outputTokens != null ? { outputTokens } : undefined),
            ...(reasoningTokens != null ? { reasoningTokens } : undefined),
            ...(cachedInputTokens != null ? { cachedInputTokens } : undefined),
          },
        }
      : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata ? { metadata } : undefined),
    ...(telemetrySteps ? { steps: telemetrySteps } : undefined),
    ...(modelId ? { modelId } : undefined),
  };
}
