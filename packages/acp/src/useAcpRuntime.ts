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

type AcpRuntimeConnection =
  | {
      /** Pre-built ACP client instance, used instead of `url`. */
      client: AcpClient;
      url?: never;
      cwd?: never;
      mcpServers?: never;
      clientInfo?: never;
      webSocketFactory?: never;
    }
  | {
      client?: never;
      /** WebSocket endpoint of the ACP agent, e.g. `ws://127.0.0.1:2770/`. */
      url: string;
      /**
       * Absolute working directory on the agent's host, sent with
       * `session/new`. The agent roots its file and terminal tools here.
       */
      cwd: string;
      /** MCP servers passed to `session/new`. */
      mcpServers?: readonly AcpMcpServer[];
      /** Client identity for the `initialize` handshake. */
      clientInfo?: AcpImplementation;
      /** Inject a WebSocket implementation (tests / custom transports). */
      webSocketFactory?: AcpWebSocketFactory;
    };

export type UseAcpRuntimeOptions = ExternalStoreSharedOptions &
  AcpRuntimeConnection & {
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

    /**
     * There is deliberately no `history` adapter: the agent owns an ACP
     * conversation, so a transcript restored from storage would show messages
     * the next `session/new` knows nothing about.
     */
    adapters?: {
      attachments?: AttachmentAdapter;
      speech?: SpeechSynthesisAdapter;
      dictation?: DictationAdapter;
      voice?: RealtimeVoiceAdapter;
      feedback?: FeedbackAdapter;
    };
  };

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

const managedClientOptionsOf = (
  options: UseAcpRuntimeOptions,
): Omit<AcpClientOptions, "webSocketFactory"> | undefined => {
  if (options.client) return undefined;
  return {
    url: options.url,
    cwd: options.cwd,
    mcpServers: options.mcpServers ?? [],
    ...(options.clientInfo && { clientInfo: options.clientInfo }),
  };
};

export function useAcpRuntime(options: UseAcpRuntimeOptions): AssistantRuntime {
  const runtimeAdapters = useRuntimeAdapters();

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
  const managedClientOptions = managedClientOptionsOf(options);
  const registryKey = externalClient
    ? "external"
    : JSON.stringify(managedClientOptions);

  const createRegistryClient = () =>
    externalClient ??
    new AcpClient({
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

  const { controller } = registry;

  useEffect(() => {
    registry.activate();
    controller.attach();
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
    controller.updateOptions({ permissions, autoConnect, onError, onCancel });
    controller.load().catch((error: unknown) => {
      invokeUserCallback("acp", "onError", onError, toError(error));
    });
  }, [autoConnect, controller, onCancel, onError, permissions]);

  const state = useAcpControllerState(controller);

  const adapters = options.adapters;
  const storeAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
      threadList: {
        threadId: state.threadId,
        onSwitchToNewThread: () => controller.startNewThread(),
      },
    }),
    [adapters, controller, runtimeAdapters, state.threadId],
  );

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
        messageRepository,
        extras,
        onNew: (message: AppendMessage) => controller.append(message),
        onCancel: () => controller.cancel(),
        onRespondToToolApproval: (approval: RespondToToolApprovalOptions) =>
          controller.respondToApproval(approval),
        adapters: storeAdapters,
      }) satisfies ExternalStoreAdapter<ThreadMessage>,
    [
      controller,
      extras,
      isLoading,
      isRunning,
      messageRepository,
      shared,
      storeAdapters,
    ],
  );

  return useExternalStoreRuntime<ThreadMessage>(store);
}
