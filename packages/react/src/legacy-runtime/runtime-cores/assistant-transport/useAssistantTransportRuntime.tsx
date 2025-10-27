"use client";

import {
  type ReadonlyJSONObject,
  type ReadonlyJSONValue,
  asAsyncIterableStream,
} from "assistant-stream/utils";
import { AppendMessage } from "../../../types";
import { useExternalStoreRuntime } from "../external-store/useExternalStoreRuntime";
import { AssistantRuntime } from "../../runtime/AssistantRuntime";
import { AddToolResultOptions } from "../core";
import { useState, useRef, useMemo } from "react";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  AssistantTransportDecoder,
  unstable_createInitialMessage as createInitialMessage,
} from "assistant-stream";
import {
  AssistantTransportOptions,
  AddMessageCommand,
  AddToolResultCommand,
  UserMessagePart,
  QueuedCommand,
  AssistantTransportCommand,
} from "./types";
import { useCommandQueue } from "./commandQueue";
import { useRunManager } from "./runManager";
import { useConvertedState } from "./useConvertedState";
import { ToolExecutionStatus, useToolInvocations } from "./useToolInvocations";
import { toAISDKTools, getEnabledTools, createRequestHeaders } from "./utils";
import { useRemoteThreadListRuntime } from "../remote-thread-list/useRemoteThreadListRuntime";
import { InMemoryThreadListAdapter } from "../remote-thread-list/adapter/in-memory";
import { useAssistantApi, useAssistantState } from "../../../context/react";
import { UserExternalState } from "../../../augmentations";

const symbolAssistantTransportExtras = Symbol("assistant-transport-extras");
type AssistantTransportExtras = {
  [symbolAssistantTransportExtras]: true;
  sendCommand: (command: AssistantTransportCommand) => void;
  state: UserExternalState;
};

const asAssistantTransportExtras = (
  extras: unknown,
): AssistantTransportExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolAssistantTransportExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useAssistantTransportRuntime",
    );

  return extras as AssistantTransportExtras;
};

export const useAssistantTransportSendCommand = () => {
  const api = useAssistantApi();

  return (command: AssistantTransportCommand) => {
    const extras = api.thread().getState().extras;
    const transportExtras = asAssistantTransportExtras(extras);
    transportExtras.sendCommand(command);
  };
};

export function useAssistantTransportState(): UserExternalState;
export function useAssistantTransportState<T>(
  selector: (state: UserExternalState) => T,
): T;
export function useAssistantTransportState<T>(
  selector: (state: UserExternalState) => T = (t) => t as T,
): T | UserExternalState {
  return useAssistantState(({ thread }) =>
    selector(asAssistantTransportExtras(thread.extras).state),
  );
}

