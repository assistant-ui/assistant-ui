import { RefObject, useState } from "react";
import {
  GenericThreadHistoryAdapter,
  ThreadHistoryAdapter,
} from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import {
  AssistantCloud,
  CloudMessagePersistence,
  createFormattedPersistence,
} from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "../runtime-cores/adapters/thread-history/MessageFormatAdapter";
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
        const encodedContents = items.map((item) => formatAdapter.encode(item));
        adapter._reportBatchTelemetry(
          formatAdapter.format,
          encodedContents,
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

  private _reportBatchTelemetry<T>(
    format: string,
    contents: T[],
    options?: {
      durationMs?: number;
      stepTimestamps?: StepTimestamp[];
    },
  ) {
    if (!this.cloudRef.current.telemetry.enabled) return;

    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return;

    const extracted = extractBatchTelemetry(format, contents);
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
    const initial: Parameters<typeof this.cloudRef.current.runs.report>[0] = {
      thread_id: remoteId,
      status: data.status,
      ...(data.totalSteps != null
        ? { total_steps: data.totalSteps }
        : undefined),
      ...(data.toolCalls ? { tool_calls: data.toolCalls } : undefined),
      ...(mergedSteps ? { steps: mergedSteps } : undefined),
      ...(data.promptTokens != null
        ? { prompt_tokens: data.promptTokens }
        : undefined),
      ...(data.completionTokens != null
        ? { completion_tokens: data.completionTokens }
        : undefined),
      ...(durationMs != null ? { duration_ms: durationMs } : undefined),
      ...(data.outputText != null
        ? { output_text: data.outputText }
        : undefined),
      ...(data.metadata ? { metadata: data.metadata } : undefined),
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
};

function buildToolCall(
  toolName: string,
  toolCallId: string,
  args: unknown,
  result: unknown,
  argsText?: string,
): TelemetryToolCall {
  const call: TelemetryToolCall = {
    tool_name: toolName,
    tool_call_id: toolCallId,
  };
  const toolArgs = argsText ?? safeStringify(args);
  if (toolArgs !== undefined) call.tool_args = toolArgs;
  const toolResult = safeStringify(result);
  if (toolResult !== undefined) call.tool_result = toolResult;
  return call;
}

type TelemetryStepData = {
  prompt_tokens?: number;
  completion_tokens?: number;
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
  promptTokens?: number;
  completionTokens?: number;
  outputText?: string;
  metadata?: Record<string, unknown>;
  steps?: TelemetryStepData[];
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

function extractBatchTelemetry<T>(
  format: string,
  contents: T[],
): TelemetryData | null {
  if (format === "ai-sdk/v6") {
    return extractAiSdkV6Batch(contents);
  }
  for (let i = contents.length - 1; i >= 0; i--) {
    const result = extractTelemetry(format, contents[i]!);
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
      steps?: readonly {
        usage?: { promptTokens?: number; completionTokens?: number };
      }[];
      custom?: Record<string, unknown>;
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
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  if (steps && steps.length > 0) {
    promptTokens = 0;
    completionTokens = 0;
    for (const step of steps) {
      promptTokens += step.usage?.promptTokens ?? 0;
      completionTokens += step.usage?.completionTokens ?? 0;
    }
  }

  const statusType = msg.status?.type;
  const status: TelemetryData["status"] =
    (statusType && AUI_STATUS_MAP[statusType]) || "completed";

  const metadata = msg.metadata?.custom as Record<string, unknown> | undefined;

  const telemetrySteps: TelemetryStepData[] | undefined =
    steps && steps.length > 1
      ? steps.map((s) => ({
          ...(s.usage?.promptTokens != null
            ? { prompt_tokens: s.usage.promptTokens }
            : undefined),
          ...(s.usage?.completionTokens != null
            ? { completion_tokens: s.usage.completionTokens }
            : undefined),
        }))
      : undefined;

  return {
    status,
    ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : undefined),
    ...(steps?.length ? { totalSteps: steps.length } : undefined),
    ...(promptTokens != null ? { promptTokens } : undefined),
    ...(completionTokens != null ? { completionTokens } : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata ? { metadata } : undefined),
    ...(telemetrySteps ? { steps: telemetrySteps } : undefined),
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
  if (p.type === "tool-call") return !!p.toolName;
  return p.type.startsWith("tool-");
}

function partToToolCall(p: AiSdkV6Part): TelemetryToolCall {
  return buildToolCall(
    p.toolName ?? p.type.slice(5),
    p.toolCallId!,
    p.args ?? p.input,
    p.result ?? p.output,
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

function buildAiSdkV6Result(
  textParts: string[],
  toolCalls: TelemetryToolCall[],
  totalSteps: number,
  metadata?: Record<string, unknown>,
  stepsData?: { tool_calls: TelemetryToolCall[] }[],
  usage?: { promptTokens?: number; completionTokens?: number },
): TelemetryData {
  const hasText = textParts.length > 0;
  const outputText = hasText ? truncateStr(textParts.join("")) : undefined;

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
    ...(usage?.promptTokens != null
      ? { promptTokens: usage.promptTokens }
      : undefined),
    ...(usage?.completionTokens != null
      ? { completionTokens: usage.completionTokens }
      : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata ? { metadata } : undefined),
    ...(steps ? { steps } : undefined),
  };
}

type UsageFields = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

function normalizeUsage(
  u: UsageFields,
): { promptTokens: number; completionTokens: number } | undefined {
  const prompt = u.inputTokens ?? u.promptTokens;
  const completion = u.outputTokens ?? u.completionTokens;
  if (prompt == null && completion == null) return undefined;
  return {
    promptTokens: prompt ?? 0,
    completionTokens: completion ?? 0,
  };
}

function extractAiSdkV6Usage(
  metadata?: Record<string, unknown>,
): { promptTokens?: number; completionTokens?: number } | undefined {
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
    let promptTokens = 0;
    let completionTokens = 0;
    let hasAny = false;
    for (const s of steps) {
      if (!s.usage) continue;
      const n = normalizeUsage(s.usage);
      if (n) {
        promptTokens += n.promptTokens;
        completionTokens += n.completionTokens;
        hasAny = true;
      }
    }
    if (hasAny) return { promptTokens, completionTokens };
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

function extractAiSdkV6Batch<T>(contents: T[]): TelemetryData | null {
  const allTextParts: string[] = [];
  const allToolCalls: TelemetryToolCall[] = [];
  const allStepsData: { tool_calls: TelemetryToolCall[] }[] = [];
  let hasAssistant = false;
  let metadata: Record<string, unknown> | undefined;
  let aggregatedUsage:
    | { promptTokens: number; completionTokens: number }
    | undefined;

  for (const content of contents) {
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
      if (!aggregatedUsage)
        aggregatedUsage = { promptTokens: 0, completionTokens: 0 };
      aggregatedUsage.promptTokens += usage.promptTokens ?? 0;
      aggregatedUsage.completionTokens += usage.completionTokens ?? 0;
    }
  }

  if (!hasAssistant) return null;
  return buildAiSdkV6Result(
    allTextParts,
    allToolCalls,
    allStepsData.length,
    metadata,
    allStepsData,
    aggregatedUsage,
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
