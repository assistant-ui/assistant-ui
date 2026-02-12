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
          stepTimestamps?: { start_ms: number; end_ms: number }[];
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
      stepTimestamps?: { start_ms: number; end_ms: number }[];
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
    stepTimestamps?: { start_ms: number; end_ms: number }[],
  ) {
    const {
      toolCalls,
      promptTokens,
      completionTokens,
      status,
      totalSteps,
      outputText,
      metadata,
      steps,
    } = data;

    // Merge per-step timing into steps data when available
    let finalSteps = steps;
    if (stepTimestamps) {
      if (finalSteps) {
        // Only apply timestamps where both arrays have entries
        const len = Math.min(finalSteps.length, stepTimestamps.length);
        finalSteps = finalSteps.map((s, i) => ({
          ...s,
          ...(i < len ? stepTimestamps[i] : undefined),
        }));
      } else {
        finalSteps = stepTimestamps.map((t) => ({ ...t }));
      }
    }

    const initial: Parameters<typeof this.cloudRef.current.runs.report>[0] = {
      thread_id: remoteId,
      status,
      ...(totalSteps != null ? { total_steps: totalSteps } : undefined),
      ...(toolCalls?.length ? { tool_calls: toolCalls } : undefined),
      ...(finalSteps?.length ? { steps: finalSteps } : undefined),
      ...(promptTokens != null ? { prompt_tokens: promptTokens } : undefined),
      ...(completionTokens != null
        ? { completion_tokens: completionTokens }
        : undefined),
      ...(durationMs != null ? { duration_ms: durationMs } : undefined),
      ...(outputText != null ? { output_text: outputText } : undefined),
      ...(metadata != null ? { metadata } : undefined),
    };

    const { beforeReport } = this.cloudRef.current.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.cloudRef.current.runs.report(report).catch(() => {});
  }
}

const MAX_SPAN_CONTENT = 50_000;

function truncateStr(value: string): string {
  return value.length > MAX_SPAN_CONTENT
    ? value.slice(0, MAX_SPAN_CONTENT)
    : value;
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
  const tc: TelemetryToolCall = {
    tool_name: toolName,
    tool_call_id: toolCallId,
  };
  const a = argsText ?? safeStringify(args);
  if (a !== undefined) tc.tool_args = a;
  const r = safeStringify(result);
  if (r !== undefined) tc.tool_result = r;
  return tc;
}

type TelemetryStepData = {
  prompt_tokens?: number;
  completion_tokens?: number;
  tool_calls?: TelemetryToolCall[];
  start_ms?: number;
  end_ms?: number;
};

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
  if (format === "aui/v0") {
    return extractAuiV0(content);
  }
  if (format === "ai-sdk/v6") {
    return extractAiSdkV6(content);
  }
  return null;
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

  const toolCalls: TelemetryToolCall[] | undefined = msg.content
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
  let status: TelemetryData["status"] = "completed";
  if (statusType === "error") status = "error";
  else if (statusType === "incomplete") status = "incomplete";

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
    ...(toolCalls?.length ? { toolCalls } : undefined),
    ...(steps?.length ? { totalSteps: steps.length } : undefined),
    ...(promptTokens != null ? { promptTokens } : undefined),
    ...(completionTokens != null ? { completionTokens } : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata != null ? { metadata } : undefined),
    ...(telemetrySteps != null ? { steps: telemetrySteps } : undefined),
  };
}

type AiSdkV6Part = {
  type: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
};

type AiSdkV6Message = {
  role?: string;
  parts?: readonly AiSdkV6Part[];
  metadata?: Record<string, unknown>;
};

function isToolCallPart(p: AiSdkV6Part): boolean {
  if (!p.toolCallId) return false;
  return p.type === "tool-call" ? !!p.toolName : p.type.startsWith("tool-");
}

function partToToolCall(p: AiSdkV6Part): TelemetryToolCall {
  return buildToolCall(
    p.toolName ?? p.type.slice(5),
    p.toolCallId!,
    p.args,
    p.result,
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
          ...(s.tool_calls.length ? { tool_calls: s.tool_calls } : undefined),
        }))
      : undefined;

  return {
    status: hasText ? "completed" : "incomplete",
    ...(toolCalls.length ? { toolCalls } : undefined),
    ...(totalSteps > 0 ? { totalSteps } : undefined),
    ...(usage?.promptTokens != null
      ? { promptTokens: usage.promptTokens }
      : undefined),
    ...(usage?.completionTokens != null
      ? { completionTokens: usage.completionTokens }
      : undefined),
    ...(outputText != null ? { outputText } : undefined),
    ...(metadata != null ? { metadata } : undefined),
    ...(steps != null ? { steps } : undefined),
  };
}

function extractAiSdkV6Usage(
  metadata?: Record<string, unknown>,
): { promptTokens?: number; completionTokens?: number } | undefined {
  // Try top-level metadata.usage
  const usage = metadata?.usage as
    | { promptTokens?: number; completionTokens?: number }
    | undefined;
  if (usage?.promptTokens != null || usage?.completionTokens != null) {
    return usage;
  }

  // Try aggregating from metadata.steps[].usage
  const steps = metadata?.steps as
    | readonly {
        usage?: { promptTokens?: number; completionTokens?: number };
      }[]
    | undefined;
  if (steps && steps.length > 0) {
    let promptTokens = 0;
    let completionTokens = 0;
    let hasAny = false;
    for (const s of steps) {
      if (s.usage?.promptTokens != null) {
        promptTokens += s.usage.promptTokens;
        hasAny = true;
      }
      if (s.usage?.completionTokens != null) {
        completionTokens += s.usage.completionTokens;
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
