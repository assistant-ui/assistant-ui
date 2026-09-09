import { type RefObject, useEffect, useRef, useState } from "react";
import type {
  GenericThreadHistoryAdapter,
  ThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "../../../adapters/thread-history";
import type { ExportedMessageRepositoryItem } from "../../../runtime/utils/message-repository";
import {
  type AssistantCloud,
  type AssistantCloudEvent,
  type AssistantCloudRunReport,
  type AssistantCloudRunReportToolCall,
  CloudMessagePersistence,
  createFormattedPersistence,
  createRunReport,
  createRunTelemetryToolCall,
  deriveRunOutcome,
  extractRunTelemetryModelId,
  normalizeRunTelemetryUsage,
  type RunReportOutcome,
  type RunReportStepInit,
  type RunTelemetryUsage,
  type RunTelemetryUsageInit,
  truncateRunTelemetryText,
} from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import { type AssistantClient, getClientId, useAui } from "@assistant-ui/store";
import type { ThreadListItemMethods } from "../../../store/scopes/thread-list-item";
import type { FeedbackAdapter } from "../../../adapters/feedback";

type CloudThreadListItem = Pick<
  ThreadListItemMethods,
  "getState" | "initialize"
>;

const globalPersistence = new WeakMap<
  getClientId.ClientId,
  CloudMessagePersistence
>();

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  private cloudRef: RefObject<AssistantCloud>;
  private getAui: () => AssistantClient;

  constructor(
    cloudRef: RefObject<AssistantCloud>,
    getAui: () => AssistantClient,
  ) {
    this.cloudRef = cloudRef;
    this.getAui = getAui;
  }

  private get aui(): AssistantClient {
    return this.getAui();
  }

  private getPersistence(
    threadListItem: CloudThreadListItem = this.aui.threadListItem,
  ): CloudMessagePersistence {
    const key = getClientId(threadListItem);
    if (!globalPersistence.has(key)) {
      globalPersistence.set(
        key,
        new CloudMessagePersistence(() => this.cloudRef.current),
      );
    }
    return globalPersistence.get(key)!;
  }

  private get _persistence(): CloudMessagePersistence {
    return this.getPersistence();
  }

  /**
   * A send is the moment the runtime creates the remote thread, so that one
   * event waits for the id; every other event reads the id that already
   * exists, because initializing a thread nobody has written to would create
   * an empty remote thread just to attribute an event.
   */
  public async resolveEngagementEventIds(
    threadId: string,
    messageId?: string,
    options?: { awaitThread?: boolean },
  ): Promise<Pick<AssistantCloudEvent, "thread_id" | "message_id">> {
    const threadListItem = this.getThreadListItem(threadId);
    if (!threadListItem) return {};

    let remoteThreadId = threadListItem.getState().remoteId;
    if (!remoteThreadId && options?.awaitThread) {
      remoteThreadId = await threadListItem
        .initialize()
        .then((result) => result.remoteId)
        .catch(() => undefined);
    }
    const remoteMessageId = messageId
      ? this.getPersistence(threadListItem).getResolvedRemoteId(messageId)
      : undefined;
    return {
      ...(remoteThreadId ? { thread_id: remoteThreadId } : undefined),
      ...(remoteMessageId ? { message_id: remoteMessageId } : undefined),
    };
  }

  public readonly feedback: FeedbackAdapter = {
    submit: ({ message, type }) => {
      void (async () => {
        const threadListItem = this.tryGetKeyedThreadListItem();
        const remoteThreadId = threadListItem?.getState().remoteId;
        if (!threadListItem || !remoteThreadId) {
          console.warn(
            `[assistant-ui] Skipping feedback for message ${message.id}: the thread has no remote id.`,
          );
          return;
        }

        const cloudMessageId = await this.getPersistence(
          threadListItem,
        ).getRemoteId(message.id);
        if (!cloudMessageId) {
          console.warn(
            `[assistant-ui] Skipping feedback for message ${message.id}: no cloud message id is mapped.`,
          );
          return;
        }

        await this.cloudRef.current.threads.messages.feedback(
          remoteThreadId,
          cloudMessageId,
          { type },
        );
      })().catch((error: unknown) => {
        console.error(
          "[assistant-ui] Cloud feedback submission failed:",
          error,
        );
      });
    },
  };

  private tryGetKeyedThreadListItem(): CloudThreadListItem | undefined {
    const live = this.aui.threadListItem;
    if (!live.source) return undefined;
    const id = live.getState().id;
    if (id === undefined) return undefined;
    // A body can resolve before the list's committed items include its
    // thread; the live item is already the per-thread anchor in that window.
    const listed = this.aui.threads
      .getState()
      .threadItems.some((item) => item.id === id || item.remoteId === id);
    return listed ? this.aui.threads.item({ id }) : live;
  }

  private getThreadListItem(threadId: string): CloudThreadListItem | undefined {
    const current = this.aui.threadListItem;
    const currentState = current.getState();
    if (currentState.id === threadId || currentState.remoteId === threadId) {
      return current;
    }

    const listed = this.aui.threads
      .getState()
      .threadItems.find(
        (item) => item.id === threadId || item.remoteId === threadId,
      );
    return listed ? this.aui.threads.item({ id: listed.id }) : undefined;
  }

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const adapter = this;
    let threadListItem: CloudThreadListItem | undefined;
    const pinCurrent = () => {
      const next = adapter.tryGetKeyedThreadListItem();
      if (next) threadListItem = next;
      return threadListItem;
    };
    const resolvePinned = () => threadListItem ?? pinCurrent();
    const getTargetFormatted = (item: CloudThreadListItem) =>
      createFormattedPersistence(adapter.getPersistence(item), formatAdapter);
    return {
      pin() {
        pinCurrent();
      },
      async append(item: MessageFormatItem<TMessage>) {
        const pinned = resolvePinned();
        if (!pinned) {
          throw new Error(
            "Cannot persist cloud history without a thread list item.",
          );
        }
        const remoteId =
          pinned.getState().remoteId ?? (await pinned.initialize()).remoteId;
        await getTargetFormatted(pinned).append(remoteId, item);
      },
      async update(item: MessageFormatItem<TMessage>, localMessageId: string) {
        const pinned = resolvePinned();
        const remoteId = pinned?.getState().remoteId;
        if (!remoteId || !pinned) return;
        await getTargetFormatted(pinned).update?.(
          remoteId,
          item,
          localMessageId,
        );
      },
      async delete() {
        throw new Error(
          "Assistant Cloud does not support deleting thread messages yet.",
        );
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
          resolvePinned(),
          extractLastRunMessageInfo(items, formatAdapter),
        );
      },
      async load(): Promise<MessageFormatRepository<TMessage>> {
        // Loads re-pin and resolve through the pinned item, so the id mapping
        // they populate lives on the same persistence instance later writes
        // resolve, whichever of the list item or the live graft won the pin.
        const pinned = pinCurrent();
        const live = adapter.aui.threadListItem;
        const remoteId = live.source ? live.getState().remoteId : undefined;
        if (!remoteId) return { messages: [] };
        return getTargetFormatted(pinned ?? live).load(remoteId);
      },
    };
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.aui.threadListItem.initialize();
    const encoded = auiV0Encode(message);
    await this._persistence.append(
      remoteId,
      message.id,
      parentId,
      "aui/v0",
      encoded,
    );

    if (this.cloudRef.current.telemetry.enabled) {
      this._maybeReportRun(
        remoteId,
        "aui/v0",
        encoded,
        extractRunMessageInfo(message, "aui/v0"),
      );
    }
  }

  async update(item: ExportedMessageRepositoryItem) {
    if (!this._persistence.isPersisted(item.message.id)) {
      return this.append(item);
    }
    const { message } = item;
    const remoteId = this.aui.threadListItem.getState().remoteId;
    if (!remoteId) return;
    const encoded = auiV0Encode(message);
    await this._persistence.update(remoteId, message.id, "aui/v0", encoded);

    if (this.cloudRef.current.telemetry.enabled) {
      this._maybeReportRun(
        remoteId,
        "aui/v0",
        encoded,
        extractRunMessageInfo(message, "aui/v0"),
      );
    }
  }

  async delete() {
    throw new Error(
      "Assistant Cloud does not support deleting thread messages yet.",
    );
  }

  async load() {
    const remoteId = this.aui.threadListItem.getState().remoteId;
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
    threadListItem?: CloudThreadListItem,
    messageInfo?: RunMessageInfo,
  ) {
    if (!this.cloudRef.current.telemetry.enabled) return;

    const item = threadListItem ?? this.aui.threadListItem;
    const remoteId = item.getState().remoteId;
    if (!remoteId) return;

    const extracted = extractRunTelemetry(format, runMessages);
    if (!extracted) return;

    this._sendReport(
      remoteId,
      extracted,
      options?.durationMs,
      options?.stepTimestamps,
      messageInfo,
      this.getPersistence(item),
    );
  }

  private _maybeReportRun<T>(
    remoteId: string,
    format: string,
    content: T,
    messageInfo?: RunMessageInfo,
  ) {
    const extracted = extractTelemetry(format, content);
    if (!extracted) return;

    this._sendReport(remoteId, extracted, undefined, undefined, messageInfo);
  }

  private _sendReport(
    remoteId: string,
    data: TelemetryData,
    durationMs?: number,
    stepTimestamps?: StepTimestamp[],
    messageInfo?: RunMessageInfo,
    persistence = this._persistence,
  ) {
    const mergedSteps = mergeStepTimestamps(data.steps, stepTimestamps);
    const messageId = messageInfo?.localMessageId
      ? persistence.getResolvedRemoteId(messageInfo.localMessageId)
      : undefined;
    const initial = createRunReport({
      threadId: remoteId,
      status: data.status,
      outcome: messageInfo?.outcomeType,
      messageId,
      traceId: messageInfo?.traceId,
      modelId: data.modelId,
      provider: messageInfo?.provider,
      usage: {
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        reasoningTokens: data.reasoningTokens,
        cachedInputTokens: data.cachedInputTokens,
      },
      steps: toRunReportSteps(mergedSteps, data.totalSteps),
      toolCalls: data.toolCalls,
      durationMs,
      firstTokenMs: messageInfo?.firstTokenMs,
      outputText: data.outputText,
      metadata: data.metadata,
      telemetry: this.cloudRef.current.telemetry,
    });

    const { beforeReport } = this.cloudRef.current.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.cloudRef.current.runs.report(report).catch(() => {});
  }
}

