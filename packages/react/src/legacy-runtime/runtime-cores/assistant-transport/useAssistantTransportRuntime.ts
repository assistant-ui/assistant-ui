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
import { useMemo, useRef, useState } from "react";
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
import {
  createReplayBoundaryStream,
  useReplayRenderWait,
} from "./replayBoundaryStream";
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
): AddMessageCommand | null => {
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

  if (parts.length === 0) return null;

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

const readResumeState = async <T>(
  response: Response,
): Promise<{ runId: string; state: T } | null> => {
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(
      `Resume state request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Resume state response was not valid JSON");
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("state" in value) ||
    !("runId" in value) ||
    typeof value.runId !== "string"
  ) {
    throw new Error("Resume state response must contain state and runId");
  }

  return { runId: value.runId, state: value.state as T };
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
    const extras = aui.thread.getState().extras;
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
  const agentStateRef = useRef(options.initialState);
  const [, rerender] = useState(0);
  const resumeFlagRef = useRef(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const waitForReplayRender = useReplayRenderWait();
  const parentIdRef = useRef<string | null | undefined>(undefined);
  const commandQueue = useCommandQueue({
    onQueue: () => runManager.schedule(),
  });

  const enqueueAppendMessage = (message: AppendMessage) => {
    const command = convertAppendMessageToCommand(message);
    if (!command) {
      console.warn(
        "[assistant-ui] Skipped add-message command with no supported parts",
      );
      return;
    }
    parentIdRef.current = message.parentId;
    commandQueue.enqueue(command, {
      schedule: message.startRun ?? message.role === "user",
    });
  };

  const threadId = useAuiState((s) => s.threadListItem.remoteId);

  const runManager = useRunManager({
    onRun: async (signal: AbortSignal) => {
      const isResume = resumeFlagRef.current;
      resumeFlagRef.current = false;
      setIsReplaying(false);
      const commands: QueuedCommand[] = isResume ? [] : commandQueue.flush();
      if (commands.length === 0 && !isResume) return;

      // The flushed batch consumes the parentId; read it alongside the flush
      // (before any awaits) so a mid-run append keeps its own value. Resume
      // runs send no commands, so they neither send nor consume it.
      const parentId = isResume ? undefined : parentIdRef.current;
      if (!isResume) parentIdRef.current = undefined;

      const headers = await createRequestHeaders(options.headers);
      let resumeState: { runId: string; state: T } | undefined;
      if (isResume && options.resumeStateApi) {
        const resumeStateResponse = await fetch(options.resumeStateApi, {
          method: "POST",
          headers,
          body: JSON.stringify({ threadId }),
          signal,
        });
        const retained = await readResumeState<T>(resumeStateResponse);
        if (retained === null) {
          if (commandQueue.state.queued.length > 0) {
            runManager.schedule();
          }
          return;
        }
        resumeState = retained;
      }

      const bodyValue =
        typeof options.body === "function"
          ? await options.body()
          : options.body;
      const context = runtime.thread.getModelContext();

      let requestBody: Record<string, unknown> = {
        commands,
        ...(resumeState === undefined && { state: agentStateRef.current }),
        system: context.system,
        tools: context.tools ? toToolsJSONSchema(context.tools) : undefined,
        threadId,
        ...(parentId !== undefined && {
          parentId,
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

      if (resumeState !== undefined) {
        // The server replays a resume from the snapshot it retained for this
        // runId. Body overrides and prepare hooks can neither substitute a
        // state nor drop the ID the server validates against.
        requestBody = { ...requestBody, runId: resumeState.runId };
        delete requestBody["state"];
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

      if (resumeState !== undefined) {
        agentStateRef.current = resumeState.state;
        rerender((prev) => prev + 1);
      }

      const body = await createReplayBoundaryStream(response, {
        setReplaying: setIsReplaying,
        waitForRender: waitForReplayRender,
      });

      // Select decoder based on protocol option
      const protocol = options.protocol ?? "data-stream";
      // Resume replays a best-effort buffer; always reconcile leniently.
      const strict = isResume ? false : (options.strict ?? true);
      const decoder =
        protocol === "assistant-transport"
          ? new AssistantTransportDecoder({ strict })
          : new DataStreamDecoder({ strict });

      let err: string | undefined;
      const stream = body.pipeThrough(decoder).pipeThrough(
        new AssistantMessageAccumulator({
          initialMessage: createInitialMessage({
            unstable_state:
              (agentStateRef.current as ReadonlyJSONValue) ?? null,
          }),
          throttle: isResume,
          strict,
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

      // A successful run confirms delivery even when no state-changing
      // chunk was observed.
      if (!markedDelivered) {
        commandQueue.markDelivered();
      }

      // commands that coalesced into this resume run must not starve
      if (isResume && commandQueue.state.queued.length > 0) {
        runManager.schedule();
      }
    },
    onFinish: options.onFinish,
    onCancel: () => {
      setIsReplaying(false);
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
      resumeFlagRef.current = false;
      setIsReplaying(false);
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
    isLoading: isReplaying,
    adapters: options.adapters,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    extras: {
      [symbolAssistantTransportExtras]: true,
      sendCommand: (command: AssistantTransportCommand) => {
        commandQueue.enqueue(command);
      },
      state: agentStateRef.current as UserExternalState,
    } satisfies AssistantTransportExtras,
    onNew: async (message: AppendMessage): Promise<void> =>
      enqueueAppendMessage(message),
    ...(options.capabilities?.edit && {
      onEdit: async (message: AppendMessage): Promise<void> =>
        enqueueAppendMessage(message),
    }),
    ...(commandQueue.state.queued.length > 0 && {
      onReload: async (parentId: string | null) => {
        parentIdRef.current = parentId;
        runManager.schedule();
      },
    }),
    onCancel: async () => {
      resumeFlagRef.current = false;
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
      agentStateRef.current = state as T;
      rerender((prev) => prev + 1);
    },
  });

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
      return useAssistantTransportThreadRuntime(options);
    },
    adapter: new InMemoryThreadListAdapter(),
    allowNesting: true,
  });
  return runtime;
};
