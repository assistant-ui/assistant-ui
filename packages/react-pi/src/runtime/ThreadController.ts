/**
 * Per-thread controller: bridges Pi client events into a snapshot-authoritative
 * `PiThreadState` and exposes the imperative actions the runtime hook wires into
 * a `useExternalStoreRuntime`.
 *
 * The `PiClient` is the transport boundary (HTTP/SSE, RPC subprocess, IPC), so
 * there is no separate event-source class here. React store subscriptions stay
 * local; the controller opens live Pi events only for an explicit `connect()`
 * or operations that need a live runtime. `load()` is the cold read path and
 * seeds from `getThread`.
 *
 * Browser-safe; imports no `@earendil-works/pi-*` packages.
 */

import { ExportedMessageRepository } from "@assistant-ui/react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";
import {
  createPiThreadState,
  reducePiThreadState,
  removeHostUiRequest,
  type PiThreadState,
} from "./threadState";
import { errorText } from "../utils";
import { projectPiThreadMessagesShared } from "./messageProjection";
import {
  responseForApproval,
  responseForInterrupt,
  type PiInterruptAnswer,
} from "./hostUi";
import type {
  PiClient,
  PiClientEvent,
  PiAgentMessage,
  PiHostUiResponse,
  PiImageContent,
  PiSendMessageInput,
  PiThinkingLevel,
  PiThreadSnapshot,
} from "../types";

export type PiSendOptions = {
  /** Overrides the derived behavior. While the thread is running this is
   * REQUIRED by Pi (`prompt()` throws otherwise); the controller derives a
   * `"followUp"` default from run status when omitted. */
  streamingBehavior?: "followUp" | "steer";
};

export type PiNotificationScheduler = (flush: () => void) => void;

export interface PiThreadControllerLike {
  getState(): PiThreadState;
  getProjectedMessages(): readonly ThreadMessageLike[];
  getMessageRepository(): ExportedMessageRepository;
  getVersion(): number;
  connect(): () => void;
  subscribe(listener: () => void): () => void;
  subscribeMetadata(listener: () => void): () => void;
  subscribeMessages(listener: () => void): () => void;
  load(force?: boolean): Promise<void>;
  refresh(): Promise<void>;
  sendMessage(message: AppendMessage, options?: PiSendOptions): Promise<void>;
  cancel(): Promise<void>;
  /** Clear Pi's server-side queue; resolves with the cleared text so the UI
   * can restore it to the composer. */
  clearQueue(): Promise<{ steering: string[]; followUp: string[] }>;
  setModel(input: { provider: string; modelId: string }): Promise<void>;
  setThinkingLevel(level: PiThinkingLevel): Promise<void>;
  /** Answer a native tool-call approval (`confirm`). */
  respondToToolApproval(approvalId: string, approved: boolean): Promise<void>;
  /** Resolve a native tool-call interrupt (`select`/`input`/`editor`). */
  resumeToolCall(toolCallId: string, payload: unknown): Promise<void>;
  /** Answer a side-channel (free-standing) host-UI request directly. */
  respondToHostUiRequest(response: PiHostUiResponse): Promise<void>;
  dispose(): void;
}

const defaultScheduleNotify: PiNotificationScheduler = (flush) => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => flush());
    return;
  }
  setTimeout(flush, 16);
};

/** Event types the reducer acts on. Anything else triggers a snapshot refresh
 * (forward-compat for Pi's open, module-augmented event union). */
const MESSAGE_DIRTY_EVENT_TYPES: ReadonlySet<string> = new Set([
  "snapshot",
  "agent_start",
  "agent_end",
  "message_start",
  "message_update",
  "message_end",
  "tool_execution_update",
  "tool_execution_end",
  "extension_ui_request",
  "extension_ui_resolved",
]);

const MESSAGE_FRAME_COALESCED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "message_update",
  "tool_execution_update",
]);

const METADATA_DIRTY_EVENT_TYPES: ReadonlySet<string> = new Set([
  "snapshot",
  "agent_start",
  "agent_end",
  "queue_update",
  "compaction_start",
  "compaction_end",
  "auto_retry_start",
  "auto_retry_end",
  "session_info_changed",
  "thinking_level_changed",
  "context_usage",
  "extension_ui_request",
  "extension_ui_resolved",
  "error",
]);

