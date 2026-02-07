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

  const [controller] = useState(() => {
    const [stream, controller] = createAssistantStreamController();
    const transform = unstable_toolResultStream(
      getTools,
      () => acRef.current?.signal ?? new AbortController().signal,
      (toolCallId: string, payload: unknown) => {
        return new Promise<unknown>((resolve, reject) => {
          // Reject previous human input request if it exists
          const previous = humanInputRef.current.get(toolCallId);
          if (previous) {
            previous.reject(
              new Error("Human input request was superseded by a new request"),
            );
          }

          humanInputRef.current.set(toolCallId, { resolve, reject });
          setToolStatuses((prev) => ({
            ...prev,
            [toolCallId]: {
              type: "interrupt",
              payload: { type: "human", payload },
            },
          }));
        });
      },
      {
        onExecutionStart: (toolCallId: string) => {
          executingCountRef.current++;
          setToolStatuses((prev) => ({
            ...prev,
            [toolCallId]: { type: "executing" },
          }));
        },
        onExecutionEnd: (toolCallId: string) => {
          executingCountRef.current--;
          setToolStatuses((prev) => {
            const next = { ...prev };
            delete next[toolCallId];
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
              // the tool call result was already set by the backend
              if (lastToolStates.current[chunk.meta.toolCallId]?.hasResult)
                return;

              onResult({
                type: "add-tool-result",
                toolCallId: chunk.meta.toolCallId,
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
                const toolCallController = controller.addToolCallPart({
                  toolName: content.toolName,
                  toolCallId: content.toolCallId,
                });
                lastState = {
                  argsText: "",
                  hasResult: false,
                  argsComplete: false,
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
                        controller: lastState.controller,
                      };
                      return; // Continue to next content part
                    }
                    throw new Error(
                      `Tool call argsText can only be appended, not updated: ${content.argsText} does not start with ${lastState.argsText}`,
                    );
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
                    controller: lastState.controller,
                  };
                }
              }

              if (content.result !== undefined && !lastState.hasResult) {
                lastState.controller.setResponse(
                  new ToolResponse({
                    result: content.result as ReadonlyJSONValue,
                    artifact: content.artifact as ReadonlyJSONValue | undefined,
                    isError: content.isError,
                  }),
                );
                lastState.controller.close();

                lastToolStates.current[content.toolCallId] = {
                  hasResult: true,
                  argsComplete: true,
                  argsText: lastState.argsText,
                  controller: lastState.controller,
                };
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
