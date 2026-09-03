import type { SamplingCallData } from "./instrumentMcpSampling";

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

export type RunTelemetryUsage = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export type RunTelemetryUsageInit = RunTelemetryUsage & {
  promptTokens?: number;
  completionTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
  outputTokenDetails?: { reasoningTokens?: number };
};

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