/** Everything the reducer understands: the two dirty sets plus the event types
 * it deliberately absorbs without marking anything dirty. */
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  ...MESSAGE_DIRTY_EVENT_TYPES,
  ...METADATA_DIRTY_EVENT_TYPES,
  "turn_start",
  "turn_end",
  "tool_execution_start",
  "agent_settled",
  "entry_appended",
]);

/** Parse a `data:<mime>;base64,<data>` URL into Pi `ImageContent`. Non-data-URL
 * strings pass through as opaque base64 with a generic image mime. */
const toImageContent = (image: string): PiImageContent => {
  const match = /^data:([^;,]+)(?:;base64)?,(.*)$/s.exec(image);
  if (match) {
    return { type: "image", mimeType: match[1]!, data: match[2]! };
  }
  return { type: "image", mimeType: "image/png", data: image };
};

/** All content parts of an append message, with attachment parts flattened in. */
export const appendMessageParts = (message: AppendMessage) => [
  ...message.content,
  ...(message.attachments?.flatMap((a) => a.content ?? []) ?? []),
];

export const buildPiSendInput = (
  message: AppendMessage,
  streamingBehavior: "followUp" | "steer" | undefined,
): PiSendMessageInput => {
  const parts = appendMessageParts(message);

  const textChunks: string[] = [];
  const attachments: PiImageContent[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      textChunks.push(part.text);
    } else if (part.type === "image") {
      attachments.push(toImageContent(part.image));
    }
    // `file`/other parts are not part of Pi's user-content surface.
  }

  return {
    content: textChunks.join("\n\n"),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(streamingBehavior ? { streamingBehavior } : {}),
  };
};

const readSteeringIntent = (
  message: AppendMessage,
): "followUp" | "steer" | undefined => {
  const intent = message.runConfig?.custom?.["streamingBehavior"];
  return intent === "followUp" || intent === "steer" ? intent : undefined;
};

const optimisticUserMessageFromInput = (
  input: PiSendMessageInput,
): PiAgentMessage => ({
  role: "user",
  content:
    input.attachments && input.attachments.length > 0
      ? [{ type: "text", text: input.content }, ...input.attachments]
      : input.content,
  timestamp: Date.now(),
});

/** Text-only reconcile key: the echoed transcript message may carry extra
 * fields (e.g. enriched image content), so structural equality is too strict —
 * the prompt text is the stable part. */
const userContentKey = (message: PiAgentMessage): string | null => {
  if (message.role !== "user") return null;
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  return (content as readonly { type: string; text?: string }[])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
};

type OptimisticUserMessage = {
  message: PiAgentMessage;
  baseMessageCount: number;
};

const markStateRunning = (state: PiThreadState): PiThreadState => {
  if (state.runStatus === "running" && state.metadata.status === "running") {
    return state;
  }
  return {
    ...state,
    runStatus: "running",
    lastError: undefined,
    metadata:
      state.metadata.status === "running"
        ? state.metadata
        : { ...state.metadata, status: "running" },
  };
};

export class PiThreadController implements PiThreadControllerLike {
  private state: PiThreadState;
  private projectedMessages: readonly ThreadMessageLike[] = [];
  private messageRepository = ExportedMessageRepository.fromArray([]);
  private version = 0;
  private readonly allListeners = new Set<() => void>();
  private readonly metadataListeners = new Set<() => void>();
  private readonly messageListeners = new Set<() => void>();
  private connectionRetainers = 0;
  private readonly optimisticUserMessages: OptimisticUserMessage[] = [];
  private unsubscribeFromEvents: (() => void) | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private loadPromise: Promise<void> | null = null;
  private messageFlushScheduled = false;
  /** Synthetic seq for snapshots produced locally (via `getThread`), kept below
   * the supervisor's live seqs so they never suppress real events. */
  private readonly localSnapshotSeq = 0;

  constructor(
    private readonly client: PiClient,
    private readonly threadId: string,
    private readonly options: {
      scheduleNotify?: PiNotificationScheduler;
    } = {},
  ) {
    this.state = createPiThreadState(threadId);
  }

