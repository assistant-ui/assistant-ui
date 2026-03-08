import { RefObject, useState } from "react";
import type {
  GenericThreadHistoryAdapter,
  ThreadHistoryAdapter,
  ExportedMessageRepositoryItem,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "@assistant-ui/core";
import {
  AssistantCloud,
  CloudMessagePersistence,
  createFormattedPersistence,
} from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import { AssistantClient, useAui } from "@assistant-ui/store";
import { ThreadListItemMethods } from "../../types/scopes";

const globalPersistence = new WeakMap<
  ThreadListItemMethods,
  CloudMessagePersistence
>();

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private cloudRef: RefObject<AssistantCloud>,
    private aui: AssistantClient,
  ) {}

  private get _persistence(): CloudMessagePersistence {
    const key = this.aui.threadListItem();
    if (!globalPersistence.has(key)) {
      globalPersistence.set(
        key,
        new CloudMessagePersistence(this.cloudRef.current),
      );
    }
    return globalPersistence.get(key)!;
  }

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const adapter = this;
    const formatted = createFormattedPersistence(
      this._persistence,
      formatAdapter,
    );
    return {
      // Note: callers must also call reportTelemetry() for run tracking
      async append(item: MessageFormatItem<TMessage>) {
        const { remoteId } = await adapter.aui.threadListItem().initialize();
        await formatted.append(remoteId, item);
      },
      async update(item: MessageFormatItem<TMessage>, localMessageId: string) {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return;
        await formatted.update?.(remoteId, item, localMessageId);
      },
      reportTelemetry(
        items: MessageFormatItem<TMessage>[],
        options?: {
          durationMs?: number;
          stepTimestamps?: StepTimestamp[];
        },
      ) {
        const encodedRunMessages = items.map((item) =>
          formatAdapter.encode(item),
        );
        adapter._reportRunTelemetry(
          formatAdapter.format,
          encodedRunMessages,
          options,
        );
      },
      async load(): Promise<MessageFormatRepository<TMessage>> {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };
        return formatted.load(remoteId);
      },
    };
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.aui.threadListItem().initialize();
    const encoded = auiV0Encode(message);
    await this._persistence.append(
      remoteId,
      message.id,
      parentId,
      "aui/v0",
      encoded,
    );

    if (this.cloudRef.current.telemetry.enabled) {
      this._maybeReportRun(remoteId, "aui/v0", encoded);
    }
  }

  async load() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };
    const messages = await this._persistence.load(remoteId, "aui/v0");
    return {
      messages: messages
        .filter(
          (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
        )
        .map(auiV0Decode)
        .reverse(),
    };
  }

  private _reportRunTelemetry<T>(
    format: string,
    runMessages: T[],
    options?: {
      durationMs?: number;
      stepTimestamps?: StepTimestamp[];
    },
  ) {
    if (!this.cloudRef.current.telemetry.enabled) return;

    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return;

    const extracted = extractRunTelemetry(format, runMessages);
    if (!extracted) return;

    this._sendReport(
      remoteId,
      extracted,
      options?.durationMs,
      options?.stepTimestamps,
    );
  }

  private _maybeReportRun<T>(remoteId: string, format: string, content: T) {
    const extracted = extractTelemetry(format, content);
    if (!extracted) return;

    this._sendReport(remoteId, extracted);
  }

  private _sendReport(
    remoteId: string,
    data: TelemetryData,
    durationMs?: number,
    stepTimestamps?: StepTimestamp[],
  ) {
    const mergedSteps = mergeStepTimestamps(data.steps, stepTimestamps);
    // Keep in sync with assistant-cloud createRunSchema
    // (apps/aui-cloud-api/src/endpoints/runs/create.ts).
    const initial: Parameters<typeof this.cloudRef.current.runs.report>[0] = {
      thread_id: remoteId,
      status: data.status,
      ...(data.totalSteps != null
        ? { total_steps: data.totalSteps }
        : undefined),
      ...(data.toolCalls ? { tool_calls: data.toolCalls } : undefined),
      ...(mergedSteps ? { steps: mergedSteps } : undefined),
      ...(data.inputTokens != null
        ? { input_tokens: data.inputTokens }
        : undefined),
      ...(data.outputTokens != null
        ? { output_tokens: data.outputTokens }
        : undefined),
      ...(data.reasoningTokens != null
        ? { reasoning_tokens: data.reasoningTokens }
        : undefined),
      ...(data.cachedInputTokens != null
        ? { cached_input_tokens: data.cachedInputTokens }
        : undefined),
      ...(durationMs != null ? { duration_ms: durationMs } : undefined),
      ...(data.outputText != null
        ? { output_text: data.outputText }
        : undefined),
      ...(data.metadata ? { metadata: data.metadata } : undefined),
      ...(data.modelId ? { model_id: data.modelId } : undefined),
    };

    const { beforeReport } = this.cloudRef.current.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.cloudRef.current.runs.report(report).catch(() => {});
  }
}

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

type TelemetryToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "mcp" | "frontend" | "backend";
};

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

function buildToolCall(
  toolName: string,
  toolCallId: string,
  args: unknown,
  result: unknown,
  argsText?: string,
  toolSource?: "mcp" | "frontend" | "backend",
): TelemetryToolCall {
  const call: TelemetryToolCall = {
    tool_name: toolName,
    tool_call_id: toolCallId,
  };
  const toolArgs = argsText ?? safeStringify(args);
  if (toolArgs !== undefined) call.tool_args = toolArgs;
  const toolResult =
    toolSource === "mcp" ? summarizeMcpResult(result) : safeStringify(result);
  if (toolResult !== undefined) call.tool_result = toolResult;
  if (toolSource) call.tool_source = toolSource;
  return call;
}

type TelemetryStepData = {
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  tool_calls?: TelemetryToolCall[];
  start_ms?: number;
  end_ms?: number;
};

type StepTimestamp = { start_ms: number; end_ms: number };

function mergeStepTimestamps(
  steps: TelemetryStepData[] | undefined,
  timestamps: StepTimestamp[] | undefined,
): TelemetryStepData[] | undefined {
  if (!timestamps) return steps;
  if (!steps) return timestamps.map((t) => ({ ...t }));

  const len = Math.min(steps.length, timestamps.length);
  return steps.map((s, i) => ({
    ...s,
    ...(i < len ? timestamps[i] : undefined),
  }));
}

type TelemetryData = {
  status: "completed" | "incomplete" | "error";
  toolCalls?: TelemetryToolCall[];
  totalSteps?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  outputText?: string;
  metadata?: Record<string, unknown>;
  steps?: TelemetryStepData[];
  modelId?: string;
};

function extractTelemetry<T>(format: string, content: T): TelemetryData | null {
  switch (format) {
    case "aui/v0":
      return extractAuiV0(content);
    case "ai-sdk/v6":
      return extractAiSdkV6(content);
    default:
      return null;
  }
}

function extractRunTelemetry<T>(
  format: string,
  runMessages: T[],
): TelemetryData | null {
  if (format === "ai-sdk/v6") {
    return aggregateAiSdkV6RunSteps(runMessages);
  }
  for (let i = runMessages.length - 1; i >= 0; i--) {
    const result = extractTelemetry(format, runMessages[i]!);
    if (result) return result;
  }
  return null;
}

const AUI_STATUS_MAP: Record<string, TelemetryData["status"]> = {
  error: "error",
  incomplete: "incomplete",
};

