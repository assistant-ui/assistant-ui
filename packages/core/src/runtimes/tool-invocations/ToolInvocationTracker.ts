declare const process: { env: { NODE_ENV?: string } };

import {
  createAssistantStreamController,
  type ToolCallStreamController,
  ToolResponse,
  unstable_toolResultStream,
  type Tool,
  type ToolModelContentPart,
} from "assistant-stream";
import {
  AssistantMetaTransformStream,
  type ReadonlyJSONValue,
} from "assistant-stream/utils";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";
import type { ThreadMessage } from "../../types/message";

/**
 * Streaming execution state for a frontend tool.
 */
export type ToolExecutionStatus =
  | { type: "executing" }
  | {
      type: "interrupt";
      payload: { type: "human"; payload: unknown };
    };

export type AddToolResultCommand = {
  readonly type: "add-tool-result";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly modelContent?: readonly ToolModelContentPart[];
};

export type ToolInvocationTrackerSnapshot = {
  readonly messages: readonly ThreadMessage[];
  /** Whether the producing runtime is currently streaming new output. */
  readonly isRunning: boolean;
  /**
   * Whether the producing runtime is still loading historical state.
   * When `true`, every snapshot is treated as historical (no `streamCall` /
   * `execute` fires). When `false`, processing resumes as live.
   */
  readonly isLoading?: boolean;
};

export type ToolInvocationTrackerCallbacks = {
  /**
   * Invoked when a client-side `execute()` returns a result and the runtime
   * needs to feed it back into the conversation.
   */
  onResult: (command: AddToolResultCommand) => void;
  /**
   * Invoked whenever the per-tool-call status map changes (executing /
   * interrupt / cleared). The callback receives a fresh map; mutating the
   * argument is not supported.
   */
  onStatusesChange: (
    statuses: ReadonlyMap<string, ToolExecutionStatus>,
  ) => void;
};

type ToolCallEntry = {
  toolName: string;
  argsText: string;
  hasResult: boolean;
} & (
  | {
      /** Restored phase — observed during a history-load snapshot. */
      controller?: undefined;
      argsComplete?: undefined;
    }
  | {
      /** Active phase — chunks are flowing through `controller`. */
      controller: ToolCallStreamController;
      argsComplete: boolean;
    }
);

const isArgsTextComplete = (argsText: string) => {
  try {
    JSON.parse(argsText);
    return true;
  } catch {
    return false;
  }
};

const parseArgsText = (argsText: string) => {
  try {
    return JSON.parse(argsText);
  } catch {
    return undefined;
  }
};

const isEquivalentCompleteArgsText = (previous: string, next: string) => {
  const previousValue = parseArgsText(previous);
  const nextValue = parseArgsText(next);
  if (previousValue === undefined || nextValue === undefined) return false;
  return isJSONValueEqual(previousValue, nextValue);
};

/**
 * Plain-class port of the former `useToolInvocations` React hook. Owns the
 * assistant-stream pipeline that drives client-side `streamCall` / `execute`
 * for tool-call parts surfaced by a thread runtime, plus the per-tool-call
 * status map that consumers render against.
 *
 * **Contract**: `streamCall` (and `execute`) fires exactly once per logical
 * `toolCallId`. Args mutations after first completion, result replacement,
 * and result clearing are *not* surfaced through additional `streamCall`
 * invocations — by design — so hosts cannot observe spurious re-fires of
 * side effects. The follow-up `reader.events()` API will expose those
 * post-completion transitions to consumers that opt in.
 *
 * State-transition safety: every public method that observes runtime state
 * (`setState`, `reset`, `abort`, `resume`) wraps its work in try/catch and
 * logs to `console.error` rather than throwing. The tracker is built into
 * the hot message-processing path, so a malformed snapshot must never crash
 * the host runtime. See ./EDGE_CASES.md for the known non-trivial state
 * transitions and what each does today.
 */
export class ToolInvocationTracker {
  private readonly _getTools: () => Record<string, Tool> | undefined;
  private readonly _callbacks: ToolInvocationTrackerCallbacks;