  public getState() {
    return this.state;
  }

  public getProjectedMessages() {
    return this.projectedMessages;
  }

  public getMessageRepository() {
    return this.messageRepository;
  }

  public getVersion() {
    return this.version;
  }

  public connect() {
    this.connectionRetainers += 1;
    this.ensureEventSubscription({
      includeSnapshot: this.state.loadState !== "loaded",
    });
    return () => {
      this.connectionRetainers = Math.max(0, this.connectionRetainers - 1);
      this.maybeDisconnectFromEvents();
    };
  }

  public subscribe(listener: () => void) {
    this.allListeners.add(listener);
    return () => {
      this.allListeners.delete(listener);
      this.maybeDisconnectFromEvents();
    };
  }

  public subscribeMetadata(listener: () => void) {
    this.metadataListeners.add(listener);
    return () => {
      this.metadataListeners.delete(listener);
      this.maybeDisconnectFromEvents();
    };
  }

  public subscribeMessages(listener: () => void) {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
      this.maybeDisconnectFromEvents();
    };
  }

  public dispose() {
    // React StrictMode can detach then resubscribe the same controller.
    this.clearDisconnectTimer();
    this.unsubscribeFromEvents?.();
    this.unsubscribeFromEvents = null;
    this.allListeners.clear();
    this.metadataListeners.clear();
    this.messageListeners.clear();
  }

  private ensureEventSubscription(options?: { includeSnapshot?: boolean }) {
    this.clearDisconnectTimer();
    if (this.unsubscribeFromEvents) return;
    this.unsubscribeFromEvents = this.client.subscribe(
      this.threadId,
      (event: PiClientEvent) => {
        if (event.threadId !== this.threadId) return;
        this.dispatch(event);
      },
      options,
    );
  }

  private hasConsumers(): boolean {
    return (
      this.connectionRetainers > 0 ||
      this.allListeners.size > 0 ||
      this.metadataListeners.size > 0 ||
      this.messageListeners.size > 0
    );
  }

  private maybeDisconnectFromEvents() {
    if (this.hasConsumers()) return;
    if (this.disconnectTimer) return;
    this.disconnectTimer = setTimeout(() => {
      this.disconnectTimer = null;
      if (this.hasConsumers()) return;
      this.unsubscribeFromEvents?.();
      this.unsubscribeFromEvents = null;
    }, 30_000);
  }

  private clearDisconnectTimer() {
    if (!this.disconnectTimer) return;
    clearTimeout(this.disconnectTimer);
    this.disconnectTimer = null;
  }

  public async load(force = false) {
    if (this.loadPromise && !force) return this.loadPromise;

    this.setState({ ...this.state, loadState: "loading" });

    const request = this.client
      .getThread(this.threadId)
      .then((snapshot: PiThreadSnapshot) => {
        if (this.loadPromise !== request) return;
        this.applySnapshot(snapshot);
      })
      .catch((error: unknown) => {
        if (this.loadPromise !== request) throw error;
        this.setState({
          ...this.state,
          loadState: "loaded",
          lastError: errorText(error),
        });
        throw error;
      })
      .finally(() => {
        if (this.loadPromise === request) this.loadPromise = null;
      });

    this.loadPromise = request;
    return request;
  }

  public refresh() {
    return this.load(true);
  }

  private refreshInBackground() {
    if (this.loadPromise) return; // a load is already in flight; avoid storms
    void this.refresh().catch(() => {
      // load() already records the error on state.
    });
  }

  public async sendMessage(message: AppendMessage, options?: PiSendOptions) {
    if (message.role !== "user") {
      throw new Error("Pi only supports sending user messages");
    }

    const isQueuedSend = this.state.runStatus === "running";
    const behavior =
      options?.streamingBehavior ??
      readSteeringIntent(message) ??
      (isQueuedSend ? "followUp" : undefined);

    const input = buildPiSendInput(message, behavior);
    this.ensureEventSubscription({ includeSnapshot: false });

    if (isQueuedSend) return this.sendQueued(input, behavior ?? "followUp");

    const optimistic = optimisticUserMessageFromInput(input);
    this.optimisticUserMessages.push({
      message: optimistic,
      baseMessageCount: this.state.messages.length,
    });
    this.setState(markStateRunning(this.state));
    this.recomputeProjectedMessagesAndNotify();

    try {
      await this.client.sendMessage(this.threadId, input);
    } catch (error) {
      const index = this.optimisticUserMessages.findIndex(
        (entry) => entry.message === optimistic,
      );
      if (index !== -1) this.optimisticUserMessages.splice(index, 1);
      this.recomputeProjectedMessagesAndNotify();
      // The optimistic `running` mark must not outlive the failed send; any
      // events from a run that did start will self-heal the status.
      this.setState({
        ...this.state,
        lastError: errorText(error),
        runStatus: "failed",
        metadata: { ...this.state.metadata, status: "failed" },
      });
      throw error;
    }
  }

  /** Mid-run sends land in Pi's queue, not the transcript (Pi appends the user
   * message only when the queue flushes), so the optimistic mirror goes into
   * `state.queue` — the thread stays clean and the queue UI shows it instantly.
   * The next real `queue_update` replaces the arrays wholesale and self-heals. */
  private async sendQueued(
    input: PiSendMessageInput,
    behavior: "followUp" | "steer",
  ) {
    const mode = behavior === "steer" ? "steering" : "followUp";
    this.setState({
      ...this.state,
      queue: {
        ...this.state.queue,
        [mode]: [...this.state.queue[mode], input.content],
      },
    });

    try {
      await this.client.sendMessage(this.threadId, input);
    } catch (error) {
      // Roll back only our optimistic entry; the run itself is unaffected.
      const entries = this.state.queue[mode];
      const index = entries.lastIndexOf(input.content);
      this.setState({
        ...this.state,
        lastError: errorText(error),
        ...(index !== -1
          ? {
              queue: {
                ...this.state.queue,
                [mode]: entries.filter((_, i) => i !== index),
              },
            }
          : {}),
      });
      throw error;
    }
  }

  public async clearQueue() {
    const cleared = await this.client.clearQueue(this.threadId);
    // Optimistically empty the local mirror; Pi's own `queue_update` (emitted
    // by `session.clearQueue`) confirms it.
    if (
      this.state.queue.steering.length > 0 ||
      this.state.queue.followUp.length > 0
    ) {
      this.setState({
        ...this.state,
        queue: { steering: [], followUp: [] },
      });
    }
    return cleared;
  }

  public async cancel() {
    try {
      await this.client.cancelRun(this.threadId);
    } catch (error) {
      this.setState({ ...this.state, lastError: errorText(error) });
      throw error;
    }
  }

  public async setModel(input: { provider: string; modelId: string }) {
    try {
      await this.client.setModel(this.threadId, input);
    } catch (error) {
      this.setState({ ...this.state, lastError: errorText(error) });
      throw error;
    }
    await this.refresh();
  }

  public async setThinkingLevel(level: PiThinkingLevel) {
    try {
      await this.client.setThinkingLevel(this.threadId, level);
    } catch (error) {
      this.setState({ ...this.state, lastError: errorText(error) });
      throw error;
    }
    await this.refresh();
  }

  public async respondToToolApproval(approvalId: string, approved: boolean) {
    await this.respond(responseForApproval(approvalId, approved));
  }

  public async resumeToolCall(toolCallId: string, payload: unknown) {
    const request = this.state.hostUiRequests.find(
      (r) => r.toolCallId === toolCallId,
    );
    if (!request) {
      throw new Error(
        `No pending host-UI request for tool call "${toolCallId}"`,
      );
    }
    if (request.kind === "confirm") {
      await this.respond(responseForApproval(request.id, payload === true));
    } else {
      await this.respond(
        responseForInterrupt(request.id, payload as PiInterruptAnswer),
      );
    }
  }

  public async respondToHostUiRequest(response: PiHostUiResponse) {
    await this.respond(response);
  }

  private async respond(response: PiHostUiResponse) {
    try {
      await this.client.respondToHostUiRequest(this.threadId, response);
    } catch (error) {
      this.setState({ ...this.state, lastError: errorText(error) });
      throw error;
    }
    // Optimistically clear the resolved request so the gate closes immediately.
    // Done directly (not via the reducer) because a synthetic event at the
    // current seq would be dropped by the dedup guard; the supervisor's real
    // `extension_ui_resolved` is idempotent over this removal.
    const next = removeHostUiRequest(this.state, response.requestId);
    if (next !== this.state) {
      this.setState(next);
      this.recomputeProjectedMessagesAndNotify();
    }
  }

  private applySnapshot(snapshot: PiThreadSnapshot) {
    this.dispatch({
      type: "snapshot",
      snapshot,
      threadId: this.threadId,
      seq: this.localSnapshotSeq,
    });
  }

  private dispatch(event: PiClientEvent) {
    const next = reducePiThreadState(this.state, event);
    const changed = next !== this.state;
    if (changed) this.state = next;

    this.reconcileOptimisticUserMessages();

    if (changed && METADATA_DIRTY_EVENT_TYPES.has(event.type)) {
      this.notifyMetadataListeners();
    }

    if (changed && MESSAGE_DIRTY_EVENT_TYPES.has(event.type)) {
      if (MESSAGE_FRAME_COALESCED_EVENT_TYPES.has(event.type)) {
        this.scheduleProjectedMessageFlush();
      } else {
        this.recomputeProjectedMessagesAndNotify();
      }
    }

    // Pi 0.80.7 emits entry_appended only for custom extension entries. Keep
    // snapshot reconciliation for other variants if Pi broadens that event.
    const needsSnapshotRefresh =
      !KNOWN_EVENT_TYPES.has(event.type) ||
      (event.type === "entry_appended" && event.entry.type !== "custom");
    if (needsSnapshotRefresh) this.refreshInBackground();
  }

  private setState(next: PiThreadState) {
    if (next === this.state) return;
    this.state = next;
    this.notifyMetadataListeners();
  }

  private projectedInputMessages() {
    return [
      ...this.state.messages,
      ...this.optimisticUserMessages.map((entry) => entry.message),
    ];
  }

  private reconcileOptimisticUserMessages() {
    if (this.optimisticUserMessages.length === 0) return;

    const remaining: OptimisticUserMessage[] = [];
    for (const entry of this.optimisticUserMessages) {
      const key = userContentKey(entry.message);
      const confirmed = this.state.messages
        .slice(entry.baseMessageCount)
        .some((message) => userContentKey(message) === key);
      if (!confirmed) remaining.push(entry);
    }

    if (remaining.length === this.optimisticUserMessages.length) return;
    this.optimisticUserMessages.length = 0;
    this.optimisticUserMessages.push(...remaining);
  }

  private projectMessages() {
    return projectPiThreadMessagesShared(
      {
        messages: this.projectedInputMessages(),
        toolExecutions: this.state.toolExecutions,
        runStatus: this.state.runStatus,
        hostUiRequests: this.state.hostUiRequests,
      },
      this.projectedMessages,
    );
  }

  private recomputeProjectedMessagesAndNotify() {
    const next = this.projectMessages();
    if (next === this.projectedMessages) return;
    this.projectedMessages = next;
    // `fromArray` chains messages linearly and keeps their stable `pi-msg:N`
    // ids (its generated id is only a fallback for id-less messages).
    this.messageRepository = ExportedMessageRepository.fromArray(next);
    this.notifyMessageListeners();
  }

  private scheduleProjectedMessageFlush() {
    if (this.messageFlushScheduled) return;
    this.messageFlushScheduled = true;
    const scheduleNotify = this.options.scheduleNotify ?? defaultScheduleNotify;
    scheduleNotify(() => {
      this.messageFlushScheduled = false;
      this.recomputeProjectedMessagesAndNotify();
    });
  }

  private bumpVersion() {
    this.version += 1;
  }

  private notifyMetadataListeners() {
    this.bumpVersion();
    for (const listener of this.metadataListeners) listener();
    for (const listener of this.allListeners) listener();
  }

  private notifyMessageListeners() {
    this.bumpVersion();
    for (const listener of this.messageListeners) listener();
    for (const listener of this.allListeners) listener();
  }
}