function extractAuiV0<T>(content: T): TelemetryData | null {
  const msg = content as {
    role?: string;
    status?: { type: string };
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
      steps?: readonly {
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          reasoningTokens?: number;
          cachedInputTokens?: number;
        };
      }[];
      custom?: Record<string, unknown> & { modelId?: string };
    };
  };

  if (msg.role !== "assistant") return null;

  const toolCalls = msg.content
    ?.filter((p) => p.type === "tool-call" && p.toolName && p.toolCallId)
    .map((p) =>
      buildToolCall(p.toolName!, p.toolCallId!, p.args, p.result, p.argsText),
    );

  const textParts = msg.content?.filter((p) => p.type === "text" && p.text);
  const outputText =
    textParts && textParts.length > 0
      ? truncateStr(textParts.map((p) => p.text).join(""))
      : undefined;

  const steps = msg.metadata?.steps;
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
      if (step.usage?.inputTokens != null) {
        totalInput += step.usage.inputTokens;
        hasInput = true;
      }
      if (step.usage?.outputTokens != null) {
        totalOutput += step.usage.outputTokens;
        hasOutput = true;
      }
      if (step.usage?.reasoningTokens != null) {
        totalReasoning += step.usage.reasoningTokens;
        hasReasoning = true;
      }
      if (step.usage?.cachedInputTokens != null) {
        totalCachedInput += step.usage.cachedInputTokens;
        hasCachedInput = true;
      }
    }
    inputTokens = hasInput ? totalInput : undefined;
    outputTokens = hasOutput ? totalOutput : undefined;
    reasoningTokens = hasReasoning ? totalReasoning : undefined;
    cachedInputTokens = hasCachedInput ? totalCachedInput : undefined;
  }

  const statusType = msg.status?.type;
  const status: TelemetryData["status"] =
    (statusType && AUI_STATUS_MAP[statusType]) || "completed";

  const metadata = msg.metadata?.custom as Record<string, unknown> | undefined;
  const modelId =
    msg.metadata?.modelId ??
    (typeof msg.metadata?.custom?.modelId === "string"
      ? msg.metadata.custom.modelId
      : undefined);

  const telemetrySteps: TelemetryStepData[] | undefined =
    steps && steps.length > 1
      ? steps.map((s) => ({
          ...(s.usage?.inputTokens != null
            ? { input_tokens: s.usage.inputTokens }
            : undefined),
          ...(s.usage?.outputTokens != null
            ? { output_tokens: s.usage.outputTokens }
            : undefined),
          ...(s.usage?.reasoningTokens != null
            ? { reasoning_tokens: s.usage.reasoningTokens }
            : undefined),
          ...(s.usage?.cachedInputTokens != null
            ? { cached_input_tokens: s.usage.cachedInputTokens }
            : undefined),
        }))
      : undefined;

  return {
    status,
    ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(steps?.length ? { totalSteps: steps.length } : undefined),
    ...(inputTokens != null ? { inputTokens } : undefined),
    ...(outputTokens != null ? { outputTokens } : undefined),
    ...(reasoningTokens != null ? { reasoningTokens } : undefined),
    ...(cachedInputTokens != null ? { cachedInputTokens } : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata ? { metadata } : undefined),
    ...(telemetrySteps ? { steps: telemetrySteps } : undefined),
    ...(modelId ? { modelId } : undefined),
  };
}

type AiSdkV6Part = {
  type: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
  input?: unknown;
  output?: unknown;
};

type AiSdkV6Message = {
  role?: string;
  parts?: readonly AiSdkV6Part[];
  metadata?: Record<string, unknown>;
};

function isToolCallPart(p: AiSdkV6Part): boolean {
  if (!p.toolCallId) return false;
  if (p.type === "tool-call" || p.type === "dynamic-tool") return !!p.toolName;
  return p.type.startsWith("tool-") || p.type.startsWith("dynamic-tool-");
}

function isDynamicToolPart(p: AiSdkV6Part): boolean {
  return p.type === "dynamic-tool" || p.type.startsWith("dynamic-tool-");
}

function partToToolCall(p: AiSdkV6Part): TelemetryToolCall {
  const toolSource: "mcp" | undefined = isDynamicToolPart(p)
    ? "mcp"
    : undefined;
  return buildToolCall(
    p.toolName ?? p.type.slice(5),
    p.toolCallId!,
    p.args ?? p.input,
    p.result ?? p.output,
    undefined,
    toolSource,
  );
}

