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
import { getExternalStoreMessages } from "../../../runtime/utils/external-store-message";
import {
  type AssistantCloud,
  type AssistantCloudEvent,
  type CloudMessage,
  CloudAPIError,
  CloudMessagePersistence,
  type CloudMessageRunPhase,
  CloudRunReporter,
  createFormattedPersistence,
  type RunMessageTelemetry,
} from "assistant-cloud";
import { auiV0DecodeSafely, auiV0Encode } from "./auiV0";
import { useAssistantCloudEngagementEvents } from "./engagementEvents";
import { useCloudRunLeases } from "./runLeases";
import {
  type RunMessageInfo,
  type StepTimestamp,
  extractLastRunMessageInfo,
  extractRunMessageInfo,
  extractRunTelemetry,
  extractTelemetry,
  mergeRunMessageInfo,
  mergeStepTimestamps,
  withPersistenceFailure,
} from "./runTelemetry";
import { type AssistantClient, getClientId, useAui } from "@assistant-ui/store";
import {
  type KeyedThreadListItem as CloudThreadListItem,
  tryGetKeyedThreadListItem,
} from "../keyedThreadListItem";
import type { FeedbackAdapter } from "../../../adapters/feedback";

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

/** The `error.code` of a message whose run lost its heartbeat before it finished. */
const RUN_STALE_ERROR_CODE = "run_stale";
const RUN_STALE_STATUS = {
  type: "incomplete",
  reason: "error",
  error: {
    code: RUN_STALE_ERROR_CODE,
    message: "This response was interrupted before it finished.",
  },
} as const;
/** The `error.code` of a message whose run another tab or session is still writing. */
const RUN_IN_PROGRESS_ERROR_CODE = "run_in_progress";
const runInProgressStatus = (expiresInMs: number | undefined) => ({
  type: "incomplete" as const,
  reason: "error" as const,
  error: {
    code: RUN_IN_PROGRESS_ERROR_CODE,
    message: "Running in another tab…",
    ...(expiresInMs !== undefined ? { expires_in_ms: expiresInMs } : undefined),
  },
});

const runStatusOf = (run: NonNullable<CloudMessage["run"]>) =>
  run.status === "stale"
    ? RUN_STALE_STATUS
    : runInProgressStatus(run.expires_in_ms);

// A formatted runtime resumes a stale message in place, so its continuation row holds the whole message under this external id and stands in for the stale row on load.
const CONTINUATION_PREFIX = "aui-continuation:";

/**
 * Decodes a formatted thread's rows oldest first. A continuation row replaces
 * the stale row it continues (it holds the whole message), and a row with a
 * run carries the status the run implies; stale rows are collected so their
 * resume opens a continuation.
 */
const decodeFormattedRows = <
  TMessage,
  TStorageFormat extends Record<string, unknown>,
>(
  rows: readonly CloudMessage[],
  formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  staleIds: Set<string>,
): MessageFormatItem<TMessage>[] => {
  const ordered = rows
    .filter((row) => row.format === formatAdapter.format)
    .reverse();
  const continued = new Map<string, CloudMessage>();
  for (const row of ordered) {
    const of = row.external_id?.startsWith(CONTINUATION_PREFIX)
      ? row.external_id.slice(CONTINUATION_PREFIX.length)
      : undefined;
    if (of !== undefined && of === row.parent_id) continued.set(of, row);
  }
  const replaced = new Map<string, string | null>();
  const items: MessageFormatItem<TMessage>[] = [];
  for (const row of ordered) {
    if (continued.has(row.id)) {
      replaced.set(
        row.id,
        row.parent_id !== null && replaced.has(row.parent_id)
          ? replaced.get(row.parent_id)!
          : row.parent_id,
      );
      continue;
    }
    const parentId =
      row.parent_id !== null && replaced.has(row.parent_id)
        ? replaced.get(row.parent_id)!
        : row.parent_id;
    const item = formatAdapter.decode({
      id: row.id,
      parent_id: parentId,
      format: row.format,
      content: row.content as TStorageFormat,
    });
    if (row.run) {
      if (row.run.status === "stale")
        staleIds.add(formatAdapter.getId(item.message));
      items.push({ ...item, unstable_status: runStatusOf(row.run) });
    } else {
      items.push(item);
    }
  }
  return items;
};

// A run another session drives is the newest message of its branch, so it sits on the first page.
const RUN_STATE_PAGE_SIZE = 20;

const endPhaseOf = (message: ThreadMessage): CloudMessageRunPhase => {
  const { status } = message;
  if (status?.type !== "incomplete") return "done";
  return status.reason === "cancelled"
    ? "cancelled"
    : status.reason === "error"
      ? "error"
      : "done";
};

