"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/react";
import type {
  AssistantRuntime,
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { makeLogger } from "./runtime/logger";
import type { UseAgUiRuntimeOptions } from "./runtime/types";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";

export function useAgUiRuntime(
  options: UseAgUiRuntimeOptions,
): AssistantRuntime {
  const logger = useMemo(() => makeLogger(options.logger), [options.logger]);
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const coreRef = useRef<AgUiThreadRuntimeCore | null>(null);
  const runtimeAdapters = useRuntimeAdapters();

  const attachmentsAdapter =
    options.adapters?.attachments ?? runtimeAdapters?.attachments;
  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const speechAdapter = options.adapters?.speech;
  const dictationAdapter = options.adapters?.dictation;
  const feedbackAdapter = options.adapters?.feedback;
  const threadListAdapter = options.adapters?.threadList;

  if (!coreRef.current) {
    coreRef.current = new AgUiThreadRuntimeCore({
      agent: options.agent,
      logger,
      showThinking: options.showThinking ?? true,
      ...(options.onError ? { onError: options.onError } : {}),
      ...(options.onCancel ? { onCancel: options.onCancel } : {}),
      ...(historyAdapter ? { history: historyAdapter } : {}),
      notifyUpdate,
    });
  }

  const core = coreRef.current;
  core.updateOptions({
    agent: options.agent,
    logger,
    showThinking: options.showThinking ?? true,
    ...(options.onError ? { onError: options.onError } : {}),
    ...(options.onCancel ? { onCancel: options.onCancel } : {}),
    ...(historyAdapter ? { history: historyAdapter } : {}),
  });

  const threadList = useMemo(() => {
    if (!threadListAdapter) return undefined;
    return {
      threadId: threadListAdapter.threadId,
      onSwitchToNewThread: !threadListAdapter.onSwitchToNewThread
        ? undefined
        : async () => {
            await threadListAdapter.onSwitchToNewThread?.();
            core.applyExternalMessages([]);
          },
      onSwitchToThread: !threadListAdapter.onSwitchToThread
        ? undefined
        : async (threadId: string) => {
            const result = await threadListAdapter.onSwitchToThread!(threadId);
            core.applyExternalMessages(result.messages);
            if (result.state) {
              core.loadExternalState(result.state);
            }
          },
    };
  }, [threadListAdapter, core]);

  const adapterAdapters = useMemo(() => {
    const value: NonNullable<ExternalStoreAdapter<ThreadMessage>["adapters"]> =
      {};
    if (attachmentsAdapter) value.attachments = attachmentsAdapter;
    if (speechAdapter) value.speech = speechAdapter;
    if (dictationAdapter) value.dictation = dictationAdapter;
    if (feedbackAdapter) value.feedback = feedbackAdapter;
    if (threadList) value.threadList = threadList;
    return Object.keys(value).length ? value : undefined;
  }, [
    attachmentsAdapter,
    speechAdapter,
    dictationAdapter,
    feedbackAdapter,
    threadList,
  ]);

  const store = useMemo(
    () => {
      void _version; // rerender on version change

      return {
        isLoading: core.isLoading,
        messages: core.getMessages(),
        state: core.getState(),
        isRunning: core.isRunning(),
        onNew: (message: AppendMessage) => core.append(message),
        onEdit: (message: AppendMessage) => core.edit(message),
        onReload: (parentId: string | null, config: { runConfig?: any }) =>
          core.reload(parentId, config),
        onCancel: () => core.cancel(),
        onAddToolResult: (options) => core.addToolResult(options),
        onResume: (config) => core.resume(config),
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
    [adapterAdapters, core, _version],
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
