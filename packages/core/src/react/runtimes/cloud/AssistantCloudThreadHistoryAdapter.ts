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
import type { Unstable_ToolInteractionLog } from "../../../types/message";
import {
  appendToolInteraction,
  readToolInteractionLog,
} from "../../../runtime/utils/tool-interactions";
import { isJSONValueEqual } from "../../../utils/json/is-json-equal";
import {
  type AssistantCloud,
  type AssistantCloudEvent,
  CloudAPIError,
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
import {
  type KeyedThreadListItem as CloudThreadListItem,
  tryGetKeyedThreadListItem,
} from "../keyedThreadListItem";
import type { FeedbackAdapter } from "../../../adapters/feedback";
import {
  isStoredMessageStatus,
  parseStoredThreadSteps,
} from "../../../runtime/utils/stored-message-parts";
import { runCleanups } from "../../../subscribable/subscribable";

type ScopedPersistence = {
  cloudRef: { current: RefObject<AssistantCloud> };
  persistence: CloudMessagePersistence;
  scope: unknown;
};

type CloudScopeSnapshot = {
  cloud: AssistantCloud;
  scope: unknown;
};

type CloudScopeContext = CloudScopeSnapshot & {
  persistence: CloudMessagePersistence;
};

const globalPersistence = new WeakMap<
  getClientId.ClientId,
  ScopedPersistence
>();

export const DEFAULT_CLOUD_SCOPE = Symbol("assistant-ui:cloud-default-scope");

// Kept per persistence so they share the id mapping's lifetime: ids whose stored aui/v0 entry is settled, and ids whose run a write has reported.
const runLedgers = new WeakMap<
  CloudMessagePersistence,
  { settled: Set<string>; reported: Set<string> }
>();

const runLedgerOf = (persistence: CloudMessagePersistence) => {
  let ledger = runLedgers.get(persistence);
  if (!ledger) {
    ledger = { settled: new Set<string>(), reported: new Set<string>() };
    runLedgers.set(persistence, ledger);
  }
  return ledger;
};

const isSettledMessage = (message: ThreadMessage) =>
  message.role === "assistant" &&
  (message.status.type === "complete" || message.status.type === "incomplete");

const mergeInteractionLogs = (
  stored: Unstable_ToolInteractionLog | undefined,
  current: Unstable_ToolInteractionLog | undefined,
): Unstable_ToolInteractionLog | undefined => {
  const incoming = readToolInteractionLog(current);
  if (!stored) return incoming;
  if (!incoming) return stored;
  const omitted = Math.max(stored.omitted ?? 0, incoming.omitted ?? 0);
  let merged: Unstable_ToolInteractionLog = {
    entries: stored.entries,
    ...(omitted ? { omitted } : undefined),
  };
  for (const entry of incoming.entries) {
    if (
      merged.entries.some(
        (existing) =>
          existing.type === entry.type &&
          existing.occurredAt === entry.occurredAt &&
          isJSONValueEqual(existing.payload, entry.payload),
      )
    ) {
      continue;
    }
    merged = appendToolInteraction(merged, entry);
  }
  return merged;
};

type CopiedThread = {
  stored: Set<string>;
  refused: Set<string>;
  closed: boolean;
  interactions: Map<string, Unstable_ToolInteractionLog>;
};

const RETRIED_COPY_STATUSES = new Set([401, 403, 408, 429]);
// The thread is gone, or its end user may not write this month.
const THREAD_REFUSAL_STATUSES = new Set([402, 404]);

const isRefusedCopy = (error: unknown): error is CloudAPIError =>
  error instanceof CloudAPIError &&
  error.status >= 400 &&
  error.status < 500 &&
  !RETRIED_COPY_STATUSES.has(error.status);

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  private cloudRef: RefObject<AssistantCloud>;
  private scopeRef: RefObject<unknown>;
  private getAui: () => AssistantClient;
  private runReporterContext:
    | {
        cloud: AssistantCloud;
        scope: unknown;
        reporter: CloudRunReporter;
      }
    | undefined;
  private copiedThreads = new WeakMap<
    CloudMessagePersistence,
    Map<string, Promise<CopiedThread>>
  >();
  private copyQueues = new WeakMap<
    CloudMessagePersistence,
    Map<string, Promise<void>>
  >();

  constructor(
    cloudRef: RefObject<AssistantCloud>,
    getAui: () => AssistantClient,
    scopeRef: RefObject<unknown>,
  ) {
    this.cloudRef = cloudRef;
    this.scopeRef = scopeRef;
    this.getAui = getAui;
  }

  private get aui(): AssistantClient {
    return this.getAui();
  }

  private captureScopeSnapshot(): CloudScopeSnapshot {
    return {
      cloud: this.cloudRef.current,
      scope: this.scopeRef.current,
    };
  }

  public getCloud(): AssistantCloud {
    return this.cloudRef.current;
  }

  public getScope(): unknown {
    return this.scopeRef.current;
  }

  public ownsThread(threadId: string): boolean {
    const live = this.aui.threadListItem;
    if (!live.source) return false;
    const { id, remoteId } = live.getState();
    return id === threadId || remoteId === threadId;
  }

  private isCurrentScope({ scope }: CloudScopeSnapshot): boolean {
    return Object.is(this.scopeRef.current, scope);
  }

  private assertCurrentScope(snapshot: CloudScopeSnapshot): void {
    if (!this.isCurrentScope(snapshot)) {
      throw new Error("Cloud scope changed during the persistence operation");
    }
  }

  private captureScope(
    threadListItem: CloudThreadListItem = this.aui.threadListItem,
  ): CloudScopeContext {
    const snapshot = this.captureScopeSnapshot();
    return {
      ...snapshot,
      persistence: this.getPersistence(threadListItem, snapshot),
    };
  }

  private getPersistence(
    threadListItem: CloudThreadListItem = this.aui.threadListItem,
    snapshot = this.captureScopeSnapshot(),
  ): CloudMessagePersistence {
    const key = getClientId(threadListItem);
    let entry = globalPersistence.get(key);
    if (!entry || !Object.is(entry.scope, snapshot.scope)) {
      const cloudRef = { current: this.cloudRef };
      entry = {
        cloudRef,
        scope: snapshot.scope,
        persistence: new CloudMessagePersistence(
          () => cloudRef.current.current,
        ),
      };
      globalPersistence.set(key, entry);
    } else {
      // Thread items can outlive the hook that created their persistence, so a
      // later adapter must reconnect the retained mapping to its live client ref.
      entry.cloudRef.current = this.cloudRef;
    }
    return entry.persistence;
  }

  private async resolveExistingRemoteId(
    threadListItem: CloudThreadListItem,
  ): Promise<string | undefined> {
    if (!threadListItem.getState().remoteId) return undefined;
    return (await threadListItem.initialize()).remoteId;
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
    return this.resolveEngagementEventIdsForScope(
      this.captureScopeSnapshot(),
      threadId,
      messageId,
      options,
    );
  }

  private async resolveEngagementEventIdsForScope(
    snapshot: CloudScopeSnapshot,
    threadId: string,
    messageId?: string,
    options?: { awaitThread?: boolean },
  ): Promise<
    Pick<AssistantCloudEvent, "thread_id" | "message_id"> | undefined
  > {
    this.assertCurrentScope(snapshot);
    const threadListItem = this.getThreadListItem(threadId);
    if (!threadListItem) return undefined;
    const persistence = this.getPersistence(threadListItem, snapshot);

    let remoteThreadId: string | undefined;
    if (threadListItem.getState().remoteId || options?.awaitThread) {
      remoteThreadId = (await threadListItem.initialize()).remoteId;
    }
    this.assertCurrentScope(snapshot);
    const remoteMessageId = messageId
      ? persistence.getResolvedRemoteId(messageId)
      : undefined;
    return {
      ...(remoteThreadId ? { thread_id: remoteThreadId } : undefined),
      ...(remoteMessageId ? { message_id: remoteMessageId } : undefined),
    };
  }

  public readonly feedback: FeedbackAdapter = {
    submit: ({ message, type, comment }) => {
      void (async () => {
        const threadListItem = tryGetKeyedThreadListItem(this.aui);
        if (!threadListItem || !threadListItem.getState().remoteId) {
          console.warn(
            `[assistant-ui] Skipping feedback for message ${message.id}: the thread has no remote id.`,
          );
          return;
        }

        const context = this.captureScope(threadListItem);
        const remoteThreadId =
          await this.resolveExistingRemoteId(threadListItem);
        this.assertCurrentScope(context);
        if (!remoteThreadId) return;
        const persistence = context.persistence;
        const cloudMessageId = await persistence.getRemoteId(message.id);
        this.assertCurrentScope(context);
        if (!cloudMessageId) {
          console.warn(
            `[assistant-ui] Skipping feedback for message ${message.id}: no cloud message id is mapped.`,
          );
          return;
        }

        await context.cloud.threads.messages.feedback(
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
      const next = tryGetKeyedThreadListItem(adapter.aui);
      if (next) threadListItem = next;
      return threadListItem;
    };
    const resolvePinned = () => threadListItem ?? pinCurrent();
    const getTargetFormatted = (context: CloudScopeContext) =>
      createFormattedPersistence(context.persistence, formatAdapter);
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
        const context = adapter.captureScope(pinned);
        const { remoteId } = await pinned.initialize();
        adapter.assertCurrentScope(context);
        await getTargetFormatted(context).append(remoteId, item);
      },
      async update(item: MessageFormatItem<TMessage>, localMessageId: string) {
        const pinned = resolvePinned();
        if (!pinned || !pinned.getState().remoteId) return;
        const context = adapter.captureScope(pinned);
        const remoteId = await adapter.resolveExistingRemoteId(pinned);
        adapter.assertCurrentScope(context);
        if (!remoteId) return;
        await getTargetFormatted(context).update?.(
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
        if (!live.source || !live.getState().remoteId) return { messages: [] };
        const target = pinned ?? live;
        const context = adapter.captureScope(target);
        const remoteId = await adapter.resolveExistingRemoteId(target);
        adapter.assertCurrentScope(context);
        if (!remoteId) return { messages: [] };
        const repository = await getTargetFormatted(context).load(remoteId);
        adapter.assertCurrentScope(context);
        return repository;
      },
    };
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const threadListItem = this.aui.threadListItem;
    const context = this.captureScope(threadListItem);
    const { remoteId } = await threadListItem.initialize();
    this.assertCurrentScope(context);
    await this._writeMessage(context, remoteId, message, (encoded) =>
      context.persistence.append(
        remoteId,
        message.id,
        parentId,
        "aui/v0",
        encoded,
      ),
    );
  }

  async update(item: ExportedMessageRepositoryItem) {
    const threadListItem = this.aui.threadListItem;
    const context = this.captureScope(threadListItem);
    if (!context.persistence.isPersisted(item.message.id)) {
      return this.append(item);
    }
    const { message } = item;
    const remoteId = await this.resolveExistingRemoteId(threadListItem);
    this.assertCurrentScope(context);
    if (!remoteId) return;
    await this._writeMessage(context, remoteId, message, (encoded) =>
      context.persistence.update(remoteId, message.id, "aui/v0", encoded),
    );
  }

  get unstable_copy() {
    const telemetry = this.cloudRef.current?.telemetry;
    return telemetry?.enabled === false || telemetry?.messages === false
      ? undefined
      : this.copy;
  }

  private copy = async (
    branch: readonly ThreadMessage[],
    messageIds: readonly string[],
  ): Promise<void> => {
    if (messageIds.length === 0) return;

    const threadListItem = tryGetKeyedThreadListItem(this.aui);
    if (!threadListItem) {
      throw new Error("Cannot copy cloud history without a thread list item.");
    }
    const context = this.captureScope(threadListItem);
    const remoteId = (await threadListItem.initialize()).remoteId;
    this.assertCurrentScope(context);
    let queues = this.copyQueues.get(context.persistence);
    if (!queues) {
      queues = new Map();
      this.copyQueues.set(context.persistence, queues);
    }
    const previous = queues.get(remoteId);
    const task = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => this.copyBranch(context, remoteId, branch, messageIds));
    queues.set(remoteId, task);
    try {
      await task;
    } finally {
      if (queues.get(remoteId) === task) {
        queues.delete(remoteId);
      }
    }
  };

  private async copyBranch(
    context: CloudScopeContext,
    remoteId: string,
    branch: readonly ThreadMessage[],
    messageIds: readonly string[],
  ): Promise<void> {
    let inventories = this.copiedThreads.get(context.persistence);
    if (!inventories) {
      inventories = new Map();
      this.copiedThreads.set(context.persistence, inventories);
    }
    let inventory = inventories.get(remoteId);
    if (!inventory) {
      inventory = (async (): Promise<CopiedThread> => {
        const copied: CopiedThread = {
          stored: new Set(),
          refused: new Set(),
          closed: false,
          interactions: new Map(),
        };
        const seen = new Set<string>();
        let after: string | undefined;
        while (true) {
          this.assertCurrentScope(context);
          const page = await context.cloud.threads.messages.list(remoteId, {
            limit: 200,
            ...(after ? { after } : undefined),
          });
          this.assertCurrentScope(context);
          // A cursor the server cannot resolve drops the keyset filter and replays
          // an earlier page, so already-seen rows end the walk instead of repeating.
          const fresh = page.messages.filter((row) => !seen.has(row.id));
          for (const row of fresh) {
            seen.add(row.id);
            if (!row.external_id || row.format !== "aui/v0") continue;
            copied.stored.add(row.external_id);
            context.persistence.record(row.external_id, row.id);
            const decoded = auiV0DecodeSafely(
              row as typeof row & { format: "aui/v0" },
            );
            for (const part of decoded?.message.content ?? []) {
              if (part.type !== "tool-call") continue;
              const merged = mergeInteractionLogs(
                copied.interactions.get(part.toolCallId),
                part.unstable_interactions,
              );
              if (merged) copied.interactions.set(part.toolCallId, merged);
            }
          }
          const last = page.messages.at(-1);
          if (fresh.length === 0 || page.messages.length < 200 || !last) break;
          after = last.id;
        }
        return copied;
      })();
      inventories.set(remoteId, inventory);
    }

    let copied: CopiedThread;
    try {
      copied = await inventory;
    } catch (error) {
      if (inventories.get(remoteId) === inventory) {
        inventories.delete(remoteId);
      }
      throw error;
    }
    if (copied.closed) return;

    const eligible = branch.filter(
      (message) => message.id.length > 0 && message.id.length <= 255,
    );
    const changed = new Set(messageIds);
    let next = 0;
    let parent: string | undefined;
    for (let index = 0; index < eligible.length; index++) {
      if (!changed.has(eligible[index]!.id)) continue;
      for (; next <= index; next++) {
        const message = eligible[next]!;
        if (
          next !== index &&
          (copied.stored.has(message.id) || copied.refused.has(message.id))
        ) {
          if (copied.stored.has(message.id)) parent = message.id;
          continue;
        }
        const encoded = auiV0Encode(message);
        const content = {
          ...encoded,
          content: encoded.content.map((part) => {
            if (part.type !== "tool-call") return part;
            const interactions = mergeInteractionLogs(
              copied.interactions.get(part.toolCallId),
              part.unstable_interactions,
            );
            return {
              ...part,
              ...(interactions
                ? { unstable_interactions: interactions }
                : undefined),
            };
          }),
        };
        let message_id: string;
        try {
          this.assertCurrentScope(context);
          ({ message_id } = await context.cloud.threads.messages.create(
            remoteId,
            {
              parent_id: null,
              format: "aui/v0",
              content,
              external_id: message.id,
              ...(parent ? { parent_external_id: parent } : undefined),
            },
          ));
          this.assertCurrentScope(context);
        } catch (error) {
          if (!isRefusedCopy(error)) throw error;
          // Two refusals before any accepted message mean the cloud takes none of the thread, as a server without external ids does; one alone may be an oversized first message.
          if (
            THREAD_REFUSAL_STATUSES.has(error.status) ||
            (copied.stored.size === 0 && copied.refused.size > 0)
          ) {
            copied.closed = true;
            console.warn(
              `[assistant-ui] The cloud refused copies to thread ${remoteId}; the dashboard shows the conversation as far as it was copied.`,
              error,
            );
            return;
          }
          copied.refused.add(message.id);
          console.warn(
            `[assistant-ui] The cloud refused the copy of message ${message.id}; the dashboard shows the conversation without it.`,
            error,
          );
          continue;
        }
        copied.stored.add(message.id);
        copied.refused.delete(message.id);
        parent = message.id;
        context.persistence.record(message.id, message_id);
        for (const part of content.content) {
          if (part.type === "tool-call" && part.unstable_interactions) {
            copied.interactions.set(
              part.toolCallId,
              part.unstable_interactions,
            );
          }
        }
      }
    }
  }

  // A run is reported once, by the write that first stores its message as settled; rewriting that entry later, as a late tool result does, is not a new run. Eligibility is read before the write, so a load that reads the write back cannot take the report, and the report is claimed after it, so overlapping writes of one message report once.
  private async _writeMessage(
    context: CloudScopeContext,
    remoteId: string,
    message: ThreadMessage,
    write: (encoded: ReturnType<typeof auiV0Encode>) => Promise<void>,
  ) {
    const encoded = auiV0Encode(message);
    const ledger = runLedgerOf(context.persistence);
    const firstSettle =
      isSettledMessage(message) && !ledger.settled.has(message.id);
    this.assertCurrentScope(context);
    await write(encoded);
    if (!firstSettle) return;
    ledger.settled.add(message.id);
    if (ledger.reported.has(message.id)) return;

    if (!context.cloud.telemetry.enabled) return;
    const extracted = extractTelemetry("aui/v0", encoded);
    if (!extracted) return;
    ledger.reported.add(message.id);
    this._sendReport(
      remoteId,
      extracted,
      undefined,
      undefined,
      extractRunMessageInfo(message, "aui/v0"),
      context,
    );
  }

  async delete() {
    throw new Error(
      "Assistant Cloud does not support deleting thread messages yet.",
    );
  }

  async load() {
    const threadListItem = this.aui.threadListItem;
    const context = this.captureScope(threadListItem);
    const remoteId = await this.resolveExistingRemoteId(threadListItem);
    this.assertCurrentScope(context);
    if (!remoteId) return { messages: [] };
    const messages = await context.persistence.load(remoteId, "aui/v0");
    this.assertCurrentScope(context);
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
    const { settled } = runLedgerOf(context.persistence);
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
    const context = this.captureScope(item);
    if (!item.getState().remoteId) return;

    const extracted =
      extractRunTelemetry(format, runMessages) ??
      (messageInfo?.status !== undefined
        ? { status: "incomplete" as const }
        : undefined);
    if (!extracted) return;

    void this.resolveExistingRemoteId(item)
      .then((remoteId) => {
        if (!remoteId) return;
        this.assertCurrentScope(context);
        this._sendReport(
          remoteId,
          extracted,
          options?.durationMs,
          options?.stepTimestamps,
          messageInfo,
          context,
        );
      })
      .catch(() => {});
  }

  private _sendReport(
    remoteId: string,
    data: RunMessageTelemetry,
    durationMs?: number,
    stepTimestamps?: StepTimestamp[],
    messageInfo?: RunMessageInfo,
    context = this.captureScope(),
  ) {
    if (!this.isCurrentScope(context)) return;
    const current = this.runReporterContext;
    const reporter =
      current &&
      current.cloud === context.cloud &&
      Object.is(current.scope, context.scope)
        ? current.reporter
        : new CloudRunReporter(context.cloud);
    this.runReporterContext = {
      cloud: context.cloud,
      scope: context.scope,
      reporter,
    };
    const mergedSteps = mergeStepTimestamps(data.steps, stepTimestamps);
    const messageId = messageInfo?.localMessageId
      ? context.persistence.getResolvedRemoteId(messageInfo.localMessageId)
      : undefined;
    void reporter.report({
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

export function useScopedAssistantCloudThreadHistoryAdapter(
  cloudRef: RefObject<AssistantCloud>,
  scopeRef: RefObject<unknown>,
): ThreadHistoryAdapter & { readonly feedback: FeedbackAdapter } {
  const aui = useAui();
  // Not useEffectEvent: history adapter methods run during render (SSR load).
  const auiRef = useRef(aui);
  useEffect(() => {
    auiRef.current = aui;
  });
  const [adapter] = useState(
    () =>
      new AssistantCloudThreadHistoryAdapter(
        cloudRef,
        () => auiRef.current,
        scopeRef,
      ),
  );
  useAssistantCloudEngagementEvents(adapter, aui);
  return adapter;
}

export function useAssistantCloudThreadHistoryAdapter(
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter & { readonly feedback: FeedbackAdapter } {
  const scopeRef = useRef<unknown>(DEFAULT_CLOUD_SCOPE);
  return useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef);
}

type EngagementTracker = {
  mounted: Map<AssistantCloudThreadHistoryAdapter, AssistantClient>;
  lastMounted: AssistantCloudThreadHistoryAdapter;
  reporterScope: unknown;
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
  let tracker!: EngagementTracker;
  tracker = {
    mounted: new Map(),
    lastMounted: adapter,
    reporterScope: adapter.getScope(),
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

const getEngagementReporter = (
  tracker: EngagementTracker,
  threadId?: string,
): CloudEngagementReporter => {
  const adapter = mountedAdapter(tracker, threadId);
  const scope = adapter.getScope();
  if (Object.is(tracker.reporterScope, scope)) return tracker.reporter;

  tracker.reporterScope = scope;
  tracker.reporter = new CloudEngagementReporter(
    () => mountedAdapter(tracker).getCloud(),
    (eventThreadId, messageId, options) =>
      mountedAdapter(tracker, eventThreadId).resolveEngagementEventIds(
        eventThreadId,
        messageId,
        options,
      ),
  );
  return tracker.reporter;
};

const subscribeEngagementEvents = (
  aui: AssistantClient,
  getReporter: (threadId?: string) => CloudEngagementReporter,
): (() => void) => {
  const reportSuggestions = () => {
    const { mainThreadId } = aui.threads.getState();
    const { isEmpty, suggestions } = aui.thread.getState();
    if (!isEmpty || suggestions.length === 0) return;
    getReporter(mainThreadId).suggestionsShown(
      mainThreadId,
      suggestions.length,
    );
  };

  const unsubscribers = [
    aui.on({ scope: "*", event: "threads.selectionChanged" }, (payload) => {
      getReporter(payload.threadId).threadSwitched(payload.threadId);
    }),
    aui.on({ scope: "*", event: "composer.send" }, (payload) => {
      const reporter = getReporter(payload.threadId);
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
      getReporter(payload.threadId).attachmentAdded(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.attachmentAddError" }, (payload) => {
      getReporter(payload.threadId).attachmentFailed(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.cancel" }, (payload) => {
      getReporter(payload.threadId).runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runStart" }, (payload) => {
      getReporter(payload.threadId).runStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runEnd" }, (payload) => {
      getReporter(payload.threadId).runEnded(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.cancelRun" }, (payload) => {
      getReporter(payload.threadId).runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.voiceStarted" }, (payload) => {
      getReporter(payload.threadId).voiceStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "message.reload" }, (payload) => {
      getReporter(payload.threadId).messageRegenerated(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.branchSwitched" }, (payload) => {
      getReporter(payload.threadId).branchSwitched(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.copied" }, (payload) => {
      getReporter(payload.threadId).messageCopied(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "thread.toolApprovalAnswered" }, (payload) => {
      const reporter = getReporter(payload.threadId);
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
      getReporter(payload.threadId).speechStarted(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.error" }, (payload) => {
      getReporter(payload.threadId).errorShown(payload.threadId, {
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
  tracker.dispose = subscribeEngagementEvents(host, (threadId) =>
    getEngagementReporter(tracker, threadId),
  );
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
