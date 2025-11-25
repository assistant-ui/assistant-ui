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
            const isCompleteToolCall =
              content.result !== undefined &&
              isArgsTextComplete(content.argsText);

            // During initial state, ignore all tool calls
            if (isInititialState.current) {
              ignoredToolIds.current.add(content.toolCallId);
              return;
            }

            // Skip if already processed
            if (ignoredToolIds.current.has(content.toolCallId)) {
              return;
            }

            // Check if we already have state for this tool call
            let lastState = lastToolStates.current[content.toolCallId];

            if (isCompleteToolCall && !lastState) {
              ignoredToolIds.current.add(content.toolCallId);
              return;
            }

            // Create controller if needed
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
                if (process.env["NODE_ENV"] !== "production") {
                  console.warn(
                    "argsText updated after controller was closed:",
                    { previous: lastState.argsText, next: content.argsText },
                  );
                }
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