type TelemetryStepData = {
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  tool_calls?: AssistantCloudRunReportToolCall[];
  start_ms?: number;
  end_ms?: number;
};

type StepTimestamp = { start_ms: number; end_ms: number };

function toRunReportSteps(
  steps: TelemetryStepData[] | undefined,
  totalSteps: number | undefined,
): RunReportStepInit[] | undefined {
  const source =
    steps ??
    (totalSteps === undefined
      ? undefined
      : Array.from(
          { length: totalSteps },
          (): NonNullable<AssistantCloudRunReport["steps"]>[number] => ({}),
        ));
  return source?.map((step) => ({
    usage: {
      inputTokens: step.input_tokens,
      outputTokens: step.output_tokens,
      reasoningTokens: step.reasoning_tokens,
      cachedInputTokens: step.cached_input_tokens,
    },
    toolCalls: step.tool_calls,
    startMs: step.start_ms,
    endMs: step.end_ms,
  }));
}

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
  toolCalls?: AssistantCloudRunReportToolCall[];
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

type RunMessageInfo = {
  localMessageId?: string;
  outcomeType?: RunReportOutcome;
  firstTokenMs?: number;
  traceId?: string;
  provider?: string;
};

function extractLastRunMessageInfo<
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

function extractRunMessageInfo(
  message: unknown,
  format: string,
  localMessageId?: string,
): RunMessageInfo | undefined {
  if (!isRecord(message) || message.role !== "assistant") return undefined;

  const status = isRecord(message.status) ? message.status : undefined;
  const metadata = isRecord(message.metadata) ? message.metadata : undefined;
  const custom = isRecord(metadata?.custom) ? metadata.custom : undefined;
  const timing = isRecord(metadata?.timing) ? metadata.timing : undefined;
  const streamStartTime = timing?.streamStartTime;
  const firstTokenTime = timing?.firstTokenTime;
  const firstTokenMs =
    typeof streamStartTime === "number" &&
    Number.isFinite(streamStartTime) &&
    typeof firstTokenTime === "number" &&
    Number.isFinite(firstTokenTime)
      ? Math.round(firstTokenTime - streamStartTime)
      : undefined;
  const finishReason =
    status?.type === "incomplete"
      ? status.reason
      : typeof metadata?.finishReason === "string"
        ? metadata.finishReason
        : undefined;
  const outcomeType = deriveRunOutcome({
    finishReason: typeof finishReason === "string" ? finishReason : undefined,
    isError: status?.type === "error",
  }).outcome;
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
    ...(outcomeType ? { outcomeType } : undefined),
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

export function extractAuiV0<T>(content: T): TelemetryData | null {
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
      steps?: readonly { usage?: RunTelemetryUsageInit }[];
      custom?: Record<string, unknown> & { modelId?: string };
    };
  };

  if (msg.role !== "assistant") return null;
  // A paused (requires-action) write is not a finished run; reporting it would
  // mislabel it "completed" and double-count steps once the terminal write reports.
  if (msg.status?.type === "requires-action") return null;

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

  const statusType = msg.status?.type;
  const status: TelemetryData["status"] =
    (statusType && AUI_STATUS_MAP[statusType]) || "completed";

  const metadata = msg.metadata?.custom as Record<string, unknown> | undefined;
  const modelId = extractRunTelemetryModelId(
    msg.metadata as Record<string, unknown> | undefined,
  );

  const telemetrySteps: TelemetryStepData[] | undefined =
    steps && steps.length > 1
      ? steps.map((s) => {
          const usage = s.usage
            ? normalizeRunTelemetryUsage(s.usage)
            : undefined;
          return {
            ...(usage?.inputTokens != null
              ? { input_tokens: usage.inputTokens }
              : undefined),
            ...(usage?.outputTokens != null
              ? { output_tokens: usage.outputTokens }
              : undefined),
            ...(usage?.reasoningTokens != null
              ? { reasoning_tokens: usage.reasoningTokens }
              : undefined),
            ...(usage?.cachedInputTokens != null
              ? { cached_input_tokens: usage.cachedInputTokens }
              : undefined),
          };
        })
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

