import type { UIMessage } from "@ai-sdk/react";
import { getToolName, isStaticToolUIPart, isToolUIPart } from "ai";
import type { SamplingCallData } from "assistant-cloud";

const MAX_SPAN_CONTENT = 50_000;

function truncateStr(value: string): string {
  if (value.length <= MAX_SPAN_CONTENT) return value;
  return value.slice(0, MAX_SPAN_CONTENT);
}

function safeStringify(value: unknown): string | undefined {
  if (value == null) return undefined;
  try {
    return truncateStr(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]{100,}={0,2}$/;

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
      return truncateStr(JSON.stringify(summarized));
    }
  } catch {
    // not JSON array, fall through
  }
  return safeStringify(value);
}

export type TelemetryToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "mcp" | "frontend" | "backend";
  sampling_calls?: SamplingCallData[];
};

export type RunTelemetryData = {
  assistantMessageId: string;
  status: "completed" | "incomplete";
  toolCalls?: TelemetryToolCall[];
  totalSteps?: number;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  modelId?: string;
};

type UsageFields = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

function normalizeUsage(usage: UsageFields):
  | {
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    }
  | undefined {
  const inputTokens = usage.inputTokens ?? usage.promptTokens;
  const outputTokens = usage.outputTokens ?? usage.completionTokens;

  if (
    inputTokens == null &&
    outputTokens == null &&
    usage.reasoningTokens == null &&
    usage.cachedInputTokens == null
  ) {
    return undefined;
  }

  return {
    ...(inputTokens != null ? { inputTokens } : undefined),
    ...(outputTokens != null ? { outputTokens } : undefined),
    ...(usage.reasoningTokens != null
      ? { reasoningTokens: usage.reasoningTokens }
      : undefined),
    ...(usage.cachedInputTokens != null
      ? { cachedInputTokens: usage.cachedInputTokens }
      : undefined),
  };
}

type Part = UIMessage["parts"][number];
type ToolPart = Extract<Part, { toolCallId: string }>;

function buildToolCall(part: ToolPart): TelemetryToolCall {
  // dynamic-tool → mcp, static `tool-*` → frontend. matches server-side
  // createAssistantRun (apps/cloud-api/src/endpoints/runs/stream.ts).
  const isMcp = !isStaticToolUIPart(part);
  const call: TelemetryToolCall = {
    tool_name: getToolName(part),
    tool_call_id: part.toolCallId,
    tool_source: isMcp ? "mcp" : "frontend",
  };

  const input = "input" in part ? part.input : undefined;
  const toolArgs = safeStringify(input);
  if (toolArgs !== undefined) call.tool_args = toolArgs;

  const output = "output" in part ? part.output : undefined;
  const toolResult = isMcp ? summarizeMcpResult(output) : safeStringify(output);
  if (toolResult !== undefined) call.tool_result = toolResult;

  return call;
}

export function extractRunTelemetry(
  messages: UIMessage[],
): RunTelemetryData | null {
  let assistant: UIMessage | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "assistant") {
      assistant = messages[i];
      break;
    }
  }
  if (!assistant) return null;

  const textParts: string[] = [];
  const toolCalls: TelemetryToolCall[] = [];
  let stepCount = 0;

  for (const part of assistant.parts) {
    if (part.type === "step-start") {
      stepCount++;
    } else if (part.type === "text" && part.text) {
      textParts.push(part.text);
    } else if (isToolUIPart(part)) {
      toolCalls.push(buildToolCall(part));
    }
  }

  const hasText = textParts.length > 0;
  const outputText = hasText ? truncateStr(textParts.join("")) : undefined;
  // fallback heuristic; callers with the onFinish event should override via deriveStatus.
  const status: RunTelemetryData["status"] = hasText
    ? "completed"
    : "incomplete";

  const metadata = assistant.metadata as Record<string, unknown> | undefined;
  const modelId =
    typeof metadata?.modelId === "string" ? metadata.modelId : undefined;
  const usage = metadata?.usage as UsageFields | undefined;
  const normalizedUsage = usage ? normalizeUsage(usage) : undefined;

  const rawSamplingCalls = metadata?.samplingCalls;
  const samplingCallsMap =
    rawSamplingCalls != null && typeof rawSamplingCalls === "object"
      ? (rawSamplingCalls as Record<string, SamplingCallData[]>)
      : undefined;

  if (samplingCallsMap) {
    for (const tc of toolCalls) {
      const calls = samplingCallsMap[tc.tool_call_id];
      if (Array.isArray(calls) && calls.length > 0) {
        tc.sampling_calls = calls;
      }
    }
  }

  return {
    assistantMessageId: assistant.id,
    status,
    ...(toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(stepCount > 0 ? { totalSteps: stepCount } : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(normalizedUsage?.inputTokens != null
      ? { inputTokens: normalizedUsage.inputTokens }
      : undefined),
    ...(normalizedUsage?.outputTokens != null
      ? { outputTokens: normalizedUsage.outputTokens }
      : undefined),
    ...(normalizedUsage?.reasoningTokens != null
      ? { reasoningTokens: normalizedUsage.reasoningTokens }
      : undefined),
    ...(normalizedUsage?.cachedInputTokens != null
      ? { cachedInputTokens: normalizedUsage.cachedInputTokens }
      : undefined),
    ...(modelId ? { modelId } : undefined),
  };
}
