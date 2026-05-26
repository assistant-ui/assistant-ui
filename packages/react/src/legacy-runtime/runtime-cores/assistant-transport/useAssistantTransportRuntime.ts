"use client";

import type { AppendMessage } from "@assistant-ui/core";
import {
  type ReadonlyJSONObject,
  type ReadonlyJSONValue,
  asAsyncIterableStream,
} from "assistant-stream/utils";
import { useExternalStoreRuntime } from "../external-store/useExternalStoreRuntime";
import type { AssistantRuntime } from "../../runtime/AssistantRuntime";
import type { AddToolResultOptions } from "@assistant-ui/core";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  AssistantTransportDecoder,
  unstable_createInitialMessage as createInitialMessage,
  toToolsJSONSchema,
} from "assistant-stream";
import type {
  AssistantTransportOptions,
  AddMessageCommand,
  AddToolResultCommand,
  UserMessagePart,
  QueuedCommand,
  AssistantTransportCommand,
  SendCommandsRequestBody,
} from "./types";
import { useCommandQueue } from "./commandQueue";
import { useRunManager } from "./runManager";
import { useConvertedState } from "./useConvertedState";
import type { ToolExecutionStatus } from "@assistant-ui/core";
import { createRequestHeaders } from "@assistant-ui/core";
import { useRemoteThreadListRuntime } from "../remote-thread-list/useRemoteThreadListRuntime";
import { InMemoryThreadListAdapter } from "@assistant-ui/core";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { UserExternalState } from "../../../augmentations";

const convertAppendMessageToCommand = (
  message: AppendMessage,
): AddMessageCommand => {
  if (message.role !== "user")
    throw new Error("Only user messages are supported");

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

  return {
    type: "add-message",
    message: {
      role: "user",
      parts,
    },
    parentId: message.parentId,
    sourceId: message.sourceId,
  };
};

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
  const aui = useAui();

  return (command: AssistantTransportCommand) => {
    const extras = aui.thread().getState().extras;
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
  return useAuiState((s) =>
    selector(asAssistantTransportExtras(s.thread.extras).state),
  );
}

