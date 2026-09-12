import type { UIMessage } from "ai";
import type { MessageFormatAdapter } from "../FormattedCloudPersistence";
import type { SamplingCallData } from "../instrumentMcpSampling";
import {
  type AssistantCloudRunReportToolCall,
  createRunTelemetryToolCall,
  extractRunTelemetryModelId,
  normalizeRunTelemetryUsage,
  type RunReportStepInit,
  type RunTelemetryUsage,
  type RunTelemetryUsageInit,
  truncateRunTelemetryText,
} from "../runTelemetry";

export type AISDKStorageFormat = Omit<UIMessage, "id">;

/** The stored form of an AI SDK message: the message without its id. */
export const aiSDKV6FormatAdapter: MessageFormatAdapter<
  UIMessage,
  AISDKStorageFormat
> = {
  format: "ai-sdk/v6",
  encode: ({ message: { id: _id, ...message } }) => message,
  decode: (stored) => ({
    parentId: stored.parent_id,
    message: { id: stored.id, ...stored.content } as UIMessage,
  }),
  getId: (message) => message.id,
};

/**
 * A message as an AI SDK integration holds it, or as the cloud stored it under
 * the ai-sdk/v6 format, which drops the id.
 */
export type AISDKMessageLike = {
  id?: string | undefined;
  role: string;
  parts: readonly UIMessage["parts"][number][];
  metadata?: unknown;
};

export type AISDKRunTelemetry = {
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

type Part = UIMessage["parts"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * The AI SDK's own tool part rules, kept here so the entry loads without the
 * `ai` runtime: a static tool part is `tool-<name>`, a dynamic one is
 * `dynamic-tool` with its name in `toolName`.
 */
function toolCallOf(part: Part): AssistantCloudRunReportToolCall | undefined {
  const raw = part as unknown as Record<string, unknown>;
  if (typeof raw.toolCallId !== "string") return undefined;
  const isStatic = part.type.startsWith("tool-");
  if (!isStatic && part.type !== "dynamic-tool") return undefined;
  const toolName = isStatic
    ? part.type.slice("tool-".length)
    : typeof raw.toolName === "string"
      ? raw.toolName
      : undefined;
  if (!toolName) return undefined;
  return createRunTelemetryToolCall({
    toolName,
    toolCallId: raw.toolCallId,
    args: raw.input ?? raw.args,
    result: raw.output ?? raw.result,
    toolSource: isStatic ? "frontend" : "mcp",
  });
}

function attachSamplingCalls(
  toolCalls: readonly AssistantCloudRunReportToolCall[],
  metadata: Record<string, unknown> | undefined,
): void {
  const samplingCalls = isRecord(metadata?.samplingCalls)
    ? (metadata.samplingCalls as Record<string, SamplingCallData[]>)
    : undefined;
  if (!samplingCalls) return;
  for (const toolCall of toolCalls) {
    const calls = samplingCalls[toolCall.tool_call_id];
    if (Array.isArray(calls) && calls.length > 0) {
      toolCall.sampling_calls = calls;
    }
  }
}

function stepUsages(
  metadata: Record<string, unknown> | undefined,
): (RunTelemetryUsageInit | undefined)[] {
  const steps = metadata?.steps;
  if (!Array.isArray(steps)) return [];
  return steps.map((step) =>
    isRecord(step) && isRecord(step.usage)
      ? (step.usage as RunTelemetryUsageInit)
      : undefined,
  );
}

function sumUsage(usages: readonly RunTelemetryUsage[]): RunTelemetryUsage {
  const total: RunTelemetryUsage = {};
  for (const usage of usages) {
    if (usage.inputTokens != null) {
      total.inputTokens = (total.inputTokens ?? 0) + usage.inputTokens;
    }
    if (usage.outputTokens != null) {
      total.outputTokens = (total.outputTokens ?? 0) + usage.outputTokens;
    }
    if (usage.reasoningTokens != null) {
      total.reasoningTokens =
        (total.reasoningTokens ?? 0) + usage.reasoningTokens;
    }
    if (usage.cachedInputTokens != null) {
      total.cachedInputTokens =
        (total.cachedInputTokens ?? 0) + usage.cachedInputTokens;
    }
  }
  return total;
}

/**
 * The usage a message reports: `metadata.usage` when the integration copied
 * the run total there, else the sum over `metadata.steps[].usage`.
 */
function messageUsage(
  metadata: Record<string, unknown> | undefined,
): RunTelemetryUsage | undefined {
  const total = isRecord(metadata?.usage)
    ? normalizeRunTelemetryUsage(metadata.usage as RunTelemetryUsageInit)
    : undefined;
  if (total) return total;
  const perStep = stepUsages(metadata).flatMap((usage) => {
    const normalized = usage ? normalizeRunTelemetryUsage(usage) : undefined;
    return normalized ? [normalized] : [];
  });
  return perStep.length > 0 ? sumUsage(perStep) : undefined;
}

/**
 * Reads the run report fields out of the assistant messages of one run. A run
 * the AI SDK streamed as one message is one element; a run the cloud stored as
 * several assistant rows is aggregated, step by step, in order. Returns null
 * when no assistant message is present. Status falls back to the presence of
 * text; an integration that observed the finish event overrides it.
 */
export function extractAISDKRunTelemetry(
  messages: readonly AISDKMessageLike[],
): AISDKRunTelemetry | null {
  const textParts: string[] = [];
  const toolCalls: AssistantCloudRunReportToolCall[] = [];
  const steps: RunReportStepInit[] = [];
  const usages: RunTelemetryUsage[] = [];
  let assistant: AISDKMessageLike | undefined;

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    assistant = message;
    const metadata = isRecord(message.metadata) ? message.metadata : undefined;
    const usagePerStep = stepUsages(metadata);
    const messageToolCalls: AssistantCloudRunReportToolCall[] = [];
    let step: RunReportStepInit | undefined;
    let stepIndex = -1;

    for (const part of message.parts) {
      if (part.type === "step-start") {
        stepIndex += 1;
        const usage = usagePerStep[stepIndex];
        step = usage ? { usage } : {};
        steps.push(step);
        continue;
      }
      if (part.type === "text" && part.text) {
        textParts.push(part.text);
        continue;
      }
      const toolCall = toolCallOf(part);
      if (!toolCall) continue;
      toolCalls.push(toolCall);
      messageToolCalls.push(toolCall);
      if (step) {
        step.toolCalls = [...(step.toolCalls ?? []), toolCall];
        step.finishReason = "tool-calls";
      }
    }

    attachSamplingCalls(messageToolCalls, metadata);
    const usage = messageUsage(metadata);
    if (usage) usages.push(usage);
  }

  if (!assistant) return null;

  const metadata = isRecord(assistant.metadata)
    ? assistant.metadata
    : undefined;

  const usage = usages.length > 0 ? sumUsage(usages) : undefined;
  const modelId = extractRunTelemetryModelId(metadata);
  return {
    ...(assistant.id !== undefined
      ? { assistantMessageId: assistant.id }
      : undefined),
    status: textParts.length > 0 ? "completed" : "incomplete",
    ...(toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(steps.length > 0 ? { steps, totalSteps: steps.length } : undefined),
    ...(textParts.length > 0
      ? { outputText: truncateRunTelemetryText(textParts.join("")) }
      : undefined),
    ...(usage ? { usage } : undefined),
    ...(modelId ? { modelId } : undefined),
    ...(metadata ? { metadata } : undefined),
  };
}
