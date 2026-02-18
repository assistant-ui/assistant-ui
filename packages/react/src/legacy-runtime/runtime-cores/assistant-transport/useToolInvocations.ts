import { useEffect, useRef, useState } from "react";
import {
  createAssistantStreamController,
  type ToolCallStreamController,
  ToolResponse,
  unstable_toolResultStream,
  type Tool,
} from "assistant-stream";
import type {
  AssistantTransportCommand,
  AssistantTransportState,
} from "./types";
import {
  AssistantMetaTransformStream,
  type ReadonlyJSONValue,
} from "assistant-stream/utils";

const isArgsTextComplete = (argsText: string) => {
  try {
    JSON.parse(argsText);
    return true;
  } catch {
    return false;
  }
};

type UseToolInvocationsParams = {
  state: AssistantTransportState;
  getTools: () => Record<string, Tool> | undefined;
  onResult: (command: AssistantTransportCommand) => void;
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

export function useToolInvocations({
  state,
  getTools,
  onResult,
  setToolStatuses,
}: UseToolInvocationsParams) {
  const lastToolStates = useRef<
    Record<
      string,
      {
        argsText: string;
        hasResult: boolean;
        argsComplete: boolean;
        streamToolCallId: string;
        controller: ToolCallStreamController;
      }
    >
  >({});

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
  const settledResolversRef = useRef<Array<() => void>>([]);
  const toolCallIdAliasesRef = useRef<Map<string, string>>(new Map());
  const rewriteCounterRef = useRef(0);

  const getLogicalToolCallId = (toolCallId: string) => {
    return toolCallIdAliasesRef.current.get(toolCallId) ?? toolCallId;
  };

  const getWrappedTools = () => {
    const tools = getTools();
    if (!tools) return undefined;

    return Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => {
        const wrappedTool: Tool = {
          ...tool,
          ...(tool.execute && {
            execute: (args, context) =>
              tool.execute?.(args, {
                ...context,
                toolCallId: getLogicalToolCallId(context.toolCallId),
              }),
          }),
          ...(tool.streamCall && {
            streamCall: (reader, context) =>
              tool.streamCall?.(reader, {
                ...context,
                toolCallId: getLogicalToolCallId(context.toolCallId),
              }),
          }),
        };
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
          const logicalToolCallId = getLogicalToolCallId(toolCallId);
          executingCountRef.current++;
          setToolStatuses((prev) => ({
            ...prev,
            [logicalToolCallId]: { type: "executing" },
          }));
        },
        onExecutionEnd: (toolCallId: string) => {
          const logicalToolCallId = getLogicalToolCallId(toolCallId);
          executingCountRef.current--;
          setToolStatuses((prev) => {
            const next = { ...prev };
            delete next[logicalToolCallId];
            return next;
          });
          // Resolve any waiting abort promises when all tools have settled
          if (executingCountRef.current === 0) {
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
              const logicalToolCallId = getLogicalToolCallId(
                chunk.meta.toolCallId,
              );
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
                toolCallIdAliasesRef.current.set(
                  content.toolCallId,
                  content.toolCallId,
                );
                const toolCallController = controller.addToolCallPart({
                  toolName: content.toolName,
                  toolCallId: content.toolCallId,
                });
                lastState = {
                  argsText: "",
                  hasResult: false,
                  argsComplete: false,
                  streamToolCallId: content.toolCallId,
                  controller: toolCallController,
                };
                lastToolStates.current[content.toolCallId] = lastState;
              }

              if (content.argsText !== lastState.argsText) {
                if (lastState.argsComplete) {
                  if (process.env.NODE_ENV !== "production") {
                    console.warn(
                      "argsText updated after controller was closed:",
                      {
                        previous: lastState.argsText,
                        next: content.argsText,
                      },
                    );
                  }
                } else {
                  if (!content.argsText.startsWith(lastState.argsText)) {
                    // Check if this is key reordering (both are complete JSON)
                    // This happens when transitioning from streaming to complete state
                    // and the provider returns keys in a different order
                    if (
                      isArgsTextComplete(lastState.argsText) &&
                      isArgsTextComplete(content.argsText)
                    ) {
                      lastState.controller.argsText.close();
                      lastToolStates.current[content.toolCallId] = {
                        argsText: content.argsText,
                        hasResult: lastState.hasResult,
                        argsComplete: true,
                        streamToolCallId: lastState.streamToolCallId,
                        controller: lastState.controller,
                      };
                      return; // Continue to next content part
                    }
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

                    const streamToolCallId = `${content.toolCallId}:rewrite:${rewriteCounterRef.current++}`;
                    toolCallIdAliasesRef.current.set(
                      streamToolCallId,
                      content.toolCallId,
                    );
                    const toolCallController = controller.addToolCallPart({
                      toolName: content.toolName,
                      toolCallId: streamToolCallId,
                    });
                    if (process.env.NODE_ENV !== "production") {
                      console.warn("started replacement stream tool call", {
                        toolCallId: content.toolCallId,
                        streamToolCallId,
                      });
                    }
                    lastState = {
                      argsText: "",
                      hasResult: lastState.hasResult,
                      argsComplete: false,
                      streamToolCallId,
                      controller: toolCallController,
                    };
                    lastToolStates.current[content.toolCallId] = lastState;
                  }

                  const argsTextDelta = content.argsText.slice(
                    lastState.argsText.length,
                  );
                  lastState.controller.argsText.append(argsTextDelta);

                  const shouldClose = isArgsTextComplete(content.argsText);
                  if (shouldClose) {
                    lastState.controller.argsText.close();
                  }

                  lastToolStates.current[content.toolCallId] = {
                    argsText: content.argsText,
                    hasResult: lastState.hasResult,
                    argsComplete: shouldClose,
                    streamToolCallId: lastState.streamToolCallId,
                    controller: lastState.controller,
                  };
                }
              }

              if (content.result !== undefined && !lastState.hasResult) {
                lastToolStates.current[content.toolCallId] = {
                  hasResult: true,
                  argsComplete: true,
                  argsText: lastState.argsText,
                  streamToolCallId: lastState.streamToolCallId,
                  controller: lastState.controller,
                };

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
  }, [state, controller]);

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
      void abort();
      isInitialState.current = true;
      toolCallIdAliasesRef.current.clear();
      rewriteCounterRef.current = 0;
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