const useAssistantTransportThreadRuntime = <T,>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  const agentStateRef = useRef(options.initialState);
  const [, rerender] = useState(0);
  const resumeFlagRef = useRef(false);
  const commandQueue = useCommandQueue({
    onQueue: () => runManager.schedule(),
  });

  const runManager = useRunManager({
    onRun: async (signal: AbortSignal) => {
      const isResume = resumeFlagRef.current;
      resumeFlagRef.current = false;
      const commands: QueuedCommand[] = isResume ? [] : commandQueue.flush();
      if (commands.length === 0 && !isResume)
        throw new Error("No commands to send");

      const headers = await createRequestHeaders(options.headers);
      const context = runtime.thread.getModelContext();

      const response = await fetch(
        isResume ? options.resumeApi! : options.api,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            commands,
            state: agentStateRef.current,
            system: context.system,
            tools: context.tools
              ? toAISDKTools(getEnabledTools(context.tools))
              : undefined,
            ...context.callSettings,
            ...context.config,
            ...options.body,
          }),
          signal,
        },
      );

      options.onResponse?.(response);

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Select decoder based on protocol option
      const protocol = options.protocol ?? "data-stream";
      const decoder =
        protocol === "assistant-transport"
          ? new AssistantTransportDecoder()
          : new DataStreamDecoder();

      let err: string | undefined;
      const stream = response.body.pipeThrough(decoder).pipeThrough(
        new AssistantMessageAccumulator({
          initialMessage: createInitialMessage({
            unstable_state:
              (agentStateRef.current as ReadonlyJSONValue) ?? null,
          }),
          throttle: isResume,
          onError: (error) => {
            err = error;
          },
        }),
      );

      let markedDelivered = false;

      for await (const chunk of asAsyncIterableStream(stream)) {
        if (chunk.metadata.unstable_state === agentStateRef.current) continue;

        if (!markedDelivered) {
          commandQueue.markDelivered();
          markedDelivered = true;
        }

        agentStateRef.current = chunk.metadata.unstable_state as T;
        rerender((prev) => prev + 1);
      }

      if (err) {
        throw new Error(err);
      }
    },
    onFinish: options.onFinish,
    onCancel: () => {
      const cmds = [
        ...commandQueue.state.inTransit,
        ...commandQueue.state.queued,
      ];
      options.onCancel?.({
        commands: cmds,
        updateState: (updater) => {
          agentStateRef.current = updater(agentStateRef.current);
          rerender((prev) => prev + 1);
        },
      });

      commandQueue.reset();
    },
    onError: (error) => {
      const cmds = [...commandQueue.state.inTransit];
      options.onError?.(error as Error, {
        commands: cmds,
        updateState: (updater) => {
          agentStateRef.current = updater(agentStateRef.current);
          rerender((prev) => prev + 1);
        },
      });
      commandQueue.markDelivered();
    },
  });

  // Tool execution status state
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  // Reactive conversion of agent state + connection metadata → UI state
  const pendingCommands = useMemo(
    () => [...commandQueue.state.inTransit, ...commandQueue.state.queued],
    [commandQueue.state],
  );
  const converted = useConvertedState(
    options.converter,
    agentStateRef.current,
    pendingCommands,
    runManager.isRunning,
    toolStatuses,
  );

  // Create runtime
  const runtime = useExternalStoreRuntime({
    messages: converted.messages,
    state: converted.state,
    isRunning: converted.isRunning,
    adapters: options.adapters,
    extras: {
      [symbolAssistantTransportExtras]: true,
      sendCommand: (command: AssistantTransportCommand) => {
        commandQueue.enqueue(command);
      },
      state: agentStateRef.current as UserExternalState,
    } satisfies AssistantTransportExtras,
    onNew: async (message: AppendMessage): Promise<void> => {
      if (message.role !== "user")
        throw new Error("Only user messages are supported");

      // Convert AppendMessage to AddMessageCommand
      const parts: UserMessagePart[] = [];

      const content = [
        ...message.content,
        ...(message.attachments?.flatMap((a) => a.content) ?? []),
      ];
      for (const contentPart of content) {
        if (contentPart.type === "text") {
          parts.push({ type: "text", text: contentPart.text });
        } else if (contentPart.type === "image") {
          parts.push({ type: "image", image: contentPart.image });
        }
      }

      const command: AddMessageCommand = {
        type: "add-message",
        message: {
          role: "user",
          parts,
        },
      };

      commandQueue.enqueue(command);
    },
    onCancel: async () => {
      runManager.cancel();
      toolInvocations.abort();
    },
    onResume: async () => {
      if (!options.resumeApi)
        throw new Error("Must pass resumeApi to options to resume runs");

      resumeFlagRef.current = true;
      runManager.schedule();
    },
    onAddToolResult: async (
      toolOptions: AddToolResultOptions,
    ): Promise<void> => {
      const command: AddToolResultCommand = {
        type: "add-tool-result",
        toolCallId: toolOptions.toolCallId,
        result: toolOptions.result as ReadonlyJSONObject,
        toolName: toolOptions.toolName,
        isError: toolOptions.isError,
        ...(toolOptions.artifact && { artifact: toolOptions.artifact }),
      };

      commandQueue.enqueue(command);
    },
    onLoadExternalState: async (state) => {
      agentStateRef.current = state as T;
      toolInvocations.reset();
      rerender((prev) => prev + 1);
    },
  });

  const toolInvocations = useToolInvocations({
    state: converted,
    getTools: () => runtime.thread.getModelContext().tools,
    onResult: commandQueue.enqueue,
    setToolStatuses,
  });

  return runtime;
};

/**
 * @alpha This is an experimental API that is subject to change.
 */
export const useAssistantTransportRuntime = <T,>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useAssistantTransportThreadRuntime(options);
    },
    adapter: new InMemoryThreadListAdapter(),
  });
  return runtime;
};
