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
  const [version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const coreRef = useRef<AgUiThreadRuntimeCore | null>(null);
  const runtimeAdapters = useRuntimeAdapters();

  const attachmentsAdapter =
    options.adapters?.attachments ?? runtimeAdapters?.attachments;
  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const speechAdapter = options.adapters?.speech;
  const feedbackAdapter = options.adapters?.feedback;

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

  const adapterAdapters = useMemo(() => {
    const value: NonNullable<ExternalStoreAdapter<ThreadMessage>["adapters"]> =
      {};
    if (attachmentsAdapter) value.attachments = attachmentsAdapter;
    if (speechAdapter) value.speech = speechAdapter;
    if (feedbackAdapter) value.feedback = feedbackAdapter;
    return Object.keys(value).length ? value : undefined;
  }, [attachmentsAdapter, speechAdapter, feedbackAdapter]);

  const store = useMemo(
    () =>
      ({
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
      }) satisfies ExternalStoreAdapter<ThreadMessage>,
    // version is intentionally included to trigger re-computation when core state changes via notifyUpdate
    [adapterAdapters, core, version],
  );

  const runtime = useExternalStoreRuntime(store);

  useEffect(() => {
    core.attachRuntime(runtime);
    return () => {
      core.detachRuntime();
    };
  }, [core, runtime]);

  return runtime;
}
