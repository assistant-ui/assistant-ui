declare const process: { env: { NODE_ENV?: string } };

import { useEffect, useRef, useState } from "react";
import {
  createAssistantStreamController,
  type ToolCallStreamController,
  ToolResponse,
  unstable_toolResultStream,
  type Tool,
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

export type ToolExecutionStatus =
  | { type: "executing" }
  | { type: "interrupt"; payload: { type: "human"; payload: unknown } };

type ToolState = {
  argsText: string;
  hasResult: boolean;
  argsComplete: boolean;
  streamToolCallId: string;
  controller: ToolCallStreamController;
};

export function useToolInvocations({
  state,
  getTools,
  onResult,
  setToolStatuses,
}: UseToolInvocationsParams) {
  const lastToolStates = useRef<Record<string, ToolState>>({});

  const humanInputRef = useRef<
    Map<
      string,
      {
        resolve: (payload: unknown) => void;
        reject: (reason: unknown) => void;
      }
    >
  >(new Map());

  const acRef = useRef<AbortController>(new AbortController());
  const executingCountRef = useRef(0);
  const startedExecutionToolCallIdsRef = useRef<Set<string>>(new Set());
  const settledResolversRef = useRef<Array<() => void>>([]);
  const toolCallIdAliasesRef = useRef<Map<string, string>>(new Map());
  const ignoredResultToolCallIdsRef = useRef<Set<string>>(new Set());
  const rewriteCounterRef = useRef(0);

  const getLogicalToolCallId = (toolCallId: string) => {
    return toolCallIdAliasesRef.current.get(toolCallId) ?? toolCallId;
  };

  const shouldIgnoreAndCleanupResult = (toolCallId: string) => {
    if (!ignoredResultToolCallIdsRef.current.has(toolCallId)) return false;
    ignoredResultToolCallIdsRef.current.delete(toolCallId);
    toolCallIdAliasesRef.current.delete(toolCallId);
    return true;
  };

  const getWrappedTools = () => {
    const tools = getTools();
    if (!tools) return undefined;

    return Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => {
        const execute = tool.execute;
        const streamCall = tool.streamCall;

        const wrappedTool = {
          ...tool,
          ...(execute !== undefined && {
            execute: (
              ...[args, context]: Parameters<NonNullable<typeof execute>>
            ) =>
              execute(args, {
                ...context,
                toolCallId: getLogicalToolCallId(context.toolCallId),
              }),
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
        } as Tool;
        return [name, wrappedTool];
      }),
    ) as Record<string, Tool>;
  };

  const [controller] = useState(() => {
    const [stream, controller] = createAssistantStreamController();
    const transform = unstable_toolResultStream(
      getWrappedTools,
      () => acRef.current?.signal ?? new AbortController().signal,
      (toolCallId: string, payload: unknown) => {
        const logicalToolCallId = getLogicalToolCallId(toolCallId);
        return new Promise<unknown>((resolve, reject) => {
          // Reject previous human input request if it exists
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
        onExecutionStart: (toolCallId: string) => {
          if (ignoredResultToolCallIdsRef.current.has(toolCallId)) {
            return;
          }
          startedExecutionToolCallIdsRef.current.add(toolCallId);
          const logicalToolCallId = getLogicalToolCallId(toolCallId);
          executingCountRef.current++;
          setToolStatuses((prev) => ({
            ...prev,
            [logicalToolCallId]: { type: "executing" },
          }));
        },
        onExecutionEnd: (toolCallId: string) => {
          const wasStarted =
            startedExecutionToolCallIdsRef.current.delete(toolCallId);
          if (ignoredResultToolCallIdsRef.current.has(toolCallId)) {
            if (wasStarted) {
              executingCountRef.current--;
              if (executingCountRef.current === 0) {
                // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally has no return
                settledResolversRef.current.forEach((resolve) => resolve());
                settledResolversRef.current = [];
              }
            }
            return;
          }
          if (!wasStarted) {
            return;
          }
          const logicalToolCallId = getLogicalToolCallId(toolCallId);
          executingCountRef.current--;
          setToolStatuses((prev) => {
            const next = { ...prev };
            delete next[logicalToolCallId];
            return next;
          });
          // Resolve any waiting abort promises when all tools have settled
          if (executingCountRef.current === 0) {
            // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally has no return
            settledResolversRef.current.forEach((resolve) => resolve());
            settledResolversRef.current = [];
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
            if (chunk.type === "result") {
              if (shouldIgnoreAndCleanupResult(chunk.meta.toolCallId)) {
                return;
              }

              const logicalToolCallId = getLogicalToolCallId(
                chunk.meta.toolCallId,
              );
              if (logicalToolCallId !== chunk.meta.toolCallId) {
                toolCallIdAliasesRef.current.delete(chunk.meta.toolCallId);
              }
              // the tool call result was already set by the backend
              if (lastToolStates.current[logicalToolCallId]?.hasResult) return;

              onResult({
                type: "add-tool-result",
                toolCallId: logicalToolCallId,
                toolName: chunk.meta.toolName,
                result: chunk.result,
                isError: chunk.isError,
                ...(chunk.artifact && { artifact: chunk.artifact }),
              });
            }
          },
        }),
      );

    return controller;
  });

  const ignoredToolIds = useRef<Set<string>>(new Set());
  const isInitialState = useRef(true);

  useEffect(() => {
    const createToolState = ({
      controller,
      streamToolCallId,
    }: {
      controller: ToolCallStreamController;
      streamToolCallId: string;
    }): ToolState => ({
      argsText: "",
      hasResult: false,
      argsComplete: false,
      streamToolCallId,
      controller,
    });

    const setToolState = (toolCallId: string, state: ToolState) => {
      lastToolStates.current[toolCallId] = state;
      return state;
    };

    const patchToolState = (
      toolCallId: string,
      state: ToolState,
      patch: Partial<ToolState>,
    ) => {
      return setToolState(toolCallId, { ...state, ...patch });
    };

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
        // Non-executable tools can emit parseable snapshots mid-stream.
        // Wait until the run settles before closing the args stream.
        return !state.isRunning && isArgsTextComplete(argsText);
      }
      return isArgsTextComplete(argsText);
    };

    const restartToolArgsStream = ({
      toolCallId,
      toolName,
      state,
    }: {
      toolCallId: string;
      toolName: string;
      state: ToolState;
    }) => {
      ignoredResultToolCallIdsRef.current.add(state.streamToolCallId);
      state.controller.argsText.close();

      const streamToolCallId = `${toolCallId}:rewrite:${rewriteCounterRef.current++}`;
      toolCallIdAliasesRef.current.set(streamToolCallId, toolCallId);
      const toolCallController = controller.addToolCallPart({
        toolName,
        toolCallId: streamToolCallId,
      });

      if (process.env.NODE_ENV !== "production") {
        console.warn("started replacement stream tool call", {
          toolCallId,
          streamToolCallId,
        });
      }

      return setToolState(toolCallId, {
        ...createToolState({
          controller: toolCallController,
          streamToolCallId,
        }),
        hasResult: state.hasResult,
      });
    };

    const processMessages = (
      messages: readonly (typeof state.messages)[number][],
    ) => {
      messages.forEach((message) => {
        message.content.forEach((content) => {
          if (content.type === "tool-call") {
            if (isInitialState.current) {
              ignoredToolIds.current.add(content.toolCallId);
            } else {
              if (ignoredToolIds.current.has(content.toolCallId)) {
                return;
              }
              let lastState = lastToolStates.current[content.toolCallId];
              if (!lastState) {
                if (content.result !== undefined) {
                  if (content.messages) {
                    processMessages(content.messages);
                  }
                  return;
                }

                toolCallIdAliasesRef.current.set(
                  content.toolCallId,
                  content.toolCallId,
                );
                const toolCallController = controller.addToolCallPart({
                  toolName: content.toolName,
                  toolCallId: content.toolCallId,
                });
                lastState = setToolState(
                  content.toolCallId,
                  createToolState({
                    controller: toolCallController,
                    streamToolCallId: content.toolCallId,
                  }),
                );
              }

              if (content.argsText !== lastState.argsText) {
                let shouldWriteArgsText = true;

                if (lastState.argsComplete) {
                  if (
                    isEquivalentCompleteArgsText(
                      lastState.argsText,
                      content.argsText,
                    )
                  ) {
                    lastState = patchToolState(content.toolCallId, lastState, {
                      argsText: content.argsText,
                    });
                    shouldWriteArgsText = false;
                  }

                  if (shouldWriteArgsText) {
                    const canRestartClosedArgsStream =
                      !lastState.hasResult &&
                      !startedExecutionToolCallIdsRef.current.has(
                        lastState.streamToolCallId,
                      );

                    if (process.env.NODE_ENV !== "production") {
                      console.warn(
                        canRestartClosedArgsStream
                          ? "argsText updated after controller was closed, restarting tool args stream:"
                          : "argsText updated after controller was closed:",
                        {
                          previous: lastState.argsText,
                          next: content.argsText,
                        },
                      );
                    }

                    if (!canRestartClosedArgsStream) {
                      lastState = patchToolState(
                        content.toolCallId,
                        lastState,
                        {
                          argsText: content.argsText,
                        },
                      );
                      shouldWriteArgsText = false;
                    }
                  }

                  if (shouldWriteArgsText) {
                    lastState = restartToolArgsStream({
                      toolCallId: content.toolCallId,
                      toolName: content.toolName,
                      state: lastState,
                    });
                  }
                } else if (!content.argsText.startsWith(lastState.argsText)) {
                  // Check if this is key reordering (both are complete JSON)
                  // This happens when transitioning from streaming to complete state
                  // and the provider returns keys in a different order
                  if (
                    isArgsTextComplete(lastState.argsText) &&
                    isArgsTextComplete(content.argsText) &&
                    isEquivalentCompleteArgsText(
                      lastState.argsText,
                      content.argsText,
                    )
                  ) {
                    const shouldClose = shouldCloseArgsStream({
                      toolName: content.toolName,
                      argsText: content.argsText,
                      hasResult: content.result !== undefined,
                    });
                    if (shouldClose) {
                      lastState.controller.argsText.close();
                    }
                    lastState = patchToolState(content.toolCallId, lastState, {
                      argsText: content.argsText,
                      argsComplete: shouldClose,
                    });
                    shouldWriteArgsText = false;
                  }
                  if (shouldWriteArgsText) {
                    if (process.env.NODE_ENV !== "production") {
                      console.warn(
                        "argsText rewrote previous snapshot, restarting tool args stream:",
                        {
                          previous: lastState.argsText,
                          next: content.argsText,
                          toolCallId: content.toolCallId,
                        },
                      );
                    }
                    lastState = restartToolArgsStream({
                      toolCallId: content.toolCallId,
                      toolName: content.toolName,
                      state: lastState,
                    });
                  }
                }

                if (shouldWriteArgsText) {
                  const argsTextDelta = content.argsText.slice(
                    lastState.argsText.length,
                  );
                  lastState.controller.argsText.append(argsTextDelta);

                  const shouldClose = shouldCloseArgsStream({
                    toolName: content.toolName,
                    argsText: content.argsText,
                    hasResult: content.result !== undefined,
                  });
                  if (shouldClose) {
                    lastState.controller.argsText.close();
                  }

                  lastState = patchToolState(content.toolCallId, lastState, {
                    argsText: content.argsText,
                    argsComplete: shouldClose,
                  });
                }
              }

              if (!lastState.argsComplete) {
                const shouldClose = shouldCloseArgsStream({
                  toolName: content.toolName,
                  argsText: content.argsText,
                  hasResult: content.result !== undefined,
                });
                if (shouldClose) {
                  lastState.controller.argsText.close();
                  lastState = patchToolState(content.toolCallId, lastState, {
                    argsText: content.argsText,
                    argsComplete: true,
                  });
                }
              }

              if (content.result !== undefined && !lastState.hasResult) {
                patchToolState(content.toolCallId, lastState, {
                  hasResult: true,
                  argsComplete: true,
                });

                lastState.controller.setResponse(
                  new ToolResponse({
                    result: content.result as ReadonlyJSONValue,
                    artifact: content.artifact as ReadonlyJSONValue | undefined,
                    isError: content.isError,
                  }),
                );
                lastState.controller.close();
              }
            }

            // Recursively process nested messages
            if (content.messages) {
              processMessages(content.messages);
            }
          }
        });
      });
    };

    processMessages(state.messages);

    if (isInitialState.current) {
      isInitialState.current = false;
    }
  }, [state, controller, getTools]);

  const abort = (): Promise<void> => {
    humanInputRef.current.forEach(({ reject }) => {
      reject(new Error("Tool execution aborted"));
    });
    humanInputRef.current.clear();

    acRef.current.abort();
    acRef.current = new AbortController();

    // Return a promise that resolves when all executing tools have settled
    if (executingCountRef.current === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      settledResolversRef.current.push(resolve);
    });
  };

  return {
    reset: () => {
      isInitialState.current = true;
      ignoredToolIds.current.clear();
      lastToolStates.current = {};
      void abort().finally(() => {
        startedExecutionToolCallIdsRef.current.clear();
        toolCallIdAliasesRef.current.clear();
        ignoredResultToolCallIdsRef.current.clear();
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
