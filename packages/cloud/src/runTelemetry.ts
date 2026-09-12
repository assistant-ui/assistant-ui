import type { SamplingCallData } from "./instrumentMcpSampling";
import type { AssistantCloudRunReport } from "./AssistantCloudRuns";

const MAX_TELEMETRY_TEXT_LENGTH = 50_000;

const BASE64_PATTERN = /^[A-Za-z0-9+/]{100,}={0,2}$/;

export type AssistantCloudRunReportToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "mcp" | "frontend" | "backend";
  start_ms?: number;
  end_ms?: number;
  sampling_calls?: SamplingCallData[];
};

export type RunReportOutcome =
  | "aborted"
  | "disconnected"
  | "length"
  | "content_filter";

/**
 * Maps a finish event to the report status and outcome. `fallbackStatus`
 * applies when the event carries neither a finish reason nor a failure flag.
 */
export function deriveRunOutcome(
  input: {
    finishReason?: string | undefined;
    isAbort?: boolean | undefined;
    isDisconnect?: boolean | undefined;
    isError?: boolean | undefined;
  },
  fallbackStatus: "completed" | "incomplete" = "completed",
): {
  status: "completed" | "incomplete" | "error";
  outcome?: RunReportOutcome;
} {
  if (input.isError) return { status: "error" };
  if (input.isAbort) return { status: "incomplete", outcome: "aborted" };
  if (input.isDisconnect) {
    return { status: "incomplete", outcome: "disconnected" };
  }
  switch (input.finishReason) {
    case "length":
      return { status: "incomplete", outcome: "length" };
    case "content-filter":
    case "content_filter":
      return { status: "incomplete", outcome: "content_filter" };
    case "cancelled":
      return { status: "incomplete", outcome: "aborted" };
    case "error":
      return { status: "error" };
    default:
      return {
        status: input.finishReason === undefined ? fallbackStatus : "completed",
      };
  }
}

const MAX_RUN_ERROR_CODE_LENGTH = 64;
const MAX_RUN_ERROR_LENGTH = 2048;

/**
 * Reads the message and code the runs endpoint stores for a failed run. The
 * code is the error's `code` when it has one, else its class name.
 */
export function describeRunError(error: unknown): {
  error?: string;
  errorCode?: string;
} {
  if (error == null) return {};
  const record =
    typeof error === "object" ? (error as Record<string, unknown>) : undefined;
  const message =
    typeof error === "string"
      ? error
      : typeof record?.message === "string"
        ? record.message
        : undefined;
  const code =
    typeof record?.code === "string"
      ? record.code
      : typeof record?.name === "string" && record.name !== "Error"
        ? record.name
        : undefined;
  return {
    ...(message
      ? { error: message.slice(0, MAX_RUN_ERROR_LENGTH) }
      : undefined),
    ...(code
      ? { errorCode: code.slice(0, MAX_RUN_ERROR_CODE_LENGTH) }
      : undefined),
  };
}

/**
 * Clamps a string to the size the runs endpoint accepts for a single span
 * field.
 */
export function truncateRunTelemetryText(value: string): string {
  if (value.length <= MAX_TELEMETRY_TEXT_LENGTH) return value;
  return value.slice(0, MAX_TELEMETRY_TEXT_LENGTH);
}

