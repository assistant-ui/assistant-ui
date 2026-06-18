"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useExternalStoreSharedOptions,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { A2AClient } from "./A2AClient";
import { A2AThreadRuntimeCore } from "./A2AThreadRuntimeCore";
import { a2aExtras } from "./a2aExtras";
import type { UseA2ARuntimeOptions } from "./types";

export function useA2ARuntime(options: UseA2ARuntimeOptions): AssistantRuntime {
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const runtimeAdapters = useRuntimeAdapters();
  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const threadListAdapter = options.adapters?.threadList;

  // Create or reuse client
  const clientRef = useRef<A2AClient | null>(null);
  if (!clientRef.current) {
    if (options.client) {
      clientRef.current = options.client;
    } else if (options.baseUrl) {
      clientRef.current = new A2AClient({
        baseUrl: options.baseUrl,
        basePath: options.basePath,
        tenant: options.tenant,
        headers: options.headers,
        extensions: options.extensions,
        fetchOptions: options.fetchOptions,
      });
    } else {
      throw new Error("useA2ARuntime requires either `client` or `baseUrl`");
    }
  }
  const client = clientRef.current;

  // Create or reuse core
  const coreRef = useRef<A2AThreadRuntimeCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new A2AThreadRuntimeCore({
      client,
      contextId: options.contextId,
      configuration: options.configuration,
      ...(options.onError && { onError: options.onError }),
      ...(options.onCancel && { onCancel: options.onCancel }),
      ...(options.onArtifactComplete && {
        onArtifactComplete: options.onArtifactComplete,
      }),
      ...(historyAdapter && { history: historyAdapter }),
      notifyUpdate,
    });
  }

  const core = coreRef.current;
  core.updateOptions({
    client,
    contextId: options.contextId,
    configuration: options.configuration,
    ...(options.onError && { onError: options.onError }),
    ...(options.onCancel && { onCancel: options.onCancel }),
    ...(options.onArtifactComplete && {
      onArtifactComplete: options.onArtifactComplete,
    }),
    ...(historyAdapter && { history: historyAdapter }),
  });

  // Thread list
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
          }
        : undefined,
    };
  }, [threadListAdapter, core]);

  // Adapters
  const adapters = options.adapters;
  const adapterAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
      threadList,
    }),
    [adapters, runtimeAdapters, threadList],
  );

  // Build store adapter
  const shared = useExternalStoreSharedOptions(options);
  const store = useMemo(() => {
    void _version;

    return {
      ...shared,
      isLoading: core.isLoading,
      messages: core.getMessages(),
      isRunning: core.isRunning(),
      extras: a2aExtras.provide({
        task: core.getTask(),
        artifacts: core.getArtifacts(),
        agentCard: core.getAgentCard(),
      }),
      onNew: (message: AppendMessage) => core.append(message),
      onEdit: (message: AppendMessage) => core.edit(message),
      onReload: (parentId: string | null) => core.reload(parentId),
      onCancel: () => core.cancel(),
      setMessages: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      onImport: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      adapters: adapterAdapters,
    } satisfies ExternalStoreAdapter<ThreadMessage>;
  }, [adapterAdapters, core, _version, shared]);

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