const runPhaseOf = (
  message: ThreadMessage,
  persistence: CloudMessagePersistence,
  key: string = message.id,
): CloudMessageRunPhase | undefined => {
  if (message.role !== "assistant") return undefined;
  if (message.status.type === "running") return "running";
  if (!persistence.hasOpenRun(key)) return undefined;
  return endPhaseOf(message);
};

/**
 * How the run tracker stores a thread's running assistant message: as an
 * `aui/v0` row, or through the format a runtime registered with `withFormat`.
 * Keys are the ids the persistence maps, which for a formatted message is the
 * id of its one format-native message.
 */
export type CloudRunWriter = {
  /** The message's persistence key, or undefined when it cannot be stored as one row. */
  keyOf(message: ThreadMessage): string | undefined;
  /** Whether the row can be chained under its parent yet; always, when absent. */
  canStore?(parent: ThreadMessage | undefined): boolean;
  /** Stores the message (appending it on first write), with its run phase read from its status. */
  write(
    message: ThreadMessage,
    parent: ThreadMessage | undefined,
  ): Promise<void>;
  hasOpenRun(key: string): boolean;
  rename(from: string, to: string): Promise<void>;
  /** Records how a settled message ends its run, for a runtime whose own settled write cannot say. */
  noteSettled?(message: ThreadMessage): void;
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

export class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
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
  /** Set once a runtime reads or writes this thread as `aui/v0` rows. */
  public servesThreadMessages = false;
  /** Set once a runtime persists through `withFormat`; the run tracker then writes through it. */
  private formattedRunWriter: CloudRunWriter | undefined;
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
    const reloadListeners = adapter.reloadListeners;
    let threadListItem: CloudThreadListItem | undefined;
    const pinCurrent = () => {
      const next = tryGetKeyedThreadListItem(adapter.aui);
      if (next) threadListItem = next;
      return threadListItem;
    };
    const resolvePinned = () => threadListItem ?? pinCurrent();
    // A resumed message keeps its local id while its writes go to the continuation row, mapped under an alias.
    const aliases = new Map<string, string>();
    const aliasOf = (id: string) => aliases.get(id) ?? id;
    // Messages loaded with a stale run; the first running write of one opens its continuation.
    const staleIds = new Set<string>();
    const aliasedFormat: MessageFormatAdapter<TMessage, TStorageFormat> = {
      ...formatAdapter,
      getId: (message) => aliasOf(formatAdapter.getId(message)),
    };
    const getTargetFormatted = (context: CloudScopeContext) =>
      createFormattedPersistence(context.persistence, aliasedFormat);
    // A run's end reason, noted when the tracker sees its message settle, for the runtime's settled write of the same row.
    const endPhases = new Map<string, CloudMessageRunPhase>();
    const settledPhase = (
      persistence: CloudMessagePersistence,
      key: string,
    ): CloudMessageRunPhase | undefined => {
      if (!persistence.hasOpenRun(key)) return undefined;
      const phase = endPhases.get(key);
      endPhases.delete(key);
      return phase;
    };
    const onlyInner = (message: ThreadMessage): TMessage | undefined => {
      const inner = getExternalStoreMessages<TMessage>(message);
      return inner.length === 1 ? inner[0] : undefined;
    };
    const innerParentKey = (
      parent: ThreadMessage | undefined,
    ): string | null | undefined => {
      if (!parent) return null;
      const last = getExternalStoreMessages<TMessage>(parent).at(-1);
      return last === undefined ? undefined : formatAdapter.getId(last);
    };
    const pinnedPersistence = () => {
      const pinned = resolvePinned();
      return pinned ? adapter.getPersistence(pinned) : undefined;
    };
    adapter.formattedRunWriter = {
      keyOf(message) {
        const inner = onlyInner(message);
        return inner === undefined ? undefined : formatAdapter.getId(inner);
      },
      canStore(parent) {
        const key = innerParentKey(parent);
        if (key === undefined) return false;
        return key === null || !!pinnedPersistence()?.isPersisted(key);
      },
      async write(message, parent) {
        const inner = onlyInner(message);
        const parentId = innerParentKey(parent);
        const pinned = resolvePinned();
        if (inner === undefined || parentId === undefined || !pinned) return;
        const id = formatAdapter.getId(inner);
        const context = adapter.captureScope(pinned);
        const { remoteId } = await pinned.initialize();
        adapter.assertCurrentScope(context);
        const { persistence } = context;
        const formatted = getTargetFormatted(context);
        if (message.status?.type === "running" && staleIds.delete(id)) {
          // Resume continues the stale message in place: its continuation is a child row with a new lease, which supersedes the stale run.
          const staleRemoteId = persistence.getResolvedRemoteId(id) ?? id;
          aliases.set(id, `${CONTINUATION_PREFIX}${staleRemoteId}`);
          await formatted.append(
            remoteId,
            { parentId: id, message: inner },
            "running",
          );
          return;
        }
        const key = aliasOf(id);
        const run = runPhaseOf(message, persistence, key);
        if (run !== "running") endPhases.delete(key);
        const item = { parentId, message: inner };
        if (!persistence.isPersisted(key)) {
          await formatted.append(remoteId, item, run);
        } else {
          await formatted.update?.(remoteId, item, key, run);
        }
      },
      hasOpenRun: (key) => !!pinnedPersistence()?.hasOpenRun(aliasOf(key)),
      rename: (from, to) =>
        pinnedPersistence()?.rename(aliasOf(from), aliasOf(to)) ??
        Promise.resolve(),
      noteSettled(message) {
        const key = this.keyOf(message);
        if (key !== undefined && this.hasOpenRun(key))
          endPhases.set(aliasOf(key), endPhaseOf(message));
      },
    };
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
        await getTargetFormatted(context).append(
          remoteId,
          item,
          settledPhase(context.persistence, aliasedFormat.getId(item.message)),
        );
      },
      async update(item: MessageFormatItem<TMessage>, localMessageId: string) {
        const pinned = resolvePinned();
        if (!pinned || !pinned.getState().remoteId) return;
        const context = adapter.captureScope(pinned);
        const remoteId = await adapter.resolveExistingRemoteId(pinned);
        adapter.assertCurrentScope(context);
        if (!remoteId) return;
        const key = aliasOf(localMessageId);
        await getTargetFormatted(context).update?.(
          remoteId,
          item,
          key,
          settledPhase(context.persistence, key),
        );
      },
      async delete(items: MessageFormatItem<TMessage>[]) {
        const pinned = resolvePinned();
        if (!pinned || !pinned.getState().remoteId) return;
        const context = adapter.captureScope(pinned);
        const remoteId = await adapter.resolveExistingRemoteId(pinned);
        adapter.assertCurrentScope(context);
        if (!remoteId) return;
        await getTargetFormatted(context).delete?.(remoteId, items);
      },
      reportTelemetry(
        items: MessageFormatItem<TMessage>[],
        options?: {
          durationMs?: number;
          stepTimestamps?: StepTimestamp[];
          message?: ThreadMessage;
          userMessageId?: string;
          persistenceError?: unknown;
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
        const rows = await context.persistence.load(
          remoteId,
          formatAdapter.format,
        );
        adapter.assertCurrentScope(context);
        aliases.clear();
        staleIds.clear();
        return { messages: decodeFormattedRows(rows, formatAdapter, staleIds) };
      },
      unstable_onReload(listener) {
        reloadListeners.add(listener);
        return () => {
          reloadListeners.delete(listener);
        };
      },
    };
  }

  private reloadListeners = new Set<() => Promise<void>>();

  /** Re-reads a formatted thread through the runtime that loaded it; false when none listens. */
  public async reloadFormatted(): Promise<boolean> {
    const listeners = [...this.reloadListeners];
    await Promise.all(listeners.map((listener) => listener()));
    return listeners.length > 0;
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    this.servesThreadMessages = true;
    const threadListItem = this.aui.threadListItem;
    const context = this.captureScope(threadListItem);
    const { remoteId } = await threadListItem.initialize();
    this.assertCurrentScope(context);
    const run = runPhaseOf(message, context.persistence);
    await this._writeMessage(context, remoteId, message, (encoded) =>
      context.persistence.append(
        remoteId,
        message.id,
        parentId,
        "aui/v0",
        encoded,
        run,
      ),
    );
  }

  /**
   * Reads one stored message's run state with a short page instead of the
   * whole thread; undefined when the row is not on that page.
   */
  public async readRunState(
    messageId: string,
  ): Promise<{ run: CloudMessage["run"]; updatedAt: number } | undefined> {
    const threadListItem = this.aui.threadListItem;
    const context = this.captureScope(threadListItem);
    const remoteThreadId = await this.resolveExistingRemoteId(threadListItem);
    this.assertCurrentScope(context);
    if (!remoteThreadId) return undefined;
    const remoteId =
      context.persistence.getResolvedRemoteId(messageId) ?? messageId;
    const { messages } = await context.cloud.threads.messages.list(
      remoteThreadId,
      { limit: RUN_STATE_PAGE_SIZE },
    );
    const row = messages.find((message) => message.id === remoteId);
    return row
      ? { run: row.run, updatedAt: row.updated_at.getTime() }
      : undefined;
  }

  /**
   * The writer the run tracker stores running messages with: the formatted
   * one once a runtime persists through `withFormat`, the `aui/v0` one once a
   * runtime reads or writes `aui/v0` rows, otherwise none.
   */
  public getRunWriter(): CloudRunWriter | undefined {
    return (
      this.formattedRunWriter ??
      (this.servesThreadMessages ? this.threadMessageRunWriter : undefined)
    );
  }

  private threadMessageRunWriter: CloudRunWriter = {
    keyOf: (message) => message.id,
    write: (message, parent) =>
      this.update({ parentId: parent?.id ?? null, message }),
    hasOpenRun: (key) => this.getPersistence().hasOpenRun(key),
    rename: (from, to) => this.getPersistence().rename(from, to),
  };

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
    const run = runPhaseOf(message, context.persistence);
    await this._writeMessage(context, remoteId, message, (encoded) =>
      context.persistence.update(remoteId, message.id, "aui/v0", encoded, run),
    );
  }

  /** @deprecated Experimental since 2024-09-01. Not scheduled for removal; the API may change in any release. */
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
    let writeError: { error: unknown } | undefined;
    try {
      await write(encoded);
    } catch (error) {
      writeError = { error };
    }
    if (!firstSettle) {
      if (writeError) throw writeError.error;
      return;
    }
    if (!writeError) ledger.settled.add(message.id);
    if (!ledger.reported.has(message.id) && context.cloud.telemetry.enabled) {
      const extracted = extractTelemetry("aui/v0", encoded);
      if (extracted) {
        ledger.reported.add(message.id);
        const info = extractRunMessageInfo(message, "aui/v0");
        this._sendReport(
          remoteId,
          extracted,
          undefined,
          undefined,
          writeError
            ? withPersistenceFailure(info, extracted.status, writeError.error)
            : info,
          context,
        );
      }
    }
    if (writeError) throw writeError.error;
  }

  async delete(items: ExportedMessageRepositoryItem[]) {
    const threadListItem = this.aui.threadListItem;
    if (!threadListItem.getState().remoteId) return;
    const context = this.captureScope(threadListItem);
    const remoteId = await this.resolveExistingRemoteId(threadListItem);
    this.assertCurrentScope(context);
    if (!remoteId) return;
    await context.persistence.delete(
      remoteId,
      items.map((item) => item.message.id),
    );
  }

  async load() {
    this.servesThreadMessages = true;
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
      const decoded = auiV0DecodeSafely(row);
      if (!decoded) continue;
      const item =
        row.run && decoded.message.role === "assistant"
          ? {
              ...decoded,
              message: {
                ...decoded.message,
                status: runStatusOf(row.run),
              } as ThreadMessage,
            }
          : decoded;
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
      userMessageId?: string;
      persistenceError?: unknown;
    },
    threadListItem?: CloudThreadListItem,
    observedInfo?: RunMessageInfo,
  ) {
    const item = threadListItem ?? this.aui.threadListItem;
    const context = this.captureScope(item);
    if (!item.getState().remoteId) return;

    const extracted =
      extractRunTelemetry(format, runMessages) ??
      (observedInfo?.status !== undefined
        ? { status: "incomplete" as const }
        : undefined);
    if (!extracted) return;

    const messageInfo =
      options && "persistenceError" in options
        ? withPersistenceFailure(
            observedInfo,
            extracted.status,
            options.persistenceError,
          )
        : observedInfo;

    void this.resolveExistingRemoteId(item)
      .then(async (remoteId) => {
        if (!remoteId) return;
        this.assertCurrentScope(context);
        const userMessageId =
          options?.userMessageId !== undefined
            ? await context.persistence
                .getRemoteId(options.userMessageId)
                .catch(() => undefined)
            : undefined;
        this.assertCurrentScope(context);
        this._sendReport(
          remoteId,
          extracted,
          options?.durationMs,
          options?.stepTimestamps,
          messageInfo,
          context,
          userMessageId,
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
    userMessageId?: string,
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
      userMessageId,
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
  useCloudRunLeases(adapter, aui);
  return adapter;
}

export function useAssistantCloudThreadHistoryAdapter(
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter & { readonly feedback: FeedbackAdapter } {
  const scopeRef = useRef<unknown>(DEFAULT_CLOUD_SCOPE);
  return useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef);
}