function collectAiSdkV6Parts(parts: readonly AiSdkV6Part[]): {
  textParts: string[];
  toolCalls: TelemetryToolCall[];
  stepsData: { tool_calls: TelemetryToolCall[] }[];
} {
  const textParts: string[] = [];
  const toolCalls: TelemetryToolCall[] = [];
  const stepsData: { tool_calls: TelemetryToolCall[] }[] = [];
  let currentStepToolCalls: TelemetryToolCall[] | null = null;

  for (const p of parts) {
    if (p.type === "step-start") {
      if (currentStepToolCalls !== null) {
        stepsData.push({ tool_calls: currentStepToolCalls });
      }
      currentStepToolCalls = [];
    } else if (p.type === "text" && p.text) {
      textParts.push(p.text);
    } else if (isToolCallPart(p)) {
      const tc = partToToolCall(p);
      toolCalls.push(tc);
      if (currentStepToolCalls !== null) {
        currentStepToolCalls.push(tc);
      }
    }
  }

  if (currentStepToolCalls !== null) {
    stepsData.push({ tool_calls: currentStepToolCalls });
  }

  return { textParts, toolCalls, stepsData };
}

function extractModelId(
  metadata?: Record<string, unknown>,
): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.modelId === "string") return metadata.modelId;
  const custom = metadata.custom as Record<string, unknown> | undefined;
  if (typeof custom?.modelId === "string") return custom.modelId;
  return undefined;
}

