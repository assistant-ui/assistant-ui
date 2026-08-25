declare const process: { env: { NODE_ENV?: string } };

import {
  createAssistantStreamController,
  type ToolCallStreamController,
  ToolResponse,
  unstable_toolResultStream,
  type Tool,
  type ToolModelContentPart,
  type ToolResultStreamOptions,
} from "assistant-stream";
import {
  AssistantMetaTransformStream,
  type ReadonlyJSONValue,
} from "assistant-stream/utils";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";
import type { ThreadMessage } from "../../types/message";

const TOOL_EXECUTION_ID = Symbol.for("assistant-stream.tool-execution-id");

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

type ToolCallEntry = {
  toolName: string;
  argsText: string;
  hasResult: boolean;
  executionId?: symbol;
  skipExecute?: boolean;
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

type SettledResolver = {
  executionIds: ReadonlySet<symbol>;
  resolve: () => void;
};

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

const getToolExecutionId = (value: object): symbol | undefined =>
  (value as Record<PropertyKey, unknown>)[TOOL_EXECUTION_ID] as
    | symbol
    | undefined;

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
 *
 * @deprecated Internal — for framework bindings; not a public API. May change without notice.
 */
export class ToolInvocationTracker {
  private readonly _getTools: () => Record<string, Tool> | undefined;
  private readonly _callbacks: ToolInvocationTracker.Callbacks;

  private readonly _entries = new Map<string, ToolCallEntry>();
  private readonly _humanInput = new Map<
    string,
    {
      executionId: symbol;
      resolve: (payload: unknown) => void;
      reject: (reason: unknown) => void;
    }
  >();
  private readonly _executing = new Set<symbol>();
  private readonly _settledResolvers: SettledResolver[] = [];

  private _statuses = new Map<string, ToolExecutionStatus>();

  private _ac: AbortController = new AbortController();
  private _pendingRestore = true;

  /** Cached last snapshot, used to skip processing on identical re-renders. */
  private _lastSnapshot: ToolInvocationTracker.Snapshot | null = null;
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
    callbacks: ToolInvocationTracker.Callbacks,
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

    const human = (
      toolCallId: string,
      payload: unknown,
      executionId?: symbol,
    ) => this._onHumanInput(toolCallId, payload, executionId);
    const transform = unstable_toolResultStream(
      () => this._getWrappedTools(),
      () => this._ac.signal,
      human,
      {
        onExecutionStart: (id: string, _name: string, executionId?: symbol) =>
          this._onExecutionStart(id, executionId),
        onExecutionEnd: (id: string, _name: string, executionId?: symbol) =>
          this._onExecutionEnd(id, executionId),
      } as ToolResultStreamOptions,
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
  public setState(snapshot: ToolInvocationTracker.Snapshot): void {
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
      void this.abort();
      // Statuses are cleared synchronously: discarded executions may never
      // settle (aborting hands the signal to the tool, it does not force
      // settlement), and a late settlement of one sibling must not republish
      // the others. `_deleteStatus` no-ops for cleared ids, so post-reset
      // settlements stay silent.
      if (this._statuses.size > 0) {
        this._statuses = new Map();
        this._invokeOnStatusesChange();
      }
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
      const executionIds = new Set(this._executing);
      return new Promise<void>((resolve) => {
        this._settledResolvers.push({ executionIds, resolve });
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
        const streamCall = tool.streamCall;
        if (execute === undefined && streamCall === undefined)
          return [name, tool];

        const wrappedTool = {
          ...tool,
          ...(execute !== undefined && {
            execute: (...[args, context]: Parameters<typeof execute>) => {
              const executionId = getToolExecutionId(context);
              const entry = this._captureExecution(
                context.toolCallId,
                executionId,
              );
              if (!entry || entry.skipExecute) {
                return new Promise(() => {}) as never;
              }
              return execute(args, context);
            },
          }),
          ...(streamCall !== undefined && {
            streamCall: (
              ...[reader, context]: Parameters<typeof streamCall>
            ) => {
              const executionId = getToolExecutionId(context);
              const entry = this._captureExecution(
                context.toolCallId,
                executionId,
              );
              if (!entry) return;
              return streamCall(reader, context);
            },
          }),
        } as Tool;
        return [name, wrappedTool];
      }),
    ) as Record<string, Tool>;
  }

  private _captureExecution(
    toolCallId: string,
    executionId: symbol | undefined,
  ): ToolCallEntry | undefined {
    if (executionId === undefined) return undefined;
    const entry = this._entries.get(toolCallId);
    if (!entry?.controller) return undefined;
    if (entry.executionId === undefined) entry.executionId = executionId;
    return entry.executionId === executionId ? entry : undefined;
  }

  // ──────────────── internal: execution lifecycle callbacks ────────────────

  private _onHumanInput(
    toolCallId: string,
    payload: unknown,
    executionId?: symbol,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      // A discarded execution must not resurrect a status entry or park an
      // unanswerable request after its id has been reused.
      const entry = this._entries.get(toolCallId);
      if (!entry?.controller || entry.executionId !== executionId) {
        reject(new Error("Tool execution aborted"));
        return;
      }
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
      this._humanInput.set(toolCallId, {
        executionId: executionId!,
        resolve,
        reject,
      });
      this._setStatus(toolCallId, {
        type: "interrupt",
        payload: { type: "human", payload },
      });
    });
  }

  private _onExecutionStart(
    toolCallId: string,
    executionId: symbol | undefined,
  ): void {
    if (!this._captureExecution(toolCallId, executionId)) return;
    const entry = this._entries.get(toolCallId)!;
    if (entry.skipExecute) return;

    this._executing.add(executionId!);
    this._setStatus(toolCallId, { type: "executing" });
  }

  private _onExecutionEnd(
    toolCallId: string,
    executionId: symbol | undefined,
  ): void {
    if (executionId === undefined || !this._executing.delete(executionId))
      return;

    const entry = this._entries.get(toolCallId);
    if (entry?.executionId === executionId) this._deleteStatus(toolCallId);

    const pending: SettledResolver[] = [];
    this._settledResolvers.forEach(({ executionIds, resolve }) => {
      if ([...executionIds].some((id) => this._executing.has(id))) {
        pending.push({ executionIds, resolve });
        return;
      }
      try {
        resolve();
      } catch {
        // ignore — settled-resolver consumer threw
      }
    });
    this._settledResolvers.length = 0;
    this._settledResolvers.push(...pending);
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
    const executionId = getToolExecutionId(chunk);
    const entry = this._entries.get(toolCallId);

    if (!entry || entry.executionId !== executionId) return;

    // The host already set the result (via the live snapshot's
    // `setResponse` path). Suppress the executor's redundant emit.
    if (entry?.hasResult) return;
    if (entry.skipExecute) return;

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
    const entry: ToolCallEntry = {
      toolName,
      controller: toolCallController,
      argsText: "",
      hasResult: false,
      skipExecute,
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
      // ToolExecutionStream parses the streamed prefix on close, so the close
      // gates on the streamed content; a divergent snapshot (A.2) can be
      // complete while the controller still holds an incomplete stale prefix.
      const shouldClose = this._shouldCloseArgsStream({
        toolName: content.toolName,
        argsText: entry.argsText,
        hasResult,
      });
      if (shouldClose) {
        entry.controller.argsText.close();
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

        if (content.approval !== undefined) entry.skipExecute = true;

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

export namespace ToolInvocationTracker {
  export type ExecutionStatus = ToolExecutionStatus;

  export type Snapshot = {
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

  export type Callbacks = {
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
}