  private readonly _entries = new Map<string, ToolCallEntry>();
  /**
   * Tool call ids whose `execute` should be short-circuited in the wrapper.
   * Populated when an entry is created with a result already attached
   * (history reload, mid-run resume, etc.) — `execute` is suppressed so
   * client-side side effects don't double-run. Membership outlives the
   * entry: `reset()` deliberately does *not* clear this so post-abort
   * cancellation `result` chunks for pre-resolved entries can still be
   * recognized and dropped. Growth is bounded by the number of pre-resolved
   * tool calls observed in the session.
   */
  private readonly _skipExecuteStreamIds = new Set<string>();
  private readonly _humanInput = new Map<
    string,
    {
      resolve: (payload: unknown) => void;
      reject: (reason: unknown) => void;
    }
  >();
  /** In-flight `execute` invocations keyed by tool call id. */
  private readonly _executing = new Set<string>();
  private readonly _settledResolvers: Array<() => void> = [];

  private _statuses = new Map<string, ToolExecutionStatus>();

  private _ac: AbortController = new AbortController();
  private _pendingRestore = true;

  /** Cached last snapshot, used to skip processing on identical re-renders. */
  private _lastSnapshot: ToolInvocationTrackerSnapshot | null = null;
  private _isRunning = false;

  private _controller!: ReturnType<typeof createAssistantStreamController>[1];

  /**
   * Set when the assistant-stream pipeline has died (errored out via
   * `.pipeTo(...).catch(...)`). The next `setState` re-initializes the
   * pipeline and demotes all active entries to restored so they survive
   * across the restart without re-firing `streamCall` (preserves the
   * "exactly once" contract). Capped at a single auto-restart per session
   * — repeated failures keep the tracker dead with a more visible error.
   */
  private _pipelineDead = false;
  private _pipelineRestartUsed = false;

  constructor(
    getTools: () => Record<string, Tool> | undefined,
    callbacks: ToolInvocationTrackerCallbacks,
  ) {
    this._getTools = getTools;
    this._callbacks = callbacks;

    this._initPipeline();
  }

  /**
   * Build the assistant-stream pipeline. Called once from the constructor
   * and at most once again if `_pipelineDead` is set (see F.4 in
   * EDGE_CASES.md).
   */
  private _initPipeline(): void {
    const [stream, controller] = createAssistantStreamController();
    this._controller = controller;

    const transform = unstable_toolResultStream(
      () => this._getWrappedTools(),
      () => this._ac.signal,
      (toolCallId, payload) => this._onHumanInput(toolCallId, payload),
      {
        onExecutionStart: (id) => this._onExecutionStart(id),
        onExecutionEnd: (id) => this._onExecutionEnd(id),
      },
    );

    stream
      .pipeThrough(transform)
      .pipeThrough(new AssistantMetaTransformStream())
      .pipeTo(
        new WritableStream({
          write: (chunk) => {
            try {
              if (chunk.type !== "result") return;
              this._handleResultChunk(chunk);
            } catch (err) {
              console.error(
                "[ToolInvocationTracker] result chunk handling failed",
                err,
              );
            }
          },
        }),
      )
      .catch((err) => {
        console.error(
          "[ToolInvocationTracker] stream pipeline failed; will attempt single restart on next setState",
          err,
        );
        this._pipelineDead = true;
      });
  }

  // ───────────────────────── public API ─────────────────────────