const useAssistantTransportThreadRuntime = <T>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const agentStateRef = useRef(options.initialState);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const resumeFlagRef = useRef(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const parentIdRef = useRef<string | null | undefined>(undefined);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const commandQueue = useCommandQueue({
    onQueue: () => runManager.schedule(),
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadId = useAuiState((s) => s.threadListItem.remoteId);

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const runManager = useRunManager({
    onRun: async (signal: AbortSignal) => {
      const isResume = resumeFlagRef.current;
      resumeFlagRef.current = false;
      const commands: QueuedCommand[] = isResume ? [] : commandQueue.flush();
      if (commands.length === 0 && !isResume)
        throw new Error("No commands to send");

      const headers = await createRequestHeaders(options.headers);
      const bodyValue =
        typeof options.body === "function"
          ? await options.body()
          : options.body;
      const context = runtime.thread.getModelContext();

      let requestBody: Record<string, unknown> = {
        commands,
        state: agentStateRef.current,
        system: context.system,
        tools: context.tools ? toToolsJSONSchema(context.tools) : undefined,
        threadId,
        ...(parentIdRef.current !== undefined && {
          parentId: parentIdRef.current,
        }),
        // nested (new format, aligned with AssistantChatTransport)
        callSettings: context.callSettings,
        config: context.config,
        // @deprecated spread at top level — use nested `callSettings`/`config` instead. Will be removed in a future version.
        ...context.callSettings,
        ...context.config,
        ...(bodyValue ?? {}),
      };

      if (options.prepareSendCommandsRequest) {
        requestBody = await options.prepareSendCommandsRequest(
          requestBody as SendCommandsRequestBody,
        );
      }

      const response = await fetch(
        isResume ? options.resumeApi! : options.api,
        {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
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

      commandQueue.reset();

      options.onCancel?.({
        commands: cmds,
        updateState: (updater) => {
          agentStateRef.current = updater(agentStateRef.current);
          rerender((prev) => prev + 1);
        },
      });
    },
    onError: async (error) => {
      const inTransitCmds = [...commandQueue.state.inTransit];
      const queuedCmds = [...commandQueue.state.queued];

      commandQueue.reset();

      try {
        await options.onError?.(error as Error, {
          commands: inTransitCmds,
          updateState: (updater) => {
            agentStateRef.current = updater(agentStateRef.current);
            rerender((prev) => prev + 1);
          },
        });
      } finally {
        options.onCancel?.({
          commands: queuedCmds,
          updateState: (updater) => {
            agentStateRef.current = updater(agentStateRef.current);
            rerender((prev) => prev + 1);
          },
          error: error as Error,
        });
      }
    },
  });

  // Tool execution status state
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  // Reactive conversion of agent state + connection metadata → UI state
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const pendingCommands = useMemo(
    () => [...commandQueue.state.inTransit, ...commandQueue.state.queued],
    [commandQueue.state],
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const converted = useConvertedState(
    options.converter,
    agentStateRef.current,
    pendingCommands,
    runManager.isRunning,
    toolStatuses,
  );

  // Create runtime
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const runtime = useExternalStoreRuntime({
    messages: converted.messages,
    state: converted.state,
    isRunning: converted.isRunning,
    adapters: options.adapters,
    // Opt the embedded tool-invocations tracker in. The transport runtime
    // is the canonical client-side tool-execution surface: tool callbacks
    // (streamCall/execute) fire on tool-call parts in the converted state,
    // and their results flow back via `onAddToolResult` below, which
    // forwards them to the backend as `add-tool-result` commands.
    unstable_enableToolInvocations: true,
    extras: {
      [symbolAssistantTransportExtras]: true,
      sendCommand: (command: AssistantTransportCommand) => {
        commandQueue.enqueue(command);
      },
      state: agentStateRef.current as UserExternalState,
    } satisfies AssistantTransportExtras,
    onNew: async (message: AppendMessage): Promise<void> => {
      parentIdRef.current = message.parentId;
      const command = convertAppendMessageToCommand(message);
      commandQueue.enqueue(command);
    },
    ...(options.capabilities?.edit && {
      onEdit: async (message: AppendMessage): Promise<void> => {
        parentIdRef.current = message.parentId;
        const command = convertAppendMessageToCommand(message);
        commandQueue.enqueue(command);
      },
    }),
    onCancel: async () => {
      // The embedded tracker's `abort()` is invoked by the runtime's
      // `cancelRun` before this adapter callback runs, so no need to call
      // it again here.
      runManager.cancel();
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
        ...(toolOptions.modelContent !== undefined && {
          modelContent: toolOptions.modelContent,
        }),
      };

      commandQueue.enqueue(command);
    },
    onLoadExternalState: async (state) => {
      // The runtime's `importExternalState` already calls
      // `tracker.reset()` before invoking this callback, so no need to
      // reset here.
      agentStateRef.current = state as T;
      rerender((prev) => prev + 1);
    },
  });

  // Mirror the embedded tracker's tool-status map into the React state
  // that drives `useConvertedState`. The tracker keeps the same Map
  // reference until a status changes, so the cheap reference check at
  // the top of the updater dedupes redundant subscribe firings (most
  // notifySubscribers calls are for message updates, not status changes).
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const lastStatusesRef = useRef<ReadonlyMap<string, ToolExecutionStatus>>(
    new Map(),
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const subscribeThread = useCallback(
    (cb: () => void) => runtime.thread.subscribe(cb),
    [runtime],
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const getStatusesMap = useCallback(
    () => runtime.thread.getToolStatuses(),
    [runtime],
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const toolStatusesMap = useSyncExternalStore(
    subscribeThread,
    getStatusesMap,
    getStatusesMap,
  );
  if (toolStatusesMap !== lastStatusesRef.current) {
    lastStatusesRef.current = toolStatusesMap;
    setToolStatuses(
      Object.fromEntries(toolStatusesMap) as Record<
        string,
        ToolExecutionStatus
      >,
    );
  }

  return runtime;
};

/**
 * @alpha This is an experimental API that is subject to change.
 */
export const useAssistantTransportRuntime = <T>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
      return useAssistantTransportThreadRuntime(options);
    },
    adapter: new InMemoryThreadListAdapter(),
    allowNesting: true,
  });
  return runtime;
};
