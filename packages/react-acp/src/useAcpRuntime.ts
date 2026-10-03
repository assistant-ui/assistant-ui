"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { invokeUserCallback } from "@assistant-ui/core/internal";
import {
  AcpClient,
  type AcpClientOptions,
  type AcpWebSocketFactory,
  type AcpWebSocketLike,
} from "./AcpClient";
import {
  AcpThreadController,
  type AcpPermissionsMode,
} from "./AcpThreadController";
import { isAcpStateRunning } from "./acpThreadState";
import { projectAcpThreadRepository } from "./acpMessageProjection";
import { useAcpControllerState } from "./useAcpControllerState";
import { acpExtras } from "./acpExtras";
import type { AcpImplementation, AcpMcpServer } from "./types";

export type UseAcpRuntimeOptions = ExternalStoreSharedOptions & {
  /** Pre-built ACP client instance. Provide this OR `url`. */
  client?: AcpClient;
  /** WebSocket endpoint of the ACP agent, e.g. `ws://127.0.0.1:2770/`. */
  url?: string;
  /**
   * Working directory passed to `session/new`. ACP requires an absolute path;
   * defaults to `"/"`.
   */
  cwd?: string;
  /** MCP servers passed to `session/new`. */
  mcpServers?: readonly AcpMcpServer[];
  /** Client identity for the `initialize` handshake. */
  clientInfo?: AcpImplementation;
  /** Inject a WebSocket implementation (tests / custom transports). */
  webSocketFactory?: AcpWebSocketFactory;
  /**
   * Permission policy. `"ask"` (default) surfaces ACP permission requests as
   * tool-call approvals in the UI; `"auto-allow"` answers them with the
   * agent's first allow-family option.
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
  "url" | "cwd" | "mcpServers" | "clientInfo"
>;

type AcpRegistry = {
  readonly key: string;
  readonly client: AcpClient;
  readonly controller: AcpThreadController;
  activate(): void;
  release(): void;
};

const createRegistry = (
  key: string,
  client: AcpClient,
  ownsClient: boolean,
): AcpRegistry => {
  let disposeTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    key,
    client,
    controller: new AcpThreadController({ client }),
    activate() {
      if (disposeTimer === undefined) return;
      clearTimeout(disposeTimer);
      disposeTimer = undefined;
    },
    release() {
      if (!ownsClient) return;
      disposeTimer ??= setTimeout(() => {
        disposeTimer = undefined;
        void client.cancel().then(
          () => client.dispose(),
          () => client.dispose(),
        );
      }, 0);
    },
  };
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const buildManagedClientOptions = (
  options: UseAcpRuntimeOptions,
): ManagedAcpClientOptions => {
  const { url } = options;
  if (!url) throw new Error("useAcpRuntime requires either `client` or `url`");
  return {
    url,
    ...(options.cwd !== undefined && { cwd: options.cwd }),
    mcpServers: options.mcpServers ?? [],
    ...(options.clientInfo && { clientInfo: options.clientInfo }),
  };
};

export function useAcpRuntime(options: UseAcpRuntimeOptions): AssistantRuntime {
  const runtimeAdapters = useRuntimeAdapters();
  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;

  const webSocketFactory = options.webSocketFactory;
  const webSocketFactoryRef = useRef(webSocketFactory);
  useEffect(() => {
    webSocketFactoryRef.current = webSocketFactory;
  }, [webSocketFactory]);

  const stableWebSocketFactory = useMemo<AcpWebSocketFactory>(
    () => (url) => {
      const factory = webSocketFactoryRef.current;
      if (factory) return factory(url);
      return new WebSocket(url) as unknown as AcpWebSocketLike;
    },
    [],
  );

  const externalClient = options.client;
  const managedClientOptions = externalClient
    ? undefined
    : buildManagedClientOptions(options);
  const registryKey = externalClient
    ? "external"
    : JSON.stringify(managedClientOptions);

  const createRegistryClient = () =>
    externalClient
      ? externalClient
      : new AcpClient({
          ...managedClientOptions!,
          webSocketFactory: stableWebSocketFactory,
        });

  const ownsClient = !externalClient;

  const [pinned, setPinned] = useState(() =>
    createRegistry(registryKey, createRegistryClient(), ownsClient),
  );

  let registry = pinned;
  const clientChanged = externalClient
    ? registry.client !== externalClient
    : registry.key !== registryKey;
  if (clientChanged) {
    registry = createRegistry(registryKey, createRegistryClient(), ownsClient);
    setPinned(registry);
  }

  const { controller, client } = registry;

  useEffect(() => {
    registry.activate();
    void controller.attach();
    return () => {
      void controller.detach();
      registry.release();
    };
  }, [controller, registry]);

  const permissions = options.permissions;
  const autoConnect = options.autoConnect;
  const onError = options.onError;
  const onCancel = options.onCancel;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await controller.updateOptions({
        client,
        permissions,
        autoConnect,
        ...(onError && { onError }),
        ...(onCancel && { onCancel }),
        ...(historyAdapter && { history: historyAdapter }),
      });
      if (cancelled) return;
      await controller.load();
    })().catch((error: unknown) => {
      invokeUserCallback("react-acp", "onError", onError, toError(error));
    });
    return () => {
      cancelled = true;
    };
  }, [
    autoConnect,
    client,
    controller,
    historyAdapter,
    onCancel,
    onError,
    permissions,
  ]);

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

  const state = useAcpControllerState(controller);

  const messageRepository = useMemo(
    () => projectAcpThreadRepository(state),
    [state],
  );

  const extras = useMemo(
    () =>
      acpExtras.provide({
        connectionState: state.connectionState,
        sessionId: state.sessionId,
        agentInfo: state.agentInfo,
        agentCapabilities: state.agentCapabilities,
        plan: state.plan,
        sessionTitle: state.sessionTitle,
        currentModeId: state.currentModeId,
        availableCommands: state.availableCommands,
        configOptions: state.configOptions,
        usage: state.usage,
      }),
    [state],
  );

  const shared = useExternalStoreSharedOptions(options);
  const isLoading = state.loadState.type === "loading";
  const isRunning = isAcpStateRunning(state);

  const store = useMemo(
    () =>
      ({
        ...shared,
        isLoading,
        isRunning,
        unstable_persistsHistory: true,
        messageRepository,
        extras,
        onNew: (message: AppendMessage) => controller.append(message),
        onCancel: () => controller.cancel(),
        onRespondToToolApproval: (approval: RespondToToolApprovalOptions) =>
          controller.respondToApproval(approval),
        setMessages: (messages: readonly ThreadMessage[]) =>
          controller.applyExternalMessages(messages),
        onImport: (messages: readonly ThreadMessage[]) =>
          controller.applyExternalMessages(messages),
        adapters: adapterAdapters,
      }) satisfies ExternalStoreAdapter<ThreadMessage>,
    [
      adapterAdapters,
      controller,
      extras,
      isLoading,
      isRunning,
      messageRepository,
      shared,
    ],
  );

  return useExternalStoreRuntime(store);
}