  /**
   * Feed the next observed snapshot into the tracker. Called from the host
   * runtime whenever its message list / running state changes.
   */
  public setState(snapshot: ToolInvocationTrackerSnapshot): void {
    try {
      // Recover from a dead pipeline before processing anything. We demote
      // all active entries to "restored" so the rebuilt pipeline does not
      // re-fire `streamCall` for tool calls that already fired pre-death;
      // preserves the "exactly once per toolCallId" contract.
      if (this._pipelineDead) {
        if (this._pipelineRestartUsed) {
          // Already retried once and failed again. Stay dead.
          return;
        }
        this._pipelineRestartUsed = true;
        this._pipelineDead = false;
        this._demoteEntriesToRestored();
        this._executing.clear();
        this._ac = new AbortController();
        this._initPipeline();
        // Fall through and process the snapshot against the fresh pipeline.
      }

      // Identical snapshot — skip processing entirely. Note: external-store
      // runtimes rebuild the messages array on every adapter update, so this
      // fast-path rarely triggers there; it's primarily for the React-hook
      // shim where state references are stable.
      if (
        this._lastSnapshot &&
        this._lastSnapshot.messages === snapshot.messages &&
        this._lastSnapshot.isRunning === snapshot.isRunning &&
        this._lastSnapshot.isLoading === snapshot.isLoading
      ) {
        return;
      }

      // While the host is still loading initial state, treat every snapshot
      // as historical: tool calls are recorded so the next live snapshot can
      // diff against them, but `streamCall` / `execute` do not fire.
      const restoreFromLoading = snapshot.isLoading === true;
      if (restoreFromLoading) {
        this._pendingRestore = true;
      }

      // E.4 / AF3 — only mark `_lastSnapshot`/`_isRunning` as observed after
      // processing succeeds. If `_processMessages` throws, the next snapshot
      // (even if identical) gets re-processed against the recovered state.
      const previousIsRunning = this._isRunning;
      this._isRunning = snapshot.isRunning;
      try {
        this._processMessages(snapshot.messages);
      } catch (err) {
        this._isRunning = previousIsRunning;
        throw err;
      }
      this._lastSnapshot = snapshot;
      this._pendingRestore = false;
    } catch (err) {
      console.error(
        "[ToolInvocationTracker] setState failed; snapshot dropped",
        err,
      );
    }
  }

  /**
   * Reset the tracker so the next observed snapshot is treated as historical.
   * Clears entries and aborts any in-flight executions. Used by callers like
   * `importExternalState` to mark a freshly loaded state as restored.
   */
  public reset(): void {
    try {
      this._pendingRestore = true;
      this._entries.clear();
      this._lastSnapshot = null;
      // `_skipExecuteStreamIds` is intentionally not cleared — see field doc.
      void this.abort().finally(() => {
        this._executing.clear();
      });
    } catch (err) {
      console.error("[ToolInvocationTracker] reset failed", err);
    }
  }

