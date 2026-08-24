"use client";

import {
  ExportedMessageRepository,
  pickExternalStoreSharedOptions,
  useAui,
  useAuiState,
  useExternalStoreRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type {
  AppendMessage,
  AssistantRuntime,
  ExternalStoreAdapter,
  ThreadMessage,
  ThreadMessageLike,
} from "@assistant-ui/react";
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type {
  OpenCodeRuntimeOptions,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
} from "./types";
import { OpenCodeEventSource } from "./OpenCodeEventSource";
import { toOpenCodePermissionResponse } from "./openCodePermissionApproval";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { projectOpenCodeThreadRepository } from "./openCodeMessageProjection";
import { EMPTY_OPENCODE_THREAD_STATE } from "./openCodeThreadState";
import { openCodeExtras } from "./openCodeExtras";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";
import { useOpenCodeControllerState } from "./useOpenCodeControllerState";
import { useOpenCodeStreamingTiming } from "./useOpenCodeStreamingTiming";

type OpenCodeControllerRegistry = {
  getEventSource(): OpenCodeEventSource;
  controllers: Map<string, OpenCodeThreadController>;
  dispose(): void;
};

const createRegistry = (
  client: ReturnType<typeof createOpencodeClient>,
): OpenCodeControllerRegistry => {
  let eventSource: OpenCodeEventSource | null = null;
  const controllers = new Map<string, OpenCodeThreadController>();

  const getEventSource = () => {
    eventSource ??= new OpenCodeEventSource(client);
    return eventSource;
  };

  return {
    getEventSource,
    controllers,
    dispose() {
      eventSource?.dispose();
      eventSource = null;
      for (const controller of controllers.values()) {
        controller.dispose();
      }
      // Keep controllers cached across React StrictMode cleanup/remount.
      // Cleanup only detaches subscriptions; a real unmount drops this registry.
    },
  };
};

const getController = (
  registry: OpenCodeControllerRegistry,
  client: ReturnType<typeof createOpencodeClient>,
  sessionId: string,
) => {
  const existing = registry.controllers.get(sessionId);
  if (existing) return existing;

  const controller = new OpenCodeThreadController(
    client,
    registry.getEventSource,
    sessionId,
  );
  registry.controllers.set(sessionId, controller);
  return controller;
};

const NOOP_CONTROLLER: OpenCodeThreadControllerLike = {
  getState: () => EMPTY_OPENCODE_THREAD_STATE,
  subscribe: () => () => {},
  load: async () => {},
  refresh: async () => {},
  sendMessage: async () => {},
  stageMessage: async () => {},
  sendStagedMessage: async () => false,
  cancel: async () => {},
  revert: async () => {},
  unrevert: async () => {},
  fork: async () => "",
  replyToPermission: async () => {},
  replyToQuestion: async () => {},
  rejectQuestion: async () => {},
};

const NOOP_ON_NEW = () =>
  Promise.reject(new Error("OpenCode session is still initializing"));

const isOpenCodeStateRunning = (state: OpenCodeThreadState): boolean =>
  state.runState.type === "streaming" ||
  state.runState.type === "cancelling" ||
  state.runState.type === "reverting" ||
  state.sessionStatus?.type === "busy" ||
  state.sessionStatus?.type === "retry";

const reportErrorCallbackFailure = (error: unknown) => {
  console.error("[react-opencode] onError callback threw an error", error);
};

const invokeErrorCallback = (
  callback: ((error: unknown) => void | Promise<void>) | undefined,
  error: unknown,
) => {
  if (!callback) return;

  try {
    void Promise.resolve(callback(error)).catch(reportErrorCallbackFailure);
  } catch (callbackError) {
    reportErrorCallbackFailure(callbackError);
  }
};

const sendOpenCodeMessage = (
  controller: OpenCodeThreadControllerLike,
  message: AppendMessage,
  options: OpenCodeRuntimeOptions,
) => {
  const sendOptions = {
    model: options.defaultModel,
    agent: options.defaultAgent,
  };
  if (!(message.startRun ?? message.role === "user")) {
    return controller.stageMessage(message, sendOptions);
  }
  return controller.sendMessage(message, sendOptions);
};

const useOpenCodeThreadStore = (
  controller: OpenCodeThreadControllerLike,
  options: OpenCodeRuntimeOptions,
): ExternalStoreAdapter<ThreadMessage> => {
  const state = useOpenCodeControllerState(controller);
  const onLoadError = useEffectEvent((error: unknown) => {
    invokeErrorCallback(options.onError, error);
  });

  useEffect(() => {
    if (controller === NOOP_CONTROLLER) return;
    void controller.load().catch(onLoadError);
  }, [controller]);

  const isRunning = isOpenCodeStateRunning(state);

  const messageTiming = useOpenCodeStreamingTiming(state, isRunning);

  const messageRepository = useMemo(
    () => projectOpenCodeThreadRepository(state, messageTiming),
    [state, messageTiming],
  );

  const extras = useMemo(
    () =>
      openCodeExtras.provide({
        session: state.session,
        state,
        permissions: state.interactions.permissions.pending,
        questions: state.interactions.questions.pending,
        fork: (messageId: string) => controller.fork(messageId),
        revert: (messageId: string) => controller.revert(messageId),
        unrevert: () => controller.unrevert(),
        cancel: () => controller.cancel(),
        refresh: () => controller.refresh(),
        replyToPermission: (
          permissionId: string,
          response: "once" | "always" | "reject",
        ) => controller.replyToPermission(permissionId, response),
        replyToQuestion: (
          questionId: string,
          answers: readonly import("./types").QuestionAnswer[],
        ) => controller.replyToQuestion(questionId, answers),
        rejectQuestion: (questionId: string) =>
          controller.rejectQuestion(questionId),
      }),
    [controller, state],
  );

  return useMemo<ExternalStoreAdapter<ThreadMessage>>(
    () => ({
      ...pickExternalStoreSharedOptions(options),
      isLoading: state.loadState.type === "loading",
      isRunning: isOpenCodeStateRunning(state),
      messageRepository,
      extras,
      ...(options.adapters && { adapters: options.adapters }),
      onNew: async (message: AppendMessage) => {
        try {
          await sendOpenCodeMessage(controller, message, options);
        } catch (error) {
          invokeErrorCallback(options.onError, error);
          throw error;
        }
      },
      onCancel: async () => {
        try {
          await controller.cancel();
        } catch (error) {
          invokeErrorCallback(options.onError, error);
          throw error;
        }
      },
      onRespondToToolApproval: async (response) => {
        try {
          await controller.replyToPermission(
            response.approvalId,
            toOpenCodePermissionResponse(response),
          );
        } catch (error) {
          invokeErrorCallback(options.onError, error);
          throw error;
        }
      },
      onReload: async (parentId: string | null) => {
        if (!parentId) return;
        try {
          const sentStagedMessage = await controller.sendStagedMessage(
            parentId,
            {
              model: options.defaultModel,
              agent: options.defaultAgent,
            },
          );
          if (sentStagedMessage) return;

          await controller.revert(parentId);
        } catch (error) {
          invokeErrorCallback(options.onError, error);
          throw error;
        }
      },
    }),
    [controller, extras, messageRepository, options, state],
  );
};

const toOptimisticThreadMessage = (
  message: AppendMessage,
  index: number,
): ThreadMessageLike => ({
  id: `opencode-new-user:${index}`,
  role: "user",
  createdAt: message.createdAt,
  content: message.content,
  attachments: message.attachments,
});

type PendingInitialOpenCodeMessage = {
  message: AppendMessage;
};

const useNewOpenCodeThreadStore = (
  options: OpenCodeRuntimeOptions,
  enabled: boolean,
  extras: unknown,
  pendingInitialMessageRef: {
    current: PendingInitialOpenCodeMessage | undefined;
  },
): ExternalStoreAdapter<ThreadMessage> => {
  const aui = useAui();
  const [optimisticMessages, setOptimisticMessages] = useState<
    readonly ThreadMessageLike[]
  >([]);
  const optimisticMessageIndexRef = useRef(0);
  const optimisticRepository = useMemo(
    () => ExportedMessageRepository.fromArray(optimisticMessages),
    [optimisticMessages],
  );

  return useMemo<ExternalStoreAdapter<ThreadMessage>>(
    () => ({
      ...pickExternalStoreSharedOptions(options),
      isDisabled: options.isDisabled || !enabled,
      isLoading: !enabled,
      isRunning: false,
      messageRepository: optimisticRepository,
      extras,
      ...(options.adapters && { adapters: options.adapters }),
      onNew: async (message: AppendMessage) => {
        if (!enabled) return NOOP_ON_NEW();

        const optimistic = toOptimisticThreadMessage(
          message,
          optimisticMessageIndexRef.current++,
        );
        const pending = { message };
        pendingInitialMessageRef.current = pending;
        setOptimisticMessages((messages) => [...messages, optimistic]);
        try {
          await aui.threadListItem.initialize();
          setOptimisticMessages([]);
        } catch (error) {
          if (pendingInitialMessageRef.current === pending) {
            pendingInitialMessageRef.current = undefined;
          }
          setOptimisticMessages((messages) =>
            messages.filter((candidate) => candidate !== optimistic),
          );
          invokeErrorCallback(options.onError, error);
          throw error;
        }
      },
    }),
    [
      aui,
      enabled,
      extras,
      optimisticRepository,
      options,
      pendingInitialMessageRef,
    ],
  );
};

const useRuntimeHook = (
  client: ReturnType<typeof createOpencodeClient>,
  registry: OpenCodeControllerRegistry,
  options: OpenCodeRuntimeOptions,
  pendingInitialMessageRef: {
    current: PendingInitialOpenCodeMessage | undefined;
  },
) => {
  const threadListItem = useAuiState((state) => state.threadListItem);
  const sessionId = threadListItem.externalId ?? threadListItem.remoteId;

  const controller = sessionId
    ? getController(registry, client, sessionId)
    : NOOP_CONTROLLER;

  const threadStore = useOpenCodeThreadStore(controller, options);
  const newThreadStore = useNewOpenCodeThreadStore(
    options,
    threadListItem.status === "new",
    threadStore.extras,
    pendingInitialMessageRef,
  );

  return useExternalStoreRuntime<ThreadMessage>(
    sessionId ? threadStore : newThreadStore,
  );
};

export const useOpenCodeRuntime = (
  options: OpenCodeRuntimeOptions = {},
): AssistantRuntime => {
  const baseUrl = options.baseUrl ?? "http://localhost:4096";
  const client = useMemo(
    () => options.client ?? createOpencodeClient({ baseUrl }),
    [baseUrl, options.client],
  );
  const registry = useMemo(() => createRegistry(client), [client]);
  const pendingInitialMessageRef = useRef<
    PendingInitialOpenCodeMessage | undefined
  >(undefined);

  useEffect(() => {
    return () => {
      registry.dispose();
    };
  }, [registry]);

  const adapter = useMemo(() => {
    const base = createOpenCodeThreadListAdapter(client);
    return {
      ...base,
      initialize: async () => {
        const pending = pendingInitialMessageRef.current;
        pendingInitialMessageRef.current = undefined;
        const ids = await base.initialize();
        if (pending) {
          const sessionId = ids.externalId ?? ids.remoteId;
          const controller = getController(registry, client, sessionId);
          await sendOpenCodeMessage(controller, pending.message, options);
        }
        return ids;
      },
    };
  }, [client, options, registry]);

  return useRemoteThreadListRuntime({
    allowNesting: true,
    adapter,
    initialThreadId: options.initialSessionId,
    onThreadIdChange: options.onThreadIdChange,
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- runtimeHook callback is invoked by useRemoteThreadListRuntime at the appropriate hook position
    runtimeHook: () =>
      useRuntimeHook(client, registry, options, pendingInitialMessageRef),
  });
};
