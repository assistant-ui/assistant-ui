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
  ReadonlyJSONValue,
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
};

export function useToolInvocations({
  state,
  getTools,
  onResult,
}: UseToolInvocationsParams) {
  const lastToolStates = useRef<
    Record<
      string,
      {
        argsText: string;
        hasResult: boolean;
        controller: ToolCallStreamController;
      }
    >
  >({});

  const acRef = useRef<AbortController>(new AbortController());
  const [controller] = useState(() => {
    const [stream, controller] = createAssistantStreamController();
    const transform = unstable_toolResultStream(
      getTools,
      () => acRef.current?.signal ?? new AbortController().signal,
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
  const isInititialState = useRef(true);

  useEffect(() => {
    if (isInititialState.current) {
      state.messages.forEach((message) => {
        message.content.forEach((content) => {
          if (content.type === "tool-call") {
            ignoredToolIds.current.add(content.toolCallId);
          }
        });
      });
      isInititialState.current = false;
    } else {
      state.messages.forEach((message) => {
        message.content.forEach((content) => {
          if (content.type === "tool-call") {
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
                controller: toolCallController,
              };
              lastToolStates.current[content.toolCallId] = lastState;
            }

            if (content.argsText !== lastState.argsText) {
              if (!content.argsText.startsWith(lastState.argsText)) {
                throw new Error(
                  `Tool call argsText can only be appended, not updated: ${content.argsText} does not start with ${lastState.argsText}`,
                );
              }

              const argsTextDelta = content.argsText.slice(
                lastState.argsText.length,
              );
              lastState.controller.argsText.append(argsTextDelta);

              if (isArgsTextComplete(content.argsText)) {
                lastState.controller.argsText.close();
              }

              lastToolStates.current[content.toolCallId] = {
                argsText: content.argsText,
                hasResult: lastState.hasResult,
                controller: lastState.controller,
              };
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
                argsText: lastState.argsText,
                controller: lastState.controller,
              };
            }
          }
        });
      });
    }
  }, [state]);

  return {
    reset: () => {
      acRef.current.abort();
      acRef.current = new AbortController();
      isInititialState.current = true;
    },
    abort: () => {
      acRef.current.abort();
      acRef.current = new AbortController();
    },
  };
}
