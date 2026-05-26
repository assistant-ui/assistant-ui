"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import type { ToolExecutionStatus } from "@assistant-ui/core";
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

export type AgUiAssistantRuntime = AssistantRuntime & {
  unstable_getPendingInterrupts: () => readonly AgUiInterrupt[];
  unstable_submitInterruptResponses: (
    responses: readonly AgUiResumeEntry[],
  ) => Promise<void>;
};

export function useAgUiRuntime(
  options: UseAgUiRuntimeOptions,
): AgUiAssistantRuntime {
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

  const threadList = useMemo(() => {
    if (!threadListAdapter) return undefined;

    const { onSwitchToNewThread, onSwitchToThread } = threadListAdapter;

    return {
      threadId: threadListAdapter.threadId,
      onSwitchToNewThread: onSwitchToNewThread
        ? async () => {
            await onSwitchToNewThread();
            core.applyExternalMessages([]);
          }
        : undefined,
      onSwitchToThread: onSwitchToThread
        ? async (threadId: string) => {
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

  const store = useMemo(
    () => {
      void _version; // rerender on version change

      return {
        isLoading: core.isLoading,
        messages: core.getMessages(),
        state: core.getState(),
        isRunning: core.isRunning() || hasExecutingTools,
        unstable_enableToolInvocations: true,
        setToolStatuses,
        onNew: (message: AppendMessage) => core.append(message),
        onEdit: (message: AppendMessage) => core.edit(message),
        onReload: (parentId: string | null, config: { runConfig?: any }) =>
          core.reload(parentId, config),
        onCancel: async () => {
          // The embedded tracker's abort() runs before this callback via
          // the runtime's cancelRun.
          core.cancel();
        },
        onAddToolResult: (options) => core.addToolResult(options),
        onResume: (config) => core.resume(config),
        // onResumeToolCall: the runtime calls the embedded tracker's
        // resume() automatically.
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
    [adapterAdapters, core, _version, hasExecutingTools],
  );

  const baseRuntime = useExternalStoreRuntime(store);

  const runtime = useMemo<AgUiAssistantRuntime>(() => {
    const wrapper = Object.create(baseRuntime) as AgUiAssistantRuntime;
    wrapper.unstable_getPendingInterrupts = () =>
      core.getPendingInterrupts()?.interrupts ?? [];
    wrapper.unstable_submitInterruptResponses = (responses) =>
      core.submitInterruptResponses(responses);
    return wrapper;
  }, [baseRuntime, core]);

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
