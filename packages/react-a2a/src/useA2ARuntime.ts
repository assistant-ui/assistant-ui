/// <reference types="@assistant-ui/core/store" />
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  AppendMessage,
  AttachmentAdapter,
  ExternalStoreAdapter,
  FeedbackAdapter,
  SpeechSynthesisAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";
import { A2AClient } from "./A2AClient";
import type { A2AClientOptions } from "./A2AClient";
import { A2AThreadRuntimeCore } from "./A2AThreadRuntimeCore";
import type {
  A2AArtifact,
  A2AAgentCard,
  A2ASendMessageConfiguration,
  A2ATask,
} from "./types";

// --- Extras symbol for A2A-specific state ---

const symbolA2AExtras = Symbol("a2a-extras");

type A2AExtras = {
  [symbolA2AExtras]: true;
  task: A2ATask | undefined;
  artifacts: readonly A2AArtifact[];
  agentCard: A2AAgentCard | undefined;
};

const asA2AExtras = (extras: unknown): A2AExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolA2AExtras in extras)
  )
    throw new Error(
      "This hook can only be used inside a useA2ARuntime provider",
    );
  return extras as A2AExtras;
};

// --- Public hooks for A2A state ---

export const useA2ATask = () => {
  return useAuiState((s) => asA2AExtras(s.thread.extras).task);
};

export const useA2AArtifacts = () => {
  return useAuiState((s) => asA2AExtras(s.thread.extras).artifacts);
};

export const useA2AAgentCard = () => {
  return useAuiState((s) => asA2AExtras(s.thread.extras).agentCard);
};

// --- Thread list adapter type ---

export type UseA2AThreadListAdapter = {
  threadId?: string;
  onSwitchToNewThread?: () => Promise<void> | void;
  onSwitchToThread?: (threadId: string) => Promise<{
    messages: readonly ThreadMessage[];
  }>;
};

// --- Options ---

export type UseA2ARuntimeOptions = {
  /** Pre-built A2A client instance. Provide this OR baseUrl. */
  client?: A2AClient;
  /** Base URL of the A2A server. Used to create a client if `client` is not provided. */
  baseUrl?: string;
  /** Optional path prefix for all API endpoints (e.g. "/v1"). Does not affect agent card discovery. Only used with baseUrl. */
  basePath?: string;
  /** Optional tenant ID for multi-tenant servers. Only used with baseUrl. */
  tenant?: string;
  /** Headers for the A2A client (only used with baseUrl). */
  headers?: A2AClientOptions["headers"];
  /** A2A extension URIs to negotiate. Only used with baseUrl. */
  extensions?: string[];

  /** Initial context ID for the conversation. */
  contextId?: string;
  /** Default send message configuration. */
  configuration?: A2ASendMessageConfiguration;

  /** Called when an error occurs. */
  onError?: (error: Error) => void;
  /** Called when a run is cancelled. */
  onCancel?: () => void;
  /** Called when an artifact is fully received (lastChunk). */
  onArtifactComplete?: (artifact: import("./types").A2AArtifact) => void;

  adapters?: {
    attachments?: AttachmentAdapter;
    speech?: SpeechSynthesisAdapter;
    feedback?: FeedbackAdapter;
    history?: ThreadHistoryAdapter;
    threadList?: UseA2AThreadListAdapter;
  };
};

// --- Main hook ---

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
      feedback: adapters?.feedback,
      threadList,
    }),
    [adapters, runtimeAdapters, threadList],
  );

  // Build store adapter
  const store = useMemo(() => {
    void _version;

    return {
      isLoading: core.isLoading,
      messages: core.getMessages(),
      isRunning: core.isRunning(),
      extras: {
        [symbolA2AExtras]: true,
        task: core.getTask(),
        artifacts: core.getArtifacts(),
        agentCard: core.getAgentCard(),
      } satisfies A2AExtras,
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
  }, [adapterAdapters, core, _version]);

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
