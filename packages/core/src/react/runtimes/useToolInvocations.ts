declare const process: { env: { NODE_ENV?: string } };

import { useEffect, useRef, useState } from "react";
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

export type AssistantTransportState = {
  readonly messages: readonly ThreadMessage[];
  readonly state?: ReadonlyJSONValue;
  readonly isRunning: boolean;
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

type UseToolInvocationsParams = {
  state: AssistantTransportState;
  getTools: () => Record<string, Tool> | undefined;
  onResult: (command: AddToolResultCommand) => void;
  setToolStatuses: (
    updater:
      | Record<string, ToolExecutionStatus>
      | ((
          prev: Record<string, ToolExecutionStatus>,
        ) => Record<string, ToolExecutionStatus>),
  ) => void;
};

/**
 * Streaming execution state for a frontend tool.
 *
 * Custom runtime integrations use this to mirror in-flight tool calls while
 * `useToolInvocations` executes tools in the browser.
 */
export type ToolExecutionStatus =
  | {
      /** The tool's execute function is currently running. */
      type: "executing";
    }
  | {
      /** The tool is waiting for a human input payload before continuing. */
      type: "interrupt";
      /** Human input request emitted by the tool execution context. */
      payload: { type: "human"; payload: unknown };
    };

/**
 * Per-logical-tool-call state. A single discriminator distinguishes restored
 * snapshots (no controller; only used for signature comparison) from active
 * snapshots that are being streamed through the assistant-stream pipeline.
 */
type ToolCallEntry = {
  toolName: string;
  /** Last observed `argsText` for this tool call. */
  argsText: string;
  /** Last observed `result !== undefined` for this tool call. */
  hasResult: boolean;
} & (
  | {
      /** Restored phase — observed during a history-load snapshot. */
      controller?: undefined;
      streamId?: undefined;
      argsComplete?: undefined;
    }
  | {
      /** Active phase — chunks are flowing through `controller`. */
      controller: ToolCallStreamController;
      /** Current physical stream id (differs from logical id after a rewrite). */
      streamId: string;
      argsComplete: boolean;
    }
);

/**
 * Per-physical-stream-id execution lifecycle bookkeeping. Tracked separately
 * from `ToolCallEntry` so that `reset()` can clear tool-call state
 * synchronously while in-flight executions still find their cleanup info via
 * `onExecutionEnd` after `abort()` settles.
 */
type ExecutingStream = {
  logicalToolCallId: string;
  abandoned: boolean;
};

export function useToolInvocations({
  state,
  getTools,
  onResult,
  setToolStatuses,
}: UseToolInvocationsParams) {
  /**
   * Single source of truth for per-tool-call lifecycle. Keyed by *logical*
   * toolCallId (the id the host knows). Restored entries have no controller;
   * active entries carry their stream id and rewrite/execution bookkeeping.
   */
  const entriesRef = useRef<Map<string, ToolCallEntry>>(new Map());

  /**
   * Reverse alias map populated only when a rewrite assigns a synthetic stream
   * id to an entry. Identity mappings are implicit via the fallback in
   * `getLogicalToolCallId`.
   */
  const streamToLogicalRef = useRef<Map<string, string>>(new Map());

  /**
   * Stream ids whose `result` chunks must be dropped before reaching `onResult`.
   * Populated when:
   *   - an argsText rewrite supersedes a stream (the old stream's result, if
   *     any, is no longer authoritative)
   *   - `reset()` is called while a pre-resolved tool call has a never-settling
   *     Promise pending in the executor — the eventual cancellation chunk
   *     would otherwise be forwarded to a host that has already moved on.
   */
  const abandonedStreamIdsRef = useRef<Set<string>>(new Set());

  /**
   * Stream ids whose `execute` should be short-circuited in the tool wrapper.
   * Tracked by physical stream id (not logical id) so cleanup is keyed off
   * the same id the wrapper sees in its context.
   */
  const skipExecuteStreamIdsRef = useRef<Set<string>>(new Set());

  const humanInputRef = useRef<
    Map<
      string,
      {
        resolve: (payload: unknown) => void;
        reject: (reason: unknown) => void;
      }
    >
  >(new Map());

  /**
   * In-flight `execute` invocations keyed by physical stream id. Lives outside
   * `entriesRef` so `reset()` can drop tool-call state without orphaning the
   * cleanup the cancellation `onExecutionEnd` still needs.
   */
  const executingRef = useRef<Map<string, ExecutingStream>>(new Map());

  const acRef = useRef<AbortController>(new AbortController());
  const executingCountRef = useRef(0);
  const settledResolversRef = useRef<Array<() => void>>([]);
  const rewriteCounterRef = useRef(0);

  /**
   * `true` until the first snapshot has been processed; `reset()` flips it
   * back to `true`. Snapshots observed while this is `true` are treated as
   * historical: their tool calls are recorded in `entriesRef` as restored
   * but no streamCall/execute fires. The next snapshot is processed as live.
   */
  const pendingRestoreRef = useRef(true);

  const getLogicalToolCallId = (streamId: string) =>
    streamToLogicalRef.current.get(streamId) ?? streamId;

  const getWrappedTools = () => {
    const tools = getTools();
    if (!tools) return undefined;

    return Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => {
        const execute = tool.execute;
        const streamCall = tool.streamCall;
        const toModelOutput = tool.toModelOutput;

        const wrappedTool = {
          ...tool,
          ...(execute !== undefined && {
            execute: (
              ...[args, context]: Parameters<NonNullable<typeof execute>>
            ) => {
              if (skipExecuteStreamIdsRef.current.has(context.toolCallId)) {
                // Pre-resolved on first live observation: never invoke the
                // host's execute fn. Returning a never-settling Promise keeps
                // the executor's pending entry alive but enqueues nothing.
                // The membership in skipExecuteStreamIdsRef must outlive the
                // wrapper call so `reset()`'s seeding loop (which reads this
                // Set to identify pre-resolved entries needing cancellation
                // suppression) sees the entry. Growth is bounded by the
                // number of pre-resolved tool calls observed in the session.
                return new Promise(() => {}) as never;
              }
              return execute(args, {
                ...context,
                toolCallId: getLogicalToolCallId(context.toolCallId),
              });
            },
          }),
          ...(streamCall !== undefined && {
            streamCall: (
              ...[reader, context]: Parameters<NonNullable<typeof streamCall>>
            ) =>
              streamCall(reader, {
                ...context,
                toolCallId: getLogicalToolCallId(context.toolCallId),
              }),
          }),
          ...(toModelOutput !== undefined && {
            toModelOutput: (
              options: Parameters<NonNullable<typeof toModelOutput>>[0],
            ) =>
              toModelOutput({
                ...options,
                toolCallId: getLogicalToolCallId(options.toolCallId),
              }),
          }),
        } as Tool;
        return [name, wrappedTool];
      }),
    ) as Record<string, Tool>;
  };

  const resolveAllSettledResolvers = () => {
    const resolvers = settledResolversRef.current;
    settledResolversRef.current = [];
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally has no return
    resolvers.forEach((resolve) => resolve());
  };

  const [controller] = useState(() => {
    const [stream, controller] = createAssistantStreamController();
    const transform = unstable_toolResultStream(
      getWrappedTools,
      () => acRef.current?.signal ?? new AbortController().signal,
      (toolCallId: string, payload: unknown) => {
        const logicalToolCallId = getLogicalToolCallId(toolCallId);
        return new Promise<unknown>((resolve, reject) => {
          const previous = humanInputRef.current.get(logicalToolCallId);
          if (previous) {
            previous.reject(
              new Error("Human input request was superseded by a new request"),
            );
          }
          humanInputRef.current.set(logicalToolCallId, { resolve, reject });
          setToolStatuses((prev) => ({
            ...prev,
            [logicalToolCallId]: {
              type: "interrupt",
              payload: { type: "human", payload },
            },
          }));
        });
      },
      {
        onExecutionStart: (streamId: string) => {
          if (skipExecuteStreamIdsRef.current.has(streamId)) return;

          const logicalToolCallId = getLogicalToolCallId(streamId);
          const abandoned = abandonedStreamIdsRef.current.has(streamId);
          executingRef.current.set(streamId, {
            logicalToolCallId,
            abandoned,
          });
          executingCountRef.current++;
          if (!abandoned) {
            setToolStatuses((prev) => ({
              ...prev,
              [logicalToolCallId]: { type: "executing" },
            }));
          }
        },
        onExecutionEnd: (streamId: string) => {
          const info = executingRef.current.get(streamId);
          if (!info) return;
          executingRef.current.delete(streamId);

          executingCountRef.current--;
          if (!info.abandoned) {
            setToolStatuses((prev) => {
              const next = { ...prev };
              delete next[info.logicalToolCallId];
              return next;
            });
          }
          if (executingCountRef.current === 0) {
            resolveAllSettledResolvers();
          }
        },
      },
    );

    stream
      .pipeThrough(transform)
      .pipeThrough(new AssistantMetaTransformStream())
      .pipeTo(
        new WritableStream({
          write(chunk) {
            if (chunk.type !== "result") return;

            const streamId = chunk.meta.toolCallId;
            const logicalToolCallId = getLogicalToolCallId(streamId);
            const entry = entriesRef.current.get(logicalToolCallId);

            // Result chunk from an abandoned stream (rewrite supersession or
            // pre-resolved stream cancelled by `reset()`/abort): drop it and
            // clean up the alias.
            if (abandonedStreamIdsRef.current.delete(streamId)) {
              streamToLogicalRef.current.delete(streamId);
              return;
            }

            // The host already set the result (via the live snapshot's
            // `setResponse` path). Suppress the executor's redundant emit.
            if (entry?.hasResult) return;

            if (streamId !== logicalToolCallId) {
              streamToLogicalRef.current.delete(streamId);
            }

            onResult({
              type: "add-tool-result",
              toolCallId: logicalToolCallId,
              toolName: chunk.meta.toolName,
              result: chunk.result,
              isError: chunk.isError,
              ...(chunk.artifact !== undefined && {
                artifact: chunk.artifact,
              }),
              ...(chunk.modelContent !== undefined && {
                modelContent: chunk.modelContent,
              }),
            });
          },
        }),
      );

    return controller;
  });

  useEffect(() => {
    const hasExecutableTool = (toolName: string) => {
      const tool = getTools()?.[toolName];
      return tool?.execute !== undefined || tool?.streamCall !== undefined;
    };

    const shouldCloseArgsStream = ({
      toolName,
      argsText,
      hasResult,
    }: {
      toolName: string;
      argsText: string;
      hasResult: boolean;
    }) => {
      if (hasResult) return true;
      if (!hasExecutableTool(toolName)) {
        // Non-executable tools can emit parseable JSON mid-stream; wait for
        // the run to settle before closing.
        return !state.isRunning && isArgsTextComplete(argsText);
      }
      return isArgsTextComplete(argsText);
    };

    const startActiveEntry = (
      toolCallId: string,
      toolName: string,
      skipExecute: boolean,
    ): ToolCallEntry => {
      const toolCallController = controller.addToolCallPart({
        toolName,
        toolCallId,
      });
      if (skipExecute) {
        skipExecuteStreamIdsRef.current.add(toolCallId);
      }
      const entry: ToolCallEntry = {
        toolName,
        controller: toolCallController,
        streamId: toolCallId,
        argsText: "",
        hasResult: false,
        argsComplete: false,
      };
      entriesRef.current.set(toolCallId, entry);
      return entry;
    };

    const restartArgsStream = (entry: ToolCallEntry, toolCallId: string) => {
      if (!entry.controller) return;
      abandonedStreamIdsRef.current.add(entry.streamId);
      // The wrapper's execute short-circuit follows the current stream id;
      // the abandoned id stays in `skipExecuteStreamIdsRef` if it was there,
      // which is harmless and keeps in-flight chunks consistent.
      const wasSkipExecute = skipExecuteStreamIdsRef.current.has(
        entry.streamId,
      );
      entry.controller.argsText.close();

      const newStreamId = `${toolCallId}:rewrite:${rewriteCounterRef.current++}`;
      streamToLogicalRef.current.set(newStreamId, toolCallId);
      const newController = controller.addToolCallPart({
        toolName: entry.toolName,
        toolCallId: newStreamId,
      });
      if (wasSkipExecute) {
        skipExecuteStreamIdsRef.current.add(newStreamId);
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("started replacement stream tool call", {
          toolCallId,
          streamToolCallId: newStreamId,
        });
      }

      entry.controller = newController;
      entry.streamId = newStreamId;
      entry.argsText = "";
      entry.argsComplete = false;
    };

    const processArgsText = (
      entry: ToolCallEntry,
      content: {
        toolCallId: string;
        toolName: string;
        argsText: string;
        result?: unknown;
      },
    ) => {
      if (!entry.controller) return;
      const hasResult = content.result !== undefined;

      if (content.argsText !== entry.argsText) {
        let shouldWriteArgsText = true;

        if (entry.argsComplete) {
          if (isEquivalentCompleteArgsText(entry.argsText, content.argsText)) {
            entry.argsText = content.argsText;
            shouldWriteArgsText = false;
          } else {
            const canRestart =
              !entry.hasResult && !executingRef.current.has(entry.streamId);
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                canRestart
                  ? "argsText updated after controller was closed, restarting tool args stream:"
                  : "argsText updated after controller was closed:",
                { previous: entry.argsText, next: content.argsText },
              );
            }
            if (!canRestart) {
              entry.argsText = content.argsText;
              shouldWriteArgsText = false;
            } else {
              restartArgsStream(entry, content.toolCallId);
            }
          }
        } else if (!content.argsText.startsWith(entry.argsText)) {
          // Mid-stream rewrite. If both texts parse to equivalent JSON it's a
          // key-reorder snapshot — accept silently. Otherwise restart.
          if (
            isArgsTextComplete(entry.argsText) &&
            isArgsTextComplete(content.argsText) &&
            isEquivalentCompleteArgsText(entry.argsText, content.argsText)
          ) {
            const shouldClose = shouldCloseArgsStream({
              toolName: content.toolName,
              argsText: content.argsText,
              hasResult,
            });
            if (shouldClose) entry.controller.argsText.close();
            entry.argsText = content.argsText;
            entry.argsComplete = shouldClose;
            shouldWriteArgsText = false;
          } else {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "argsText rewrote previous snapshot, restarting tool args stream:",
                {
                  previous: entry.argsText,
                  next: content.argsText,
                  toolCallId: content.toolCallId,
                },
              );
            }
            restartArgsStream(entry, content.toolCallId);
          }
        }

        if (shouldWriteArgsText) {
          const delta = content.argsText.slice(entry.argsText.length);
          entry.controller.argsText.append(delta);
          const shouldClose = shouldCloseArgsStream({
            toolName: content.toolName,
            argsText: content.argsText,
            hasResult,
          });
          if (shouldClose) entry.controller.argsText.close();
          entry.argsText = content.argsText;
          entry.argsComplete = shouldClose;
        }
      }

      if (!entry.argsComplete) {
        const shouldClose = shouldCloseArgsStream({
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
    };

    const processMessages = (
      messages: readonly (typeof state.messages)[number][],
    ) => {
      const isRestore = pendingRestoreRef.current;

      messages.forEach((message) => {
        message.content.forEach((content) => {
          if (content.type !== "tool-call") return;

          const existing = entriesRef.current.get(content.toolCallId);

          if (isRestore) {
            // Don't overwrite an already-active entry (e.g. live tool-call
            // observed before this restore snapshot landed). Restore can only
            // seed entries the runtime has never seen.
            if (!existing?.controller) {
              entriesRef.current.set(content.toolCallId, {
                toolName: content.toolName,
                argsText: content.argsText,
                hasResult: content.result !== undefined,
              });
            }
            if (content.messages) processMessages(content.messages);
            return;
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
              if (content.messages) processMessages(content.messages);
              return;
            }
            entriesRef.current.delete(content.toolCallId);
            entry = undefined;
          }

          if (!entry) {
            entry = startActiveEntry(
              content.toolCallId,
              content.toolName,
              content.result !== undefined,
            );
          }

          processArgsText(entry, content);

          if (content.result !== undefined && !entry.hasResult) {
            entry.hasResult = true;
            entry.argsComplete = true;
            entry.controller!.setResponse(
              new ToolResponse({
                result: content.result as ReadonlyJSONValue,
                artifact: content.artifact as ReadonlyJSONValue | undefined,
                isError: content.isError,
                ...(content.modelContent !== undefined
                  ? { modelContent: content.modelContent }
                  : {}),
              }),
            );
            entry.controller!.close();
          }

          if (content.messages) processMessages(content.messages);
        });
      });
    };

    processMessages(state.messages);

    pendingRestoreRef.current = false;
  }, [state, controller, getTools]);

  const abort = (): Promise<void> => {
    humanInputRef.current.forEach(({ reject }) => {
      reject(new Error("Tool execution aborted"));
    });
    humanInputRef.current.clear();

    acRef.current.abort();
    acRef.current = new AbortController();

    if (executingCountRef.current === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      settledResolversRef.current.push(resolve);
    });
  };

  return {
    reset: () => {
      pendingRestoreRef.current = true;
      // Pre-resolved tool calls have a never-settling Promise in the
      // executor's `toolCallPromises`. When `abort()` fires, the executor
      // races the abort signal and enqueues a cancellation `result` chunk.
      // Mark those streams abandoned so the chunk is dropped before reaching
      // `onResult` — the host has already moved on. Non-pre-resolved streams
      // still surface their cancellation through `onResult` (existing
      // contract).
      for (const entry of entriesRef.current.values()) {
        if (!entry.controller) continue;
        if (skipExecuteStreamIdsRef.current.has(entry.streamId)) {
          abandonedStreamIdsRef.current.add(entry.streamId);
        }
      }
      entriesRef.current.clear();
      // `abandonedStreamIdsRef` is not cleared here — the consumer deletes
      // each id as it processes the corresponding result chunk.
      // `skipExecuteStreamIdsRef` is also not cleared: it has to outlive
      // `reset()` so any wrapper call still inbound through the stream
      // pipeline continues to short-circuit `execute`. Membership grows by
      // one per pre-resolved tool call observed in the session.
      void abort().finally(() => {
        executingRef.current.clear();
        streamToLogicalRef.current.clear();
        rewriteCounterRef.current = 0;
      });
    },
    abort,
    resume: (toolCallId: string, payload: unknown) => {
      const handlers = humanInputRef.current.get(toolCallId);
      if (handlers) {
        humanInputRef.current.delete(toolCallId);
        setToolStatuses((prev) => ({
          ...prev,
          [toolCallId]: { type: "executing" },
        }));
        handlers.resolve(payload);
      } else {
        throw new Error(
          `Tool call ${toolCallId} is not waiting for human input`,
        );
      }
    },
  };
}
