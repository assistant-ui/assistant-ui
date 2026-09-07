import type { UIMessage } from "@ai-sdk/react";
import { getToolName, isStaticToolUIPart, isToolUIPart } from "ai";
import {
  type AssistantCloudRunReportToolCall,
  createRunTelemetryToolCall,
  normalizeRunTelemetryUsage,
  type RunTelemetryUsageInit,
  type SamplingCallData,
  truncateRunTelemetryText,
} from "assistant-cloud";

export type RunTelemetryData = {
  assistantMessageId: string;
  status: "completed" | "incomplete";
  toolCalls?: AssistantCloudRunReportToolCall[];
  totalSteps?: number;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  modelId?: string;
};

type Part = UIMessage["parts"][number];
type ToolPart = Extract<Part, { toolCallId: string }>;

function buildToolCall(part: ToolPart): AssistantCloudRunReportToolCall {
  // dynamic-tool → mcp, static `tool-*` → frontend. matches server-side
  // createAssistantRun (apps/cloud-api/src/endpoints/runs/stream.ts).
  const isMcp = !isStaticToolUIPart(part);
  return createRunTelemetryToolCall({
    toolName: getToolName(part),
    toolCallId: part.toolCallId,
    args: "input" in part ? part.input : undefined,
    result: "output" in part ? part.output : undefined,
    toolSource: isMcp ? "mcp" : "frontend",
  });
}

function extractResponseModelId(response: unknown): string | undefined {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return undefined;
  }
  const modelId = (response as Record<string, unknown>).modelId;
  return typeof modelId === "string" ? modelId : undefined;
}

function extractModelId(
  metadata?: Record<string, unknown>,
  responseModelIds?: readonly string[],
): string | undefined {
  if (metadata) {
    if (typeof metadata.modelId === "string") return metadata.modelId;
    const custom = metadata.custom as Record<string, unknown> | undefined;
    if (typeof custom?.modelId === "string") return custom.modelId;

    const steps = metadata.steps;
    if (Array.isArray(steps)) {
      for (const step of steps) {
        if (!step || typeof step !== "object" || Array.isArray(step)) {
          continue;
        }
        const modelId = extractResponseModelId(
          (step as Record<string, unknown>).response,
        );
        if (modelId) return modelId;
      }
    }
  }

  return responseModelIds?.find(Boolean);
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
  const toolCalls: AssistantCloudRunReportToolCall[] = [];
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
  const outputText = hasText
    ? truncateRunTelemetryText(textParts.join(""))
    : undefined;
  // fallback heuristic; callers with the onFinish event should override via deriveStatus.
  const status: RunTelemetryData["status"] = hasText
    ? "completed"
    : "incomplete";

  const metadata = assistant.metadata as Record<string, unknown> | undefined;
  const responseModelIds = assistant.parts.flatMap((part) => {
    const modelId = extractResponseModelId(
      (part as { response?: unknown }).response,
    );
    return modelId ? [modelId] : [];
  });
  const modelId = extractModelId(metadata, responseModelIds);
  const usage = metadata?.usage as RunTelemetryUsageInit | undefined;
  const normalizedUsage = usage ? normalizeRunTelemetryUsage(usage) : undefined;

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
