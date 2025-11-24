import { useEffect, useRef, useState } from "react";
import {
  createAssistantStreamController,
  ToolCallStreamController,
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

              // Clear status when result is set
              setToolStatuses((prev) => {
                const next = { ...prev };
                delete next[chunk.meta.toolCallId];
                return next;
              });
            }
          },
        }),
      );

    return controller;
  });

  const ignoredToolIds = useRef<Set<string>>(new Set());
  const isInititialState = useRef(true);

  useEffect(() => {
    const processMessages = (
      messages: readonly (typeof state.messages)[number][],
    ) => {
      messages.forEach((message) => {
        message.content.forEach((content) => {
          if (content.type === "tool-call") {
            if (isInititialState.current) {
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
                // parse once and reuse for both completeness check and comparison
                let lastParsed: any = null;
                let currentParsed: any = null;
                let isLastComplete = false;
                let isCurrentComplete = false;

                try {
                  lastParsed = JSON.parse(lastState.argsText);
                  isLastComplete = true;
                } catch {
                  // lastState.argsText is not complete JSON
                }

                try {
                  currentParsed = JSON.parse(content.argsText);
                  isCurrentComplete = true;
                } catch {
                  // content.argsText is not complete JSON
                }

                if (isLastComplete && isCurrentComplete) {
                  // Verify semantic equivalence (reuse already-parsed objects)
                  let areSemanticallySame = false;
                  try {
                    const sortJsonKeys = (obj: any, depth = 0): any => {
                      if (depth > 100) {
                        throw new Error(
                          "Maximum nesting depth exceeded in tool arguments",
                        );
                      }
                      if (typeof obj !== "object" || obj === null) return obj;
                      if (Array.isArray(obj))
                        return obj.map((item) => sortJsonKeys(item, depth + 1));
                      return Object.keys(obj)
                        .sort()
                        .reduce((result, key) => {
                          result[key] = sortJsonKeys(obj[key], depth + 1);
                          return result;
                        }, {} as any);
                    };

                    areSemanticallySame =
                      JSON.stringify(sortJsonKeys(lastParsed)) ===
                      JSON.stringify(sortJsonKeys(currentParsed));

                    if (!areSemanticallySame) {
                      if (process.env["NODE_ENV"] !== "production") {
                        console.warn(
                          "Complete argsText updated with different content:",
                          {
                            previous: lastState.argsText,
                            next: content.argsText,
                          },
                        );
                      }
                    }
                  } catch (e) {
                    // Should not happen since we already successfully parsed both
                    if (process.env["NODE_ENV"] !== "production") {
                      console.warn("Failed to compare JSON:", e);
                    }
                  }

                  if (!lastState.argsComplete) {
                    lastState.controller.argsText.close();
                  }

                  lastToolStates.current[content.toolCallId] = {
                    ...lastState,
                    argsText: content.argsText,
                    argsComplete: true,
                  };
                  return;
                }
                if (lastState.argsComplete) {
                  // This case handles updates after the controller is already closed
                  if (process.env["NODE_ENV"] !== "production") {
                    console.warn(
                      "argsText updated after controller was closed:",
                      { previous: lastState.argsText, next: content.argsText },
                    );
                  }
                  return;
                } else {
                  if (!content.argsText.startsWith(lastState.argsText)) {
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
                    ...lastState,
                    argsText: content.argsText,
                    argsComplete: shouldClose,
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

    if (isInititialState.current) {
      isInititialState.current = false;
    }
  }, [state, controller, onResult]);

  const abort = () => {
    humanInputRef.current.forEach(({ reject }) => {
      reject(new Error("Tool execution aborted"));
    });
    humanInputRef.current.clear();
    setToolStatuses({});

    acRef.current.abort();
    acRef.current = new AbortController();
  };

  return {
    reset: () => {
      abort();
      isInititialState.current = true;
    },
    abort,
    resume: (toolCallId: string, payload: unknown) => {
      const handlers = humanInputRef.current.get(toolCallId);
      if (handlers) {
        humanInputRef.current.delete(toolCallId);
        setToolStatuses((prev) => {
          const next = { ...prev };
          delete next[toolCallId];
          return next;
        });
        handlers.resolve(payload);
      } else {
        throw new Error(
          `Tool call ${toolCallId} is not waiting for human input`,
        );
      }
    },
  };
}