function safeStringify(value: unknown): string | undefined {
  if (value == null) return undefined;
  try {
    return truncateRunTelemetryText(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function summarizeMcpResult(value: unknown): string | undefined {
  if (value == null) return undefined;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      const summarized = parsed.map((item) => {
        if (item && typeof item === "object" && item.type) {
          if (
            (item.type === "image" || item.type === "audio") &&
            typeof item.data === "string" &&
            BASE64_PATTERN.test(item.data.slice(0, 200))
          ) {
            const sizeKB = ((item.data.length * 3) / 4 / 1024).toFixed(1);
            return { ...item, data: `[${item.type}: ${sizeKB}KB]` };
          }
        }
        return item;
      });
      return truncateRunTelemetryText(JSON.stringify(summarized));
    }
  } catch {
    // not JSON array, fall through
  }
  return safeStringify(value);
}

export type RunTelemetryToolCallInit = {
  toolName: string;
  toolCallId: string;
  args?: unknown;
  /**
   * Pre-serialized arguments, used in place of serializing `args`. Values over
   * the span size are clamped before they are included in the report.
   */
  argsText?: string | undefined;
  result?: unknown;
  toolSource?: "mcp" | "frontend" | "backend" | undefined;
};

/**
 * Serializes one tool call into the shape the runs endpoint accepts. An `mcp`
 * source has its result summarized, because MCP content blocks carry inline
 * base64 image and audio payloads that would otherwise dominate the report.
 */
export function createRunTelemetryToolCall(
  init: RunTelemetryToolCallInit,
): AssistantCloudRunReportToolCall {
  const { toolName, toolCallId, args, argsText, result, toolSource } = init;
  const call: AssistantCloudRunReportToolCall = {
    tool_name: toolName,
    tool_call_id: toolCallId,
  };
  const toolArgs =
    argsText != null ? truncateRunTelemetryText(argsText) : safeStringify(args);
  if (toolArgs !== undefined) call.tool_args = toolArgs;
  const toolResult =
    toolSource === "mcp" ? summarizeMcpResult(result) : safeStringify(result);
  if (toolResult !== undefined) call.tool_result = toolResult;
  if (toolSource) call.tool_source = toolSource;
  return call;
}

/**
 * Resolves the model ID a run reports, in the order an app can supply it: an
 * explicit `modelId`, the `custom` bag, then the per-step `response.modelId`
 * that a `messageMetadata` callback copies off the AI SDK's finish-step part.
 * The AI SDK puts no model ID on a UI message part, so message metadata is the
 * only channel one arrives on.
 */
export function extractRunTelemetryModelId(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.modelId === "string") return metadata.modelId;
  const custom = metadata.custom as Record<string, unknown> | undefined;
  if (typeof custom?.modelId === "string") return custom.modelId;

  const steps: unknown = metadata.steps;
  if (!Array.isArray(steps)) return undefined;
  for (const step of steps as unknown[]) {
    if (!step || typeof step !== "object") continue;
    const response = (step as Record<string, unknown>).response;
    if (!response || typeof response !== "object") continue;
    const modelId = (response as Record<string, unknown>).modelId;
    if (typeof modelId === "string") return modelId;
  }
  return undefined;
}

export type RunTelemetryUsage = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  reasoningTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
};

export type RunTelemetryUsageInit = RunTelemetryUsage & {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  inputTokenDetails?: { cacheReadTokens?: number };
  outputTokenDetails?: { reasoningTokens?: number };
};

export type RunReportStepInit = {
  usage?: RunTelemetryUsageInit | undefined;
  toolCalls?: AssistantCloudRunReportToolCall[] | undefined;
  startMs?: number | undefined;
  endMs?: number | undefined;
  finishReason?: string | undefined;
};

/**
 * The run report fields read from the messages of one run, in whichever
 * format they were stored: the status the messages imply, the tool calls, the
 * steps, the text, the usage and the model.
 */
export type RunMessageTelemetry = {
  assistantMessageId?: string;
  status: "completed" | "incomplete";
  toolCalls?: AssistantCloudRunReportToolCall[];
  steps?: RunReportStepInit[];
  totalSteps?: number;
  outputText?: string;
  usage?: RunTelemetryUsage;
  modelId?: string;
  metadata?: Record<string, unknown>;
};

export type RunReportInit = {
  threadId: string;
  status: AssistantCloudRunReport["status"];
  outcome?: RunReportOutcome | undefined;
  errorCode?: string | undefined;
  error?: string | undefined;
  messageId?: string | undefined;
  traceId?: string | undefined;
  modelId?: string | undefined;
  provider?: string | undefined;
  usage?: RunTelemetryUsageInit | undefined;
  steps?: RunReportStepInit[] | undefined;
  totalSteps?: number | undefined;
  toolCalls?: AssistantCloudRunReportToolCall[] | undefined;
  durationMs?: number | undefined;
  firstTokenMs?: number | undefined;
  outputText?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  telemetry?: {
    environment?: string | undefined;
    release?: string | undefined;
    tags?: readonly string[] | undefined;
  };
};

function assignUsage(
  report: AssistantCloudRunReport,
  usage: RunTelemetryUsageInit | undefined,
): void {
  if (!usage) return;
  const normalized = normalizeRunTelemetryUsage(usage);
  if (!normalized) return;
  if (normalized.inputTokens !== undefined) {
    report.input_tokens = normalized.inputTokens;
  }
  if (normalized.outputTokens !== undefined) {
    report.output_tokens = normalized.outputTokens;
  }
  if (normalized.reasoningTokens !== undefined) {
    report.reasoning_tokens = normalized.reasoningTokens;
  }
  if (normalized.cachedInputTokens !== undefined) {
    report.cached_input_tokens = normalized.cachedInputTokens;
  }
}

