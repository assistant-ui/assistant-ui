"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useExternalStoreRuntime,
  useExternalStoreSharedOptions,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import type {
  AppendMessage,
  AssistantRuntime,
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  RespondToToolApprovalOptions,
  SpeechSynthesisAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  AcpClient,
  type AcpClientOptions,
  type AcpWebSocketFactory,
} from "./AcpClient";
import {
  AcpThreadRuntimeCore,
  type AcpPermissionsMode,
} from "./AcpThreadRuntimeCore";
import { acpExtras } from "./acpExtras";
import type { AcpImplementation, AcpMcpServer } from "./types";

export type UseAcpRuntimeOptions = ExternalStoreSharedOptions & {
  /** Pre-built ACP client instance. Provide this OR `url`. */
  client?: AcpClient;
  /** WebSocket endpoint of the ACP agent, e.g. `ws://127.0.0.1:2770/`. */
  url?: string;
  /** Working directory passed to `session/new`. */
  cwd?: string;
  /** MCP servers passed to `session/new`. */
  mcpServers?: readonly AcpMcpServer[];
  /** Client identity for the `initialize` handshake. */
  clientInfo?: AcpImplementation;
  /** Inject a WebSocket implementation (tests / custom transports). */
  webSocketFactory?: AcpWebSocketFactory;
  /**
   * Permission policy. `"ask"` (default) surfaces ACP permission requests as
   * tool-call approvals in the UI; `"auto-allow"` answers them automatically.
   */
  permissions?: AcpPermissionsMode;
  /** Connect on mount. Defaults to true. */
  autoConnect?: boolean;

  /** Called when an error occurs. */
  onError?: (error: Error) => void;
  /** Called when a run is cancelled. */
  onCancel?: () => void;

  adapters?: {
    attachments?: AttachmentAdapter;
    speech?: SpeechSynthesisAdapter;
    dictation?: DictationAdapter;
    voice?: RealtimeVoiceAdapter;
    feedback?: FeedbackAdapter;
    history?: ThreadHistoryAdapter;
  };
};

type ManagedAcpClientOptions = Pick<
  AcpClientOptions,
  "url" | "cwd" | "mcpServers" | "clientInfo" | "webSocketFactory"
>;

const serializeManagedClientOptions = (
  options: Omit<ManagedAcpClientOptions, "webSocketFactory">,
): string => JSON.stringify(options);

export function useAcpRuntime(options: UseAcpRuntimeOptions): AssistantRuntime {
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const runtimeAdapters = useRuntimeAdapters();
  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;

  const managedClientOptionsKey = options.client
    ? null
    : options.url
      ? serializeManagedClientOptions({
          url: options.url,
          cwd: options.cwd,
          mcpServers: options.mcpServers,
          clientInfo: options.clientInfo,
        })
      : null;

  const webSocketFactory = options.webSocketFactory;
  const client = useMemo(() => {
    if (options.client) return options.client;
    if (!managedClientOptionsKey) {
      throw new Error("useAcpRuntime requires either `client` or `url`");
    }

    return new AcpClient({
      ...(JSON.parse(managedClientOptionsKey) as Omit<
        ManagedAcpClientOptions,
        "webSocketFactory"
      >),
      ...(webSocketFactory && { webSocketFactory }),
    });
  }, [managedClientOptionsKey, options.client, webSocketFactory]);

  const core = useMemo(
    () =>
      new AcpThreadRuntimeCore({
        client,
        notifyUpdate,
      }),
    [client, notifyUpdate],
  );

  core.updateOptions({
    client,
    permissions: options.permissions,
    autoConnect: options.autoConnect,
    ...(options.onError && { onError: options.onError }),
    ...(options.onCancel && { onCancel: options.onCancel }),
    ...(historyAdapter && { history: historyAdapter }),
  });

  // Adapters
  const adapters = options.adapters;
  const adapterAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
    }),
    [adapters, runtimeAdapters],
  );

  // Build store adapter
  const shared = useExternalStoreSharedOptions(options);
  const store = useMemo(() => {
    void _version;

    return {
      ...shared,
      isLoading: core.isLoading,
      messageRepository: core.getMessageRepository(),
      isRunning: core.isRunning(),
      extras: acpExtras.provide(core.getExtras()),
      onNew: (message: AppendMessage) => core.append(message),
      onEdit: (message: AppendMessage) => core.edit(message),
      onReload: (parentId: string | null) => core.reload(parentId),
      onCancel: () => core.cancel(),
      onRespondToToolApproval: (approval: RespondToToolApprovalOptions) =>
        core.respondToApproval(approval),
      setMessages: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      onImport: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      adapters: adapterAdapters,
    } satisfies ExternalStoreAdapter<ThreadMessage>;
  }, [adapterAdapters, core, _version, shared]);

  const runtime = useExternalStoreRuntime(store);

  // Subscribe the committed core to the client. This must run in an effect
  // (not in the core's constructor): React runs useMemo factories for render
  // passes it may later discard (StrictMode double-invocation, interrupted
  // renders), and a discarded core must never steal the client's callbacks
  // from the committed one — that silently drops every session/update
  // notification (assistant messages complete with empty content).
  useEffect(() => {
    core.attachClient();
    return () => {
      core.detachClient();
    };
  }, [core]);

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
