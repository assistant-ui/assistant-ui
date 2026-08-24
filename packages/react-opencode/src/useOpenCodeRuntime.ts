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

const useNewOpenCodeThreadStore = (
  client: ReturnType<typeof createOpencodeClient>,
  registry: OpenCodeControllerRegistry,
  options: OpenCodeRuntimeOptions,
  extras: unknown,
): ExternalStoreAdapter<ThreadMessage> => {
  const aui = useAui();
  const [optimisticMessages, setOptimisticMessages] = useState<
    readonly ThreadMessageLike[]
  >([]);
  const optimisticMessageIndexRef = useRef(0);
  const initializationRef = useRef<
    Promise<{ remoteId: string; externalId: string | undefined }> | undefined
  >(undefined);
  const sendQueueRef = useRef(Promise.resolve());
  const optimisticRepository = useMemo(
    () => ExportedMessageRepository.fromArray(optimisticMessages),
    [optimisticMessages],
  );

  return useMemo<ExternalStoreAdapter<ThreadMessage>>(
    () => ({
      ...pickExternalStoreSharedOptions(options),
      isDisabled: options.isDisabled ?? false,
      isLoading: false,
      isRunning: false,
      messageRepository: optimisticRepository,
      extras,
      ...(options.adapters && { adapters: options.adapters }),
      onNew: async (message: AppendMessage) => {
        const optimistic = toOptimisticThreadMessage(
          message,
          optimisticMessageIndexRef.current++,
        );
        setOptimisticMessages((messages) => [...messages, optimistic]);

        const task = sendQueueRef.current.then(async () => {
          let initialization:
            | Promise<{
                remoteId: string;
                externalId: string | undefined;
              }>
            | undefined;
          try {
            initialization =
              initializationRef.current ??
              (initializationRef.current = aui.threadListItem.initialize());
            const { remoteId, externalId } = await initialization;
            const sessionId = externalId ?? remoteId;
            const controller = getController(registry, client, sessionId);
            const dispatch = sendOpenCodeMessage(controller, message, options);
            setOptimisticMessages((messages) =>
              messages.filter((candidate) => candidate !== optimistic),
            );
            await dispatch;
          } catch (error) {
            setOptimisticMessages((messages) =>
              messages.filter((candidate) => candidate !== optimistic),
            );
            invokeErrorCallback(options.onError, error);
            throw error;
          } finally {
            if (initializationRef.current === initialization) {
              initializationRef.current = undefined;
            }
          }
        });
        sendQueueRef.current = task.catch(() => {});
        return task;
      },
    }),
    [aui, client, extras, optimisticRepository, options, registry],
  );
};

const useRuntimeHook = (
  client: ReturnType<typeof createOpencodeClient>,
  registry: OpenCodeControllerRegistry,
  options: OpenCodeRuntimeOptions,
) => {
  const threadListItem = useAuiState((state) => state.threadListItem);
  const sessionId = threadListItem.externalId ?? threadListItem.remoteId;

  const controller = sessionId
    ? getController(registry, client, sessionId)
    : NOOP_CONTROLLER;

  const threadStore = useOpenCodeThreadStore(controller, options);
  const newThreadStore = useNewOpenCodeThreadStore(
    client,
    registry,
    options,
    threadStore.extras,
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

  useEffect(() => {
    return () => {
      registry.dispose();
    };
  }, [registry]);

  const adapter = useMemo(
    () => createOpenCodeThreadListAdapter(client),
    [client],
  );

  return useRemoteThreadListRuntime({
    allowNesting: true,
    adapter,
    initialThreadId: options.initialSessionId,
    onThreadIdChange: options.onThreadIdChange,
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- runtimeHook callback is invoked by useRemoteThreadListRuntime at the appropriate hook position
    runtimeHook: () => useRuntimeHook(client, registry, options),
  });
};
