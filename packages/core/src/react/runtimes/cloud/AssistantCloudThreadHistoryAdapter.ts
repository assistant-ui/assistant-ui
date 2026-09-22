import { type RefObject, useEffect, useRef, useState } from "react";
import type {
  GenericThreadHistoryAdapter,
  ThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "../../../adapters/thread-history";
import type { ExportedMessageRepositoryItem } from "../../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../../types";
import {
  type AssistantCloud,
  type AssistantCloudEvent,
  CloudEngagementReporter,
  CloudMessagePersistence,
  CloudRunReporter,
  createFormattedPersistence,
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
import { auiV0DecodeSafely, auiV0Encode } from "./auiV0";
import { type AssistantClient, getClientId, useAui } from "@assistant-ui/store";
import type { ThreadListItemMethods } from "../../../store/scopes/thread-list-item";
import type { FeedbackAdapter } from "../../../adapters/feedback";
import {
  isStoredMessageStatus,
  parseStoredThreadSteps,
} from "../../../runtime/utils/stored-message-parts";
import { runCleanups } from "../../../subscribable/subscribable";

type CloudThreadListItem = Pick<
  ThreadListItemMethods,
  "getState" | "initialize"
>;

const globalPersistence = new WeakMap<
  getClientId.ClientId,
  CloudMessagePersistence
>();

// Ids whose stored aui/v0 entry is already settled, kept per persistence so they share the id mapping's lifetime.
const settledMessageIds = new WeakMap<CloudMessagePersistence, Set<string>>();

const isSettledMessage = (message: ThreadMessage) =>
  message.role === "assistant" &&
  (message.status.type === "complete" || message.status.type === "incomplete");

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  private cloudRef: RefObject<AssistantCloud>;
  private getAui: () => AssistantClient;
  private runReporter: CloudRunReporter;

  constructor(
    cloudRef: RefObject<AssistantCloud>,
    getAui: () => AssistantClient,
  ) {
    this.cloudRef = cloudRef;
    this.getAui = getAui;
    this.runReporter = new CloudRunReporter(() => this.cloudRef.current);
  }

  private get aui(): AssistantClient {
    return this.getAui();
  }

  public getCloud(): AssistantCloud {
    return this.cloudRef.current;
  }

  public ownsThread(threadId: string): boolean {
    const live = this.aui.threadListItem;
    if (!live.source) return false;
    const { id, remoteId } = live.getState();
    return id === threadId || remoteId === threadId;
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
   * an empty remote thread just to attribute an event. A thread the list does
   * not know resolves to nothing, which declines the event.
   */
  public async resolveEngagementEventIds(
    threadId: string,
    messageId?: string,
    options?: { awaitThread?: boolean },
  ): Promise<
    Pick<AssistantCloudEvent, "thread_id" | "message_id"> | undefined
  > {
    const threadListItem = this.getThreadListItem(threadId);
    if (!threadListItem) return undefined;

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
    submit: ({ message, type, comment }) => {
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
          { type, ...(comment ? { comment } : undefined) },
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
    if (current.source) {
      const currentState = current.getState();
      if (currentState.id === threadId || currentState.remoteId === threadId) {
        return current;
      }
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
          message?: ThreadMessage;
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
          mergeRunMessageInfo(
            extractLastRunMessageInfo(items, formatAdapter),
            options?.message
              ? extractRunMessageInfo(options.message, "aui/v0")
              : undefined,
          ),
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
    this._reportSettledRun(remoteId, message, encoded);
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
    this._reportSettledRun(remoteId, message, encoded);
  }

  private get _settledMessageIds(): Set<string> {
    const persistence = this._persistence;
    let ids = settledMessageIds.get(persistence);
    if (!ids) {
      ids = new Set();
      settledMessageIds.set(persistence, ids);
    }
    return ids;
  }

  // A run is reported by the write that first stores its message as settled; rewriting that entry later, as a late tool result does, is not a new run.
  private _reportSettledRun(
    remoteId: string,
    message: ThreadMessage,
    encoded: ReturnType<typeof auiV0Encode>,
  ) {
    if (!isSettledMessage(message)) return;
    const settled = this._settledMessageIds;
    if (settled.has(message.id)) return;
    settled.add(message.id);

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
    // The cloud lists rows newest first, so walking them oldest first puts a
    // parent ahead of its children and a row orphaned by an unreadable parent
    // can be dropped in the same pass; MessageRepository.import throws on a
    // message whose parent is missing.
    const rows = messages
      .filter(
        (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
      )
      .reverse();

    const loaded: ExportedMessageRepositoryItem[] = [];
    const loadedIds = new Set<string>();
    const settled = this._settledMessageIds;
    for (const row of rows) {
      const item = auiV0DecodeSafely(row);
      if (!item) continue;
      if (item.parentId && !loadedIds.has(item.parentId)) continue;
      loadedIds.add(item.message.id);
      if (isSettledMessage(item.message)) settled.add(item.message.id);
      loaded.push(item);
    }

    return { messages: loaded };
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
    const item = threadListItem ?? this.aui.threadListItem;
    const remoteId = item.getState().remoteId;
    if (!remoteId) return;

    const extracted =
      extractRunTelemetry(format, runMessages) ??
      (messageInfo?.status !== undefined
        ? { status: "incomplete" as const }
        : undefined);
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
    data: RunMessageTelemetry,
    durationMs?: number,
    stepTimestamps?: StepTimestamp[],
    messageInfo?: RunMessageInfo,
    persistence = this._persistence,
  ) {
    const mergedSteps = mergeStepTimestamps(data.steps, stepTimestamps);
    const messageId = messageInfo?.localMessageId
      ? persistence.getResolvedRemoteId(messageInfo.localMessageId)
      : undefined;
    void this.runReporter.report({
      threadId: remoteId,
      status: messageInfo?.status ?? data.status,
      outcome: messageInfo?.outcomeType,
      error: messageInfo?.error,
      errorCode: messageInfo?.errorCode,
      messageId,
      traceId: messageInfo?.traceId,
      modelId: data.modelId,
      provider: messageInfo?.provider,
      usage: data.usage,
      steps: mergedSteps,
      totalSteps: data.totalSteps,
      toolCalls: data.toolCalls,
      durationMs,
      firstTokenMs: messageInfo?.firstTokenMs,
      outputText: data.outputText,
      metadata: data.metadata,
    });
  }
}

type StepTimestamp = { start_ms: number; end_ms: number };

function mergeStepTimestamps(
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

type RunMessageInfo = {
  localMessageId?: string;
  status?: "completed" | "incomplete" | "error";
  outcomeType?: RunReportOutcome;
  error?: string;
  errorCode?: string;
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

function mergeRunMessageInfo(
  stored: RunMessageInfo | undefined,
  observed: RunMessageInfo | undefined,
): RunMessageInfo | undefined {
  if (!observed) return stored;
  const { localMessageId: _observedId, ...outcome } = observed;
  return { ...stored, ...outcome };
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

function extractTelemetry<T>(
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

function extractRunTelemetry<T>(
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
  useAssistantCloudEngagementEvents(adapter, aui);
  return adapter;
}

type EngagementTracker = {
  mounted: Map<AssistantCloudThreadHistoryAdapter, AssistantClient>;
  lastMounted: AssistantCloudThreadHistoryAdapter;
  reporter: CloudEngagementReporter;
  host: AssistantClient | undefined;
  dispose: (() => void) | undefined;
};

const engagementTrackers = new WeakMap<
  getClientId.ClientId,
  EngagementTracker
>();

const mountedAdapter = (
  tracker: EngagementTracker,
  threadId?: string,
): AssistantCloudThreadHistoryAdapter => {
  let fallback: AssistantCloudThreadHistoryAdapter | undefined;
  for (const adapter of tracker.mounted.keys()) {
    if (threadId !== undefined && adapter.ownsThread(threadId)) return adapter;
    fallback ??= adapter;
  }
  return fallback ?? tracker.lastMounted;
};

const createEngagementTracker = (
  adapter: AssistantCloudThreadHistoryAdapter,
): EngagementTracker => {
  const tracker: EngagementTracker = {
    mounted: new Map(),
    lastMounted: adapter,
    reporter: new CloudEngagementReporter(
      () => mountedAdapter(tracker).getCloud(),
      (threadId, messageId, options) =>
        mountedAdapter(tracker, threadId).resolveEngagementEventIds(
          threadId,
          messageId,
          options,
        ),
    ),
    host: undefined,
    dispose: undefined,
  };
  return tracker;
};

const subscribeEngagementEvents = (
  aui: AssistantClient,
  reporter: CloudEngagementReporter,
): (() => void) => {
  const reportSuggestions = () => {
    const { mainThreadId } = aui.threads.getState();
    const { isEmpty, suggestions } = aui.thread.getState();
    if (!isEmpty || suggestions.length === 0) return;
    reporter.suggestionsShown(mainThreadId, suggestions.length);
  };

  const unsubscribers = [
    aui.on({ scope: "*", event: "threads.selectionChanged" }, (payload) => {
      reporter.threadSwitched(payload.threadId);
    }),
    aui.on({ scope: "*", event: "composer.send" }, (payload) => {
      if (payload.messageId) {
        reporter.messageEdited(payload.threadId, {
          messageId: payload.messageId,
          chars: payload.chars,
        });
      } else {
        reporter.messageSent(payload.threadId, {
          chars: payload.chars,
          attachments: payload.attachments,
        });
      }
      if (payload.suggestion) {
        reporter.suggestionClicked(payload.threadId);
      }
    }),
    aui.on({ scope: "*", event: "composer.attachmentAdd" }, (payload) => {
      reporter.attachmentAdded(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.attachmentAddError" }, (payload) => {
      reporter.attachmentFailed(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.cancel" }, (payload) => {
      reporter.runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runStart" }, (payload) => {
      reporter.runStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runEnd" }, (payload) => {
      reporter.runEnded(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.cancelRun" }, (payload) => {
      reporter.runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.voiceStarted" }, (payload) => {
      reporter.voiceStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "message.reload" }, (payload) => {
      reporter.messageRegenerated(payload.threadId, payload.messageId);
    }),
    aui.on({ scope: "*", event: "message.branchSwitched" }, (payload) => {
      reporter.branchSwitched(payload.threadId, payload.messageId);
    }),
    aui.on({ scope: "*", event: "message.copied" }, (payload) => {
      reporter.messageCopied(payload.threadId, payload.messageId);
    }),
    aui.on({ scope: "*", event: "thread.toolApprovalAnswered" }, (payload) => {
      if (payload.approved) {
        reporter.toolApproved(
          payload.threadId,
          payload.messageId,
          payload.toolCallId,
          payload.toolName,
        );
      } else {
        reporter.toolRejected(
          payload.threadId,
          payload.messageId,
          payload.toolCallId,
          payload.toolName,
        );
      }
    }),
    aui.on({ scope: "*", event: "message.speak" }, (payload) => {
      reporter.speechStarted(payload.threadId, payload.messageId);
    }),
    aui.on({ scope: "*", event: "message.error" }, (payload) => {
      reporter.errorShown(payload.threadId, {
        messageId: payload.messageId,
        reason: payload.reason,
      });
    }),
    aui.subscribe(reportSuggestions),
  ];

  reportSuggestions();
  return () => runCleanups(unsubscribers);
};

const installEngagementEvents = (
  tracker: EngagementTracker,
  host: AssistantClient,
) => {
  tracker.host = host;
  tracker.dispose = subscribeEngagementEvents(host, tracker.reporter);
};

const uninstallEngagementEvents = (tracker: EngagementTracker) => {
  const dispose = tracker.dispose;
  tracker.host = undefined;
  tracker.dispose = undefined;
  dispose?.();
};

/**
 * The client delivers an event to every listener once per emission, and a
 * thread runtime, with this adapter inside it, mounts once per visited
 * thread. One subscription set per thread list therefore reports each event
 * once, attributed by the thread id the event carries, and the reporter that
 * keeps run timing per thread lives as long as the list. The subscriptions
 * ride on one mounted thread's client, because a thread's own client stops
 * forwarding state notifications once its runtime unmounts, so they move to
 * another mounted thread when their host leaves.
 */
const useAssistantCloudEngagementEvents = (
  adapter: AssistantCloudThreadHistoryAdapter,
  aui: AssistantClient,
) => {
  useEffect(() => {
    const key = getClientId(aui.threads);
    let tracker = engagementTrackers.get(key);
    if (!tracker) {
      tracker = createEngagementTracker(adapter);
      engagementTrackers.set(key, tracker);
    }
    const active = tracker;
    active.mounted.set(adapter, aui);
    active.lastMounted = adapter;
    if (active.host === undefined) installEngagementEvents(active, aui);
    return () => {
      active.mounted.delete(adapter);
      if (active.host !== aui) return;
      uninstallEngagementEvents(active);
      const next = active.mounted.values().next();
      if (!next.done) installEngagementEvents(active, next.value);
    };
  }, [adapter, aui]);
};