function buildAiSdkV6Result(
  textParts: string[],
  toolCalls: TelemetryToolCall[],
  totalSteps: number,
  metadata?: Record<string, unknown>,
  stepsData?: { tool_calls: TelemetryToolCall[] }[],
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  },
): TelemetryData {
  const hasText = textParts.length > 0;
  const outputText = hasText ? truncateStr(textParts.join("")) : undefined;
  const modelId = extractModelId(metadata);

  const steps: TelemetryStepData[] | undefined =
    stepsData && stepsData.length > 1
      ? stepsData.map((s) => ({
          ...(s.tool_calls.length > 0
            ? { tool_calls: s.tool_calls }
            : undefined),
        }))
      : undefined;

  return {
    status: hasText ? "completed" : "incomplete",
    ...(toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(totalSteps > 0 ? { totalSteps } : undefined),
    ...(usage?.inputTokens != null
      ? { inputTokens: usage.inputTokens }
      : undefined),
    ...(usage?.outputTokens != null
      ? { outputTokens: usage.outputTokens }
      : undefined),
    ...(usage?.reasoningTokens != null
      ? { reasoningTokens: usage.reasoningTokens }
      : undefined),
    ...(usage?.cachedInputTokens != null
      ? { cachedInputTokens: usage.cachedInputTokens }
      : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata ? { metadata } : undefined),
    ...(steps ? { steps } : undefined),
    ...(modelId ? { modelId } : undefined),
  };
}

type UsageFields = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

function normalizeUsage(u: UsageFields):
  | {
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    }
  | undefined {
  const input = u.inputTokens ?? u.promptTokens;
  const output = u.outputTokens ?? u.completionTokens;
  if (
    input == null &&
    output == null &&
    u.reasoningTokens == null &&
    u.cachedInputTokens == null
  ) {
    return undefined;
  }

  return {
    ...(input != null ? { inputTokens: input } : undefined),
    ...(output != null ? { outputTokens: output } : undefined),
    ...(u.reasoningTokens != null
      ? { reasoningTokens: u.reasoningTokens }
      : undefined),
    ...(u.cachedInputTokens != null
      ? { cachedInputTokens: u.cachedInputTokens }
      : undefined),
  };
}

function extractAiSdkV6Usage(metadata?: Record<string, unknown>):
  | {
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    }
  | undefined {
  // Try top-level metadata.usage
  const usage = metadata?.usage as UsageFields | undefined;
  if (usage) {
    const normalized = normalizeUsage(usage);
    if (normalized) return normalized;
  }

  // Try aggregating from metadata.steps[].usage
  const steps = metadata?.steps as
    | readonly { usage?: UsageFields }[]
    | undefined;
  if (steps && steps.length > 0) {
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    let cachedInputTokens = 0;
    let hasInput = false;
    let hasOutput = false;
    let hasReasoning = false;
    let hasCachedInput = false;
    let hasAny = false;
    for (const s of steps) {
      if (!s.usage) continue;
      const n = normalizeUsage(s.usage);
      if (n) {
        if (n.inputTokens != null) {
          inputTokens += n.inputTokens;
          hasInput = true;
        }
        if (n.outputTokens != null) {
          outputTokens += n.outputTokens;
          hasOutput = true;
        }
        if (n.reasoningTokens != null) {
          reasoningTokens += n.reasoningTokens;
          hasReasoning = true;
        }
        if (n.cachedInputTokens != null) {
          cachedInputTokens += n.cachedInputTokens;
          hasCachedInput = true;
        }
        hasAny = true;
      }
    }
    if (hasAny) {
      return {
        ...(hasInput ? { inputTokens } : undefined),
        ...(hasOutput ? { outputTokens } : undefined),
        ...(hasReasoning ? { reasoningTokens } : undefined),
        ...(hasCachedInput ? { cachedInputTokens } : undefined),
      };
    }
  }

  return undefined;
}

function extractAiSdkV6<T>(content: T): TelemetryData | null {
  const msg = content as AiSdkV6Message;
  if (msg.role !== "assistant") return null;

  const { textParts, toolCalls, stepsData } = collectAiSdkV6Parts(
    msg.parts ?? [],
  );
  return buildAiSdkV6Result(
    textParts,
    toolCalls,
    stepsData.length,
    msg.metadata,
    stepsData,
    extractAiSdkV6Usage(msg.metadata),
  );
}

function aggregateAiSdkV6RunSteps<T>(stepMessages: T[]): TelemetryData | null {
  const allTextParts: string[] = [];
  const allToolCalls: TelemetryToolCall[] = [];
  const allStepsData: { tool_calls: TelemetryToolCall[] }[] = [];
  let hasAssistant = false;
  let metadata: Record<string, unknown> | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let cachedInputTokens = 0;
  let hasInput = false;
  let hasOutput = false;
  let hasReasoning = false;
  let hasCachedInput = false;

  for (const content of stepMessages) {
    const msg = content as AiSdkV6Message;
    if (msg.role !== "assistant") continue;
    hasAssistant = true;

    const { textParts, toolCalls, stepsData } = collectAiSdkV6Parts(
      msg.parts ?? [],
    );
    allTextParts.push(...textParts);
    allToolCalls.push(...toolCalls);
    allStepsData.push(...stepsData);
    if (msg.metadata) metadata = msg.metadata;

    const usage = extractAiSdkV6Usage(msg.metadata);
    if (usage) {
      if (usage.inputTokens != null) {
        inputTokens += usage.inputTokens;
        hasInput = true;
      }
      if (usage.outputTokens != null) {
        outputTokens += usage.outputTokens;
        hasOutput = true;
      }
      if (usage.reasoningTokens != null) {
        reasoningTokens += usage.reasoningTokens;
        hasReasoning = true;
      }
      if (usage.cachedInputTokens != null) {
        cachedInputTokens += usage.cachedInputTokens;
        hasCachedInput = true;
      }
    }
  }

  if (!hasAssistant) return null;
  return buildAiSdkV6Result(
    allTextParts,
    allToolCalls,
    allStepsData.length,
    metadata,
    allStepsData,
    {
      ...(hasInput ? { inputTokens } : undefined),
      ...(hasOutput ? { outputTokens } : undefined),
      ...(hasReasoning ? { reasoningTokens } : undefined),
      ...(hasCachedInput ? { cachedInputTokens } : undefined),
    },
  );
}

export function useAssistantCloudThreadHistoryAdapter(
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter {
  const aui = useAui();
  const [adapter] = useState(
    () => new AssistantCloudThreadHistoryAdapter(cloudRef, aui),
  );
  return adapter;
}
