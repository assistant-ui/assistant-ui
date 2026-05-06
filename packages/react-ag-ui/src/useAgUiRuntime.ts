"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
  useToolInvocations,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ToolExecutionStatus } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { makeLogger } from "./runtime/logger";
import type {
  AgUiInterrupt,
  AgUiResumeEntry,
  UseAgUiRuntimeOptions,
} from "./runtime/types";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";

const symbolAgUiRuntimeExtras = Symbol("ag-ui-runtime-extras");
const EMPTY_INTERRUPTS: readonly AgUiInterrupt[] = Object.freeze([]);

type AgUiRuntimeExtras = {
  [symbolAgUiRuntimeExtras]: true;
  interrupts: readonly AgUiInterrupt[];
  resumeInterrupts: (entries: readonly AgUiResumeEntry[]) => Promise<void>;
};

const asAgUiRuntimeExtras = (extras: unknown): AgUiRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras === null ||
    !(symbolAgUiRuntimeExtras in extras)
  ) {
    throw new Error(
      "This method can only be called when you are using useAgUiRuntime",
    );
  }
  return extras as AgUiRuntimeExtras;
};

/**
 * @experimental
 */
export const useAgUiInterrupts = () => {
  return useAuiState((s) => {
    // empty-thread-core ships extras: undefined, so guard before unwrapping
    const extras = s.thread.extras;
    if (!extras) return EMPTY_INTERRUPTS;
    return asAgUiRuntimeExtras(extras).interrupts;
  });
};

/**
 * Submits resume decisions for the pending AG-UI interrupts. The protocol is
 * all-or-nothing: every pending interrupt id must appear exactly once with
 * status `resolved` or `cancelled`.
 *
 * @experimental
 */
export const useAgUiResumeInterrupts = () => {
  const aui = useAui();
  return useCallback(
    (entries: readonly AgUiResumeEntry[]) => {
      const extras = aui.thread().getState().extras;
      const { resumeInterrupts } = asAgUiRuntimeExtras(extras);
      return resumeInterrupts(entries);
    },
    [aui],
  );
};

export function useAgUiRuntime(
  options: UseAgUiRuntimeOptions,
): AssistantRuntime {
  const logger = useMemo(() => makeLogger(options.logger), [options.logger]);
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const coreRef = useRef<AgUiThreadRuntimeCore | null>(null);
  const runtimeAdapters = useRuntimeAdapters();

  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const threadListAdapter = options.adapters?.threadList;

  if (!coreRef.current) {
    coreRef.current = new AgUiThreadRuntimeCore({
      agent: options.agent,
      logger,
      showThinking: options.showThinking ?? true,
      ...(options.onError && { onError: options.onError }),
      ...(options.onCancel && { onCancel: options.onCancel }),
      ...(historyAdapter && { history: historyAdapter }),
      notifyUpdate,
    });
  }

  const core = coreRef.current;
  core.updateOptions({
    agent: options.agent,
    logger,
    showThinking: options.showThinking ?? true,
    ...(options.onError && { onError: options.onError }),
    ...(options.onCancel && { onCancel: options.onCancel }),
    ...(historyAdapter && { history: historyAdapter }),
  });

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );

  const [runtimeRef] = useState(() => ({
    get current(): AssistantRuntime {
      return runtime;
    },
  }));

  const toolInvocationsRef = useRef({
    reset: () => {},
    abort: (): Promise<void> => Promise.resolve(),
    resume: (_toolCallId: string, _payload: unknown) => {},
  });

  const threadList = useMemo(() => {
    if (!threadListAdapter) return undefined;

    const { onSwitchToNewThread, onSwitchToThread } = threadListAdapter;

    return {
      threadId: threadListAdapter.threadId,
      onSwitchToNewThread: onSwitchToNewThread
        ? async () => {
            toolInvocationsRef.current.reset();
            await onSwitchToNewThread();
            core.applyExternalMessages([]);
          }
        : undefined,
      onSwitchToThread: onSwitchToThread
        ? async (threadId: string) => {
            toolInvocationsRef.current.reset();
            const result = await onSwitchToThread(threadId);
            core.applyExternalMessages(result.messages);
            if (result.state) {
              core.loadExternalState(result.state);
            }
          }
        : undefined,
    };
  }, [threadListAdapter, core]);

  const adapters = options.adapters;
  const adapterAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      feedback: adapters?.feedback,
      threadList,
    }),
    [adapters, runtimeAdapters, threadList],
  );

  const interrupts = core.getInterrupts();
  const extras = useMemo<AgUiRuntimeExtras>(
    () => ({
      [symbolAgUiRuntimeExtras]: true,
      interrupts,
      resumeInterrupts: (entries) => core.resumeInterrupts(entries),
    }),
    [core, interrupts],
  );

  const toolInvocations = useToolInvocations({
    state: {
      messages: core.getMessages(),
      isRunning: core.isRunning() || hasExecutingTools,
    },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command) => {
      if (command.type === "add-tool-result") {
        const messageId = core.findMessageIdForToolCall(command.toolCallId);
        if (messageId) {
          core.addToolResult({
            messageId,
            toolCallId: command.toolCallId,
            toolName: command.toolName,
            result: command.result,
            isError: command.isError,
            ...(command.artifact && { artifact: command.artifact }),
          });
        }
      }
    },
    setToolStatuses,
  });
  toolInvocationsRef.current = toolInvocations;

  const store = useMemo(
    () => {
      void _version; // rerender on version change

      return {
        isLoading: core.isLoading,
        messages: core.getMessages(),
        state: core.getState(),
        isRunning: core.isRunning() || hasExecutingTools,
        onNew: (message: AppendMessage) => core.append(message),
        onEdit: (message: AppendMessage) => core.edit(message),
        onReload: (parentId: string | null, config: { runConfig?: any }) =>
          core.reload(parentId, config),
        onCancel: async () => {
          core.cancel();
          await toolInvocationsRef.current.abort();
        },
        onAddToolResult: (options) => core.addToolResult(options),
        onResume: (config) => core.resume(config),
        onResumeToolCall: (options) =>
          toolInvocationsRef.current.resume(
            options.toolCallId,
            options.payload,
          ),
        extras,
        setMessages: (messages: readonly ThreadMessage[]) =>
          core.applyExternalMessages(messages),
        onImport: (messages: readonly ThreadMessage[]) =>
          core.applyExternalMessages(messages),
        onLoadExternalState: (state: ReadonlyJSONValue) =>
          core.loadExternalState(state),
        adapters: adapterAdapters,
      } satisfies ExternalStoreAdapter<ThreadMessage>;
    },
    // _version is intentionally included to trigger re-computation when core state changes via notifyUpdate
    // toolInvocations intentionally excluded: abort/resume use refs internally and work with stale captures
    [adapterAdapters, core, _version, hasExecutingTools, extras],
  );

  const runtime = useExternalStoreRuntime(store);

  useEffect(() => {
    core.attachRuntime(runtime);
    return () => {
      core.detachRuntime();
    };
  }, [core, runtime]);

  useEffect(() => {
    core.__internal_load();
  }, [core]);

  return runtime;
}