  /**
   * Abort any in-flight `execute()` invocations. Resolves once all of them
   * have settled (or immediately if none are running).
   */
  public abort(): Promise<void> {
    try {
      this._humanInput.forEach(({ reject }) => {
        try {
          reject(new Error("Tool execution aborted"));
        } catch {
          // host rejection handler threw — already in the abort path,
          // swallow so we continue cleaning up.
        }
      });
      this._humanInput.clear();

      this._ac.abort();
      this._ac = new AbortController();

      if (this._executing.size === 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        this._settledResolvers.push(resolve);
      });
    } catch (err) {
      console.error("[ToolInvocationTracker] abort failed", err);
      return Promise.resolve();
    }
  }

  /**
   * Resolve a pending human-input request for the given tool call. Returns
   * `true` if a pending request was resumed, `false` if the tracker has no
   * outstanding request for that id (the caller should fall back to its own
   * dispatch path).
   */
  public resume(toolCallId: string, payload: unknown): boolean {
    try {
      const handlers = this._humanInput.get(toolCallId);
      if (!handlers) return false;
      this._humanInput.delete(toolCallId);
      this._setStatus(toolCallId, { type: "executing" });
      handlers.resolve(payload);
      return true;
    } catch (err) {
      console.error("[ToolInvocationTracker] resume failed", err);
      return false;
    }
  }

  /**
   * Returns the current tool execution status map. The returned `Map` is
   * the tracker's internal store — do not mutate it. Treat the reference
   * as a snapshot that may be replaced wholesale on the next status
   * transition.
   */
  public getStatuses(): ReadonlyMap<string, ToolExecutionStatus> {
    return this._statuses;
  }

  // ───────────────────── internal: tool wrapping ─────────────────────

  private _getWrappedTools(): Record<string, Tool> | undefined {
    const tools = this._getTools();
    if (!tools) return undefined;

    return Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => {
        const execute = tool.execute;
        if (execute === undefined) return [name, tool];

        const wrappedTool = {
          ...tool,
          execute: (
            ...[args, context]: Parameters<NonNullable<typeof execute>>
          ) => {
            if (this._skipExecuteStreamIds.has(context.toolCallId)) {
              // Pre-resolved tool call: never invoke the host's execute.
              // Returning a never-settling Promise keeps the executor's
              // pending entry alive but enqueues nothing.
              return new Promise(() => {}) as never;
            }
            return execute(args, context);
          },
        } as Tool;
        return [name, wrappedTool];
      }),
    ) as Record<string, Tool>;
  }

  // ──────────────── internal: execution lifecycle callbacks ────────────────

  private _onHumanInput(
    toolCallId: string,
    payload: unknown,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const previous = this._humanInput.get(toolCallId);
      if (previous) {
        try {
          previous.reject(
            new Error("Human input request was superseded by a new request"),
          );
        } catch {
          // host rejection handler threw; ignore and proceed
        }
      }
      this._humanInput.set(toolCallId, { resolve, reject });
      this._setStatus(toolCallId, {
        type: "interrupt",
        payload: { type: "human", payload },
      });
    });
  }

  private _onExecutionStart(toolCallId: string): void {
    if (this._skipExecuteStreamIds.has(toolCallId)) return;

    this._executing.add(toolCallId);
    this._setStatus(toolCallId, { type: "executing" });
  }

  private _onExecutionEnd(toolCallId: string): void {
    if (!this._executing.delete(toolCallId)) return;

    this._deleteStatus(toolCallId);

    if (this._executing.size === 0) {
      const resolvers = this._settledResolvers.splice(0);
      // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally has no return
      resolvers.forEach((resolve) => {
        try {
          resolve();
        } catch {
          // ignore — settled-resolver consumer threw
        }
      });
    }
  }

  private _handleResultChunk(chunk: {
    type: "result";
    result: ReadonlyJSONValue;
    isError: boolean;
    artifact?: ReadonlyJSONValue;
    modelContent?: readonly ToolModelContentPart[];
    meta: { toolCallId: string; toolName: string };
  }): void {
    const toolCallId = chunk.meta.toolCallId;
    const entry = this._entries.get(toolCallId);

    // Pre-resolved tool call whose entry has been cleared by `reset()`.
    // The post-abort cancellation chunk lands here after the entry is
    // gone; suppress via the long-lived skip-execute marker.
    if (!entry && this._skipExecuteStreamIds.has(toolCallId)) {
      return;
    }

    // The host already set the result (via the live snapshot's
    // `setResponse` path). Suppress the executor's redundant emit.
    if (entry?.hasResult) return;

    this._invokeOnResult({
      type: "add-tool-result",
      toolCallId,
      toolName: chunk.meta.toolName,
      result: chunk.result,
      isError: chunk.isError,
      ...(chunk.artifact !== undefined && { artifact: chunk.artifact }),
      ...(chunk.modelContent !== undefined && {
        modelContent: chunk.modelContent,
      }),
    });
  }

  // ──────────────── internal: callback invocation (AF1/AF2) ────────────────

  private _invokeOnResult(command: AddToolResultCommand): void {
    try {
      this._callbacks.onResult(command);
    } catch (err) {
      console.error(
        "[ToolInvocationTracker] onResult callback threw; result dropped",
        err,
      );
    }
  }

  private _invokeOnStatusesChange(): void {
    try {
      this._callbacks.onStatusesChange(this._statuses);
    } catch (err) {
      console.error(
        "[ToolInvocationTracker] onStatusesChange callback threw; status change not propagated",
        err,
      );
    }
  }

  // ──────────────── internal: status map mutations ────────────────

  private _setStatus(toolCallId: string, status: ToolExecutionStatus): void {
    const next = new Map(this._statuses);
    next.set(toolCallId, status);
    this._statuses = next;
    this._invokeOnStatusesChange();
  }

  private _deleteStatus(toolCallId: string): void {
    if (!this._statuses.has(toolCallId)) return;
    const next = new Map(this._statuses);
    next.delete(toolCallId);
    this._statuses = next;
    this._invokeOnStatusesChange();
  }

  // ──────────────── internal: snapshot processing ────────────────

  private _hasExecutableTool(toolName: string): boolean {
    const tool = this._getTools()?.[toolName];
    return tool?.execute !== undefined || tool?.streamCall !== undefined;
  }

  private _shouldCloseArgsStream({
    toolName,
    argsText,
    hasResult,
  }: {
    toolName: string;
    argsText: string;
    hasResult: boolean;
  }): boolean {
    if (hasResult) return true;
    if (!this._hasExecutableTool(toolName)) {
      return !this._isRunning && isArgsTextComplete(argsText);
    }
    return isArgsTextComplete(argsText);
  }

  private _startActiveEntry(
    toolCallId: string,
    toolName: string,
    skipExecute: boolean,
  ): ToolCallEntry {
    const toolCallController = this._controller.addToolCallPart({
      toolName,
      toolCallId,
    });
    if (skipExecute) {
      this._skipExecuteStreamIds.add(toolCallId);
    }
    const entry: ToolCallEntry = {
      toolName,
      controller: toolCallController,
      argsText: "",
      hasResult: false,
      argsComplete: false,
    };
    this._entries.set(toolCallId, entry);
    return entry;
  }

  /**
   * Demote every active entry back to the restored phase. Used by the
   * pipeline-restart path so that, after a fresh pipeline is built, the
   * next observed snapshot does not re-fire `streamCall` for tool calls
   * that already fired pre-death. Args / hasResult tracking is preserved
   * so signature comparisons still work.
   */
  private _demoteEntriesToRestored(): void {
    for (const [toolCallId, entry] of this._entries) {
      if (!entry.controller) continue;
      this._entries.set(toolCallId, {
        toolName: entry.toolName,
        argsText: entry.argsText,
        hasResult: entry.hasResult,
      });
    }
  }

  private _processArgsText(
    entry: ToolCallEntry,
    content: {
      toolCallId: string;
      toolName: string;
      argsText: string;
      result?: unknown;
    },
  ): void {
    if (!entry.controller) return;
    const hasResult = content.result !== undefined;

    if (content.argsText !== entry.argsText) {
      let shouldWriteArgsText = true;

      if (entry.argsComplete) {
        if (isEquivalentCompleteArgsText(entry.argsText, content.argsText)) {
          // A.3 — key reorder. Track new text, no re-fire needed.
          entry.argsText = content.argsText;
          shouldWriteArgsText = false;
        } else {
          // A.4 — args changed after first completion. Under the
          // "exactly once per toolCallId" contract we do not restart the
          // stream. The host's existing `streamCall` keeps its original
          // args view; the snapshot's new text is recorded for diffing
          // but not surfaced. Events API in a follow-up will expose this
          // to consumers that opt in.
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[ToolInvocationTracker] argsText changed after first completion; not re-firing streamCall (see EDGE_CASES.md A.4)",
              {
                previous: entry.argsText,
                next: content.argsText,
                toolCallId: content.toolCallId,
              },
            );
          }
          shouldWriteArgsText = false;
        }
      } else if (!content.argsText.startsWith(entry.argsText)) {
        if (
          isArgsTextComplete(entry.argsText) &&
          isArgsTextComplete(content.argsText) &&
          isEquivalentCompleteArgsText(entry.argsText, content.argsText)
        ) {
          const shouldClose = this._shouldCloseArgsStream({
            toolName: content.toolName,
            argsText: content.argsText,
            hasResult,
          });
          if (shouldClose) entry.controller.argsText.close();
          entry.argsText = content.argsText;
          entry.argsComplete = shouldClose;
          shouldWriteArgsText = false;
        } else {
          // A.2 — args regressed mid-stream. Under the "exactly once"
          // contract we do not restart. The controller keeps whatever
          // prefix we already streamed; subsequent prefix-respecting
          // updates can still flow against it. Snapshots that never
          // re-converge to a prefix will leave the controller's args
          // view stale relative to the snapshot. Events API in a
          // follow-up will expose this to consumers that opt in.
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[ToolInvocationTracker] argsText regressed mid-stream; not restarting (see EDGE_CASES.md A.2)",
              {
                previous: entry.argsText,
                next: content.argsText,
                toolCallId: content.toolCallId,
              },
            );
          }
          shouldWriteArgsText = false;
        }
      }

      if (shouldWriteArgsText && entry.controller) {
        const delta = content.argsText.slice(entry.argsText.length);
        entry.controller.argsText.append(delta);
        const shouldClose = this._shouldCloseArgsStream({
          toolName: content.toolName,
          argsText: content.argsText,
          hasResult,
        });
        if (shouldClose) entry.controller.argsText.close();
        entry.argsText = content.argsText;
        entry.argsComplete = shouldClose;
      }
    }

    if (!entry.argsComplete && entry.controller) {
      const shouldClose = this._shouldCloseArgsStream({
        toolName: content.toolName,
        argsText: content.argsText,
        hasResult,
      });
      if (shouldClose) {
        entry.controller.argsText.close();
        entry.argsText = content.argsText;
        entry.argsComplete = true;
      }
    }
  }

  private _processMessages(messages: readonly ThreadMessage[]): void {
    const isRestore = this._pendingRestore;

    for (const message of messages) {
      if (!message || !Array.isArray((message as ThreadMessage).content)) {
        continue;
      }
      for (const content of message.content as readonly ThreadMessage["content"][number][]) {
        if (!content || content.type !== "tool-call") continue;

        const existing = this._entries.get(content.toolCallId);

        if (isRestore) {
          // Don't overwrite an already-active entry (e.g. live tool-call
          // observed before this restore snapshot landed). Restore can
          // only seed entries the runtime has never seen.
          if (!existing?.controller) {
            this._entries.set(content.toolCallId, {
              toolName: content.toolName,
              argsText: content.argsText,
              hasResult: content.result !== undefined,
            });
          }
          if (content.messages) this._processMessages(content.messages);
          continue;
        }

        // Live snapshot.
        let entry = existing;

        if (entry && !entry.controller) {
          // Restored entry observed in a live snapshot. Promote if its
          // signature has changed; otherwise treat as still-historical.
          const signatureChanged =
            content.argsText !== entry.argsText ||
            (content.result !== undefined) !== entry.hasResult;
          if (!signatureChanged) {
            if (content.messages) this._processMessages(content.messages);
            continue;
          }
          this._entries.delete(content.toolCallId);
          entry = undefined;
        }

        if (!entry) {
          entry = this._startActiveEntry(
            content.toolCallId,
            content.toolName,
            content.result !== undefined,
          );
        }

        this._processArgsText(entry, content);

        if (content.result !== undefined && !entry.hasResult) {
          // `entry` is in active phase from this point — either just
          // created by `_startActiveEntry`, or pre-existing with a live
          // controller. Narrow once instead of asserting at every use.
          const { controller: activeController } = entry;
          if (!activeController) continue;
          entry.hasResult = true;
          entry.argsComplete = true;
          activeController.setResponse(
            new ToolResponse({
              result: content.result as ReadonlyJSONValue,
              artifact: content.artifact as ReadonlyJSONValue | undefined,
              isError: content.isError,
              ...(content.modelContent !== undefined
                ? { modelContent: content.modelContent }
                : {}),
            }),
          );
          activeController.close();
        }

        if (content.messages) this._processMessages(content.messages);
      }
    }
  }
}