function createRunReportStep(
  init: RunReportStepInit,
): NonNullable<AssistantCloudRunReport["steps"]>[number] {
  const step: NonNullable<AssistantCloudRunReport["steps"]>[number] = {};
  const usage = init.usage ? normalizeRunTelemetryUsage(init.usage) : undefined;
  if (usage?.inputTokens !== undefined) step.input_tokens = usage.inputTokens;
  if (usage?.outputTokens !== undefined)
    step.output_tokens = usage.outputTokens;
  if (usage?.reasoningTokens !== undefined) {
    step.reasoning_tokens = usage.reasoningTokens;
  }
  if (usage?.cachedInputTokens !== undefined) {
    step.cached_input_tokens = usage.cachedInputTokens;
  }
  if (init.toolCalls !== undefined) step.tool_calls = init.toolCalls;
  if (init.startMs !== undefined) step.start_ms = init.startMs;
  if (init.endMs !== undefined) step.end_ms = init.endMs;
  if (init.finishReason !== undefined) {
    step.finish_reason = init.finishReason.slice(0, 32);
  }
  return step;
}

function normalizeRunReportTags(
  tags: readonly string[] | undefined,
): string[] | undefined {
  if (!tags) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim().slice(0, 64).trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length === 20) break;
  }
  return result.length > 0 ? result : undefined;
}

function normalizeRunReportMilliseconds(
  value: number | undefined,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

export function createRunReport(init: RunReportInit): AssistantCloudRunReport {
  const report: AssistantCloudRunReport = {
    thread_id: init.threadId,
    status: init.status,
  };
  const traceId = init.traceId?.toLowerCase();
  if (traceId && /^[0-9a-f]{32}$/.test(traceId)) report.trace_id = traceId;
  if (init.outcome !== undefined) report.outcome_type = init.outcome;
  if (init.errorCode !== undefined) report.error_code = init.errorCode;
  if (init.error !== undefined) report.error = init.error;
  if (init.messageId !== undefined) report.message_id = init.messageId;
  if (init.modelId !== undefined) report.model_id = init.modelId;
  if (init.provider !== undefined) {
    report.provider = init.provider;
    report.provider_type = init.provider;
  }
  assignUsage(report, init.usage);
  if (init.steps !== undefined) {
    report.steps = init.steps.map(createRunReportStep);
    report.total_steps = init.steps.length;
  } else if (init.totalSteps !== undefined) {
    report.total_steps = init.totalSteps;
  }
  if (init.toolCalls !== undefined) report.tool_calls = init.toolCalls;
  const durationMs = normalizeRunReportMilliseconds(init.durationMs);
  if (durationMs !== undefined) report.duration_ms = durationMs;
  const firstTokenMs = normalizeRunReportMilliseconds(init.firstTokenMs);
  if (firstTokenMs !== undefined) report.first_token_ms = firstTokenMs;
  if (init.outputText !== undefined) {
    report.output_text = truncateRunTelemetryText(init.outputText);
  }
  if (init.metadata !== undefined) report.metadata = init.metadata;
  if (init.telemetry?.environment !== undefined) {
    report.environment = init.telemetry.environment;
  }
  if (init.telemetry?.release !== undefined) {
    report.release = init.telemetry.release;
  }
  const tags = normalizeRunReportTags(init.telemetry?.tags);
  if (tags !== undefined) report.tags = tags;
  return report;
}

/**
 * Resolves the token counts a provider reports under any of the names the AI
 * SDK has used: the current top-level ones, the legacy prompt/completion pair,
 * and the v7 token detail objects. Returns undefined when no count is present,
 * so callers can tell an empty usage object from a zeroed one.
 */
export function normalizeRunTelemetryUsage(
  usage: RunTelemetryUsageInit,
): RunTelemetryUsage | undefined {
  const inputTokens = usage.inputTokens ?? usage.promptTokens;
  const outputTokens = usage.outputTokens ?? usage.completionTokens;
  // AI SDK v7 moved these under token detail objects; v6 kept them top-level.
  const reasoningTokens =
    usage.reasoningTokens ?? usage.outputTokenDetails?.reasoningTokens;
  const cachedInputTokens =
    usage.cachedInputTokens ?? usage.inputTokenDetails?.cacheReadTokens;

  if (
    inputTokens == null &&
    outputTokens == null &&
    reasoningTokens == null &&
    cachedInputTokens == null
  ) {
    return undefined;
  }

  return {
    ...(inputTokens != null ? { inputTokens } : undefined),
    ...(outputTokens != null ? { outputTokens } : undefined),
    ...(reasoningTokens != null ? { reasoningTokens } : undefined),
    ...(cachedInputTokens != null ? { cachedInputTokens } : undefined),
  };
}