function partToToolCall(p: AiSdkV6Part): AssistantCloudRunReportToolCall {
  const toolSource: "mcp" | "frontend" = isDynamicToolPart(p)
    ? "mcp"
    : "frontend";
  return createRunTelemetryToolCall({
    toolName: p.toolName ?? p.type.slice(5),
    toolCallId: p.toolCallId!,
    args: p.args ?? p.input,
    result: p.result ?? p.output,
    toolSource,
  });
}

function collectAiSdkV6Parts(parts: readonly AiSdkV6Part[]): {
  textParts: string[];
  toolCalls: AssistantCloudRunReportToolCall[];
  stepsData: { tool_calls: AssistantCloudRunReportToolCall[] }[];
} {
  const textParts: string[] = [];
  const toolCalls: AssistantCloudRunReportToolCall[] = [];
  const stepsData: { tool_calls: AssistantCloudRunReportToolCall[] }[] = [];
  let currentStepToolCalls: AssistantCloudRunReportToolCall[] | null = null;

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
  toolCalls: AssistantCloudRunReportToolCall[],
  totalSteps: number,
  metadata?: Record<string, unknown>,
  stepsData?: { tool_calls: AssistantCloudRunReportToolCall[] }[],
  usage?: RunTelemetryUsage,
): TelemetryData {
  const hasText = textParts.length > 0;
  const outputText = hasText
    ? truncateRunTelemetryText(textParts.join(""))
    : undefined;
  const modelId = extractRunTelemetryModelId(metadata);

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

function extractAiSdkV6Usage(
  metadata?: Record<string, unknown>,
): RunTelemetryUsage | undefined {
  // Try top-level metadata.usage
  const usage = metadata?.usage as RunTelemetryUsageInit | undefined;
  if (usage) {
    const normalized = normalizeRunTelemetryUsage(usage);
    if (normalized) return normalized;
  }

  // Try aggregating from metadata.steps[].usage
  const steps = metadata?.steps as
    | readonly { usage?: RunTelemetryUsageInit }[]
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
      const n = normalizeRunTelemetryUsage(s.usage);
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
  const allToolCalls: AssistantCloudRunReportToolCall[] = [];
  const allStepsData: { tool_calls: AssistantCloudRunReportToolCall[] }[] = [];
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
): ThreadHistoryAdapter & { readonly feedback: FeedbackAdapter } {
  const aui = useAui();
  // Not useEffectEvent: history adapter methods run during render (SSR load).
  const auiRef = useRef(aui);
  useEffect(() => {
    auiRef.current = aui;
  });
  const [adapter] = useState(
    () =>
      new AssistantCloudThreadHistoryAdapter(cloudRef, () => auiRef.current),
  );
  useAssistantCloudEngagementEvents(cloudRef, adapter, aui);
  return adapter;
}

type RootEngagementTracker = {
  count: number;
  adapter: AssistantCloudThreadHistoryAdapter;
  dispose: () => void;
};

const rootEngagementTrackers = new WeakMap<
  AssistantCloud,
  RootEngagementTracker
>();

/**
 * Thread switches are a thread list event, so one subscription per cloud
 * instance reports them; every mounted thread runtime shares it and the last
 * one to unmount removes it.
 */
const useRootEngagementEvents = (
  cloudRef: RefObject<AssistantCloud>,
  adapter: AssistantCloudThreadHistoryAdapter,
  aui: AssistantClient,
) => {
  useEffect(() => {
    const cloud = cloudRef.current;
    let tracker = rootEngagementTrackers.get(cloud);
    if (!tracker) {
      const created: RootEngagementTracker = {
        count: 0,
        adapter,
        dispose: () => {},
      };
      created.dispose = aui.on(
        { scope: "*", event: "threads.selectionChanged" },
        (payload) => {
          void created.adapter
            .resolveEngagementEventIds(payload.threadId)
            .then((ids) => {
              if (!ids.thread_id) return;
              cloud.events?.track({ kind: "thread_switched", ...ids });
            });
        },
      );
      rootEngagementTrackers.set(cloud, created);
      tracker = created;
    }
    const active = tracker;
    active.adapter = adapter;
    active.count += 1;
    return () => {
      active.count -= 1;
      if (active.count === 0) {
        active.dispose();
        rootEngagementTrackers.delete(cloud);
      }
    };
  }, [adapter, aui, cloudRef]);
};

const useAssistantCloudEngagementEvents = (
  cloudRef: RefObject<AssistantCloud>,
  adapter: AssistantCloudThreadHistoryAdapter,
  aui: AssistantClient,
) => {
  useRootEngagementEvents(cloudRef, adapter, aui);
  const runStartedAt = useRef(new Map<string, number>());
  const runEndedAt = useRef(new Map<string, number>());
  const shownSuggestions = useRef(new Set<string>());

  useEffect(() => {
    const track = (
      event: AssistantCloudEvent,
      threadId: string,
      messageId?: string,
      options?: { awaitThread?: boolean },
    ) => {
      void adapter
        .resolveEngagementEventIds(threadId, messageId, options)
        .then((ids) => {
          cloudRef.current.events?.track({ ...event, ...ids });
        });
    };
    const trackRunStopped = (threadId: string) => {
      const startedAt = runStartedAt.current.get(threadId);
      if (startedAt === undefined) return;
      runStartedAt.current.delete(threadId);
      track(
        { kind: "run_stopped", value: Math.max(0, Date.now() - startedAt) },
        threadId,
      );
    };

    const unsubscribers = [
      aui.on({ scope: "thread", event: "composer.send" }, (payload) => {
        const previousRunEndedAt = runEndedAt.current.get(payload.threadId);
        track(
          {
            kind: payload.messageId ? "message_edited" : "message_sent",
            ...(payload.messageId
              ? { props: { chars: payload.chars } }
              : {
                  props: {
                    chars: payload.chars,
                    attachments: payload.attachments,
                  },
                }),
            ...(!payload.messageId && previousRunEndedAt !== undefined
              ? { value: Math.max(0, Date.now() - previousRunEndedAt) }
              : undefined),
          },
          payload.threadId,
          payload.messageId,
          { awaitThread: !payload.messageId },
        );
        if (payload.suggestion) {
          track({ kind: "suggestion_clicked" }, payload.threadId);
        }
      }),
      aui.on(
        { scope: "thread", event: "composer.attachmentAdd" },
        (payload) => {
          track(
            {
              kind: "attachment_added",
              ...(payload.contentType
                ? { props: { type: payload.contentType } }
                : undefined),
            },
            payload.threadId,
            payload.messageId,
          );
        },
      ),
      aui.on(
        { scope: "thread", event: "composer.attachmentAddError" },
        (payload) => {
          track(
            {
              kind: "attachment_failed",
              ...(payload.contentType
                ? { props: { type: payload.contentType } }
                : undefined),
            },
            payload.threadId,
            payload.messageId,
          );
        },
      ),
      aui.on({ scope: "thread", event: "composer.cancel" }, (payload) => {
        trackRunStopped(payload.threadId);
      }),
      aui.on({ scope: "thread", event: "thread.runStart" }, (payload) => {
        runStartedAt.current.set(payload.threadId, Date.now());
      }),
      aui.on({ scope: "thread", event: "thread.runEnd" }, (payload) => {
        runStartedAt.current.delete(payload.threadId);
        runEndedAt.current.set(payload.threadId, Date.now());
      }),
      aui.on({ scope: "thread", event: "thread.cancelRun" }, (payload) => {
        trackRunStopped(payload.threadId);
      }),
      aui.on({ scope: "thread", event: "thread.voiceStarted" }, (payload) => {
        track({ kind: "voice_started" }, payload.threadId);
      }),
      aui.on({ scope: "thread", event: "message.reload" }, (payload) => {
        track(
          { kind: "message_regenerated" },
          payload.threadId,
          payload.messageId,
        );
      }),
      aui.on(
        { scope: "thread", event: "message.branchSwitched" },
        (payload) => {
          track(
            { kind: "branch_switched" },
            payload.threadId,
            payload.messageId,
          );
        },
      ),
      aui.on({ scope: "thread", event: "message.copied" }, (payload) => {
        track({ kind: "message_copied" }, payload.threadId, payload.messageId);
      }),
      aui.on({ scope: "thread", event: "message.speak" }, (payload) => {
        track({ kind: "speech_started" }, payload.threadId, payload.messageId);
      }),
      aui.on({ scope: "thread", event: "message.error" }, (payload) => {
        track(
          { kind: "error_shown", props: { reason: payload.reason } },
          payload.threadId,
          payload.messageId,
        );
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [adapter, aui, cloudRef]);

  useEffect(() => {
    const reportSuggestions = () => {
      const { mainThreadId } = aui.threads.getState();
      if (aui.threadListItem.getState().id !== mainThreadId) return;
      const { isEmpty, suggestions } = aui.thread.getState();
      if (
        !isEmpty ||
        suggestions.length === 0 ||
        shownSuggestions.current.has(mainThreadId)
      ) {
        return;
      }
      shownSuggestions.current.add(mainThreadId);
      void adapter.resolveEngagementEventIds(mainThreadId).then((ids) => {
        cloudRef.current.events?.track({
          kind: "suggestions_shown",
          value: suggestions.length,
          ...ids,
        });
      });
    };

    reportSuggestions();
    return aui.subscribe(reportSuggestions);
  }, [adapter, aui, cloudRef]);
};
