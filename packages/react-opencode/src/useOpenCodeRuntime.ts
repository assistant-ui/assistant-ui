"use client";

import {
  ExportedMessageRepository,
  pickExternalStoreSharedOptions,
  useAuiState,
  useExternalStoreRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type {
  AppendMessage,
  AssistantRuntime,
  ThreadMessage,
} from "@assistant-ui/react";
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import { useEffect, useEffectEvent, useMemo } from "react";
import type {
  OpenCodeRuntimeOptions,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
} from "./types";
import { OpenCodeEventSource } from "./OpenCodeEventSource";
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
  hasStagedMessages: () => false,
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

const useOpenCodeThreadRuntime = (
  controller: OpenCodeThreadControllerLike,
  options: OpenCodeRuntimeOptions,
): AssistantRuntime => {
  const state = useOpenCodeControllerState(controller);
  const onLoadError = useEffectEvent((error: unknown) => {
    options.onError?.(error);
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

  return useExternalStoreRuntime<ThreadMessage>({
    ...pickExternalStoreSharedOptions(options),
    isLoading: state.loadState.type === "loading",
    isRunning: isOpenCodeStateRunning(state),
    messageRepository,
    extras,
    ...(options.adapters && { adapters: options.adapters }),
    onNew: async (message: AppendMessage) => {
      try {
        const sendOptions = {
          model: options.defaultModel,
          agent: options.defaultAgent,
        };
        if (!(message.startRun ?? message.role === "user")) {
          await controller.stageMessage(message, sendOptions);
          return;
        }
        await controller.sendMessage(message, sendOptions);
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
    onCancel: async () => {
      try {
        await controller.cancel();
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
    ...(controller.hasStagedMessages() && {
      onReload: async (parentId: string | null) => {
        if (!parentId) return;
        try {
          await controller.sendStagedMessage(parentId, {
            model: options.defaultModel,
            agent: options.defaultAgent,
          });
        } catch (error) {
          options.onError?.(error);
          throw error;
        }
      },
    }),
  });
};

const useRuntimeHook = (
  client: ReturnType<typeof createOpencodeClient>,
  registry: OpenCodeControllerRegistry,
  options: OpenCodeRuntimeOptions,
) => {
  const sessionId = useAuiState(
    (state) => state.threadListItem.externalId ?? state.threadListItem.remoteId,
  );

  const controller = sessionId
    ? getController(registry, client, sessionId)
    : NOOP_CONTROLLER;

  const threadRuntime = useOpenCodeThreadRuntime(controller, options);

  const fallbackRuntime = useExternalStoreRuntime<ThreadMessage>({
    isDisabled: true,
    isLoading: true,
    messageRepository: ExportedMessageRepository.fromArray([]),
    onNew: NOOP_ON_NEW,
  });

  if (!sessionId) return fallbackRuntime;
  return threadRuntime;
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
