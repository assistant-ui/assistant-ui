"use client";

import {
  ExportedMessageRepository,
  unstable_useRemoteThreadListRuntime,
  useAuiState,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import type { AssistantRuntime, ThreadMessage } from "@assistant-ui/react";
import {
  createOpencodeClient,
  type GlobalSession,
} from "@opencode-ai/sdk/v2/client";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  OpenCodeRuntimeExtras,
  OpenCodeRuntimeOptions,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
} from "./types";
import { OpenCodeEventSource } from "./OpenCodeEventSource";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { projectOpenCodeThreadRepository } from "./openCodeMessageProjection";
import { createOpenCodeThreadState } from "./openCodeThreadState";

type OpenCodeControllerRegistry = {
  eventSource: OpenCodeEventSource;
  controllers: Map<string, OpenCodeThreadController>;
  dispose(): void;
};

const symbolOpenCodeRuntimeExtras = Symbol("opencode-runtime-extras");

type OpenCodeRuntimeExtrasInternal = OpenCodeRuntimeExtras & {
  [symbolOpenCodeRuntimeExtras]: true;
};

const isOpenCodeRuntimeExtras = (
  extras: unknown,
): extras is OpenCodeRuntimeExtrasInternal => {
  return (
    typeof extras === "object" &&
    extras != null &&
    symbolOpenCodeRuntimeExtras in extras
  );
};

const asOpenCodeRuntimeExtras = (extras: unknown) => {
  if (!isOpenCodeRuntimeExtras(extras)) {
    throw new Error(
      "This hook can only be used inside an OpenCode runtime context",
    );
  }

  return extras;
};

const tryGetOpenCodeRuntimeExtras = (extras: unknown) => {
  return isOpenCodeRuntimeExtras(extras) ? extras : undefined;
};

const EMPTY_THREAD_STATE = createOpenCodeThreadState("__pending__");

const createRegistry = (
  client: ReturnType<typeof createOpencodeClient>,
): OpenCodeControllerRegistry => {
  const eventSource = new OpenCodeEventSource(client);
  const controllers = new Map<string, OpenCodeThreadController>();

  return {
    eventSource,
    controllers,
    dispose() {
      eventSource.dispose();
      for (const controller of controllers.values()) {
        controller.dispose();
      }
      controllers.clear();
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
    registry.eventSource,
    sessionId,
  );
  registry.controllers.set(sessionId, controller);
  return controller;
};

const NOOP_CONTROLLER: OpenCodeThreadControllerLike = {
  getState: () => EMPTY_THREAD_STATE,
  subscribe: () => () => {},
  load: async () => {},
  refresh: async () => {},
  sendMessage: async () => {},
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

const useOpenCodeControllerState = (
  controller: OpenCodeThreadControllerLike,
): OpenCodeThreadState => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  return useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
    () => controller.getState(),
  );
};

const useOpenCodeThreadRuntime = (
  controller: OpenCodeThreadControllerLike,
  options: OpenCodeRuntimeOptions,
): AssistantRuntime => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const state = useOpenCodeControllerState(controller);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const onLoadError = useEffectEvent((error: unknown) => {
    options.onError?.(error);
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  useEffect(() => {
    if (controller === NOOP_CONTROLLER) return;
    void controller.load().catch(onLoadError);
  }, [controller]);

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const messageRepository = useMemo(
    () => projectOpenCodeThreadRepository(state),
    [state],
  );

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const extras = useMemo(
    () =>
      ({
        [symbolOpenCodeRuntimeExtras]: true,
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
      }) satisfies OpenCodeRuntimeExtrasInternal,
    [controller, state],
  );

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  return useExternalStoreRuntime<ThreadMessage>({
    isLoading: state.loadState.type === "loading",
    isRunning:
      state.runState.type === "streaming" ||
      state.runState.type === "cancelling" ||
      state.runState.type === "reverting" ||
      state.sessionStatus?.type === "busy" ||
      state.sessionStatus?.type === "retry",
    messageRepository,
    extras,
    onNew: async (message: any) => {
      try {
        const sendOptions = {
          model: options.defaultModel,
          agent: options.defaultAgent,
        };
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
    onReload: async (parentId: string | null) => {
      if (!parentId) return;
      try {
        await controller.revert(parentId);
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
  });
};

const useRuntimeHook = (
  client: ReturnType<typeof createOpencodeClient>,
  registry: OpenCodeControllerRegistry,
  options: OpenCodeRuntimeOptions,
) => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const sessionId = useAuiState(
    (state: any) =>
      state.threadListItem.externalId ?? state.threadListItem.remoteId,
  );

  const controller = sessionId
    ? getController(registry, client, sessionId)
    : NOOP_CONTROLLER;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadRuntime = useOpenCodeThreadRuntime(controller, options);

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const fallbackRuntime = useExternalStoreRuntime<ThreadMessage>({
    isDisabled: true,
    isLoading: true,
    messageRepository: ExportedMessageRepository.fromArray([]),
    onNew: NOOP_ON_NEW,
  });

  if (!sessionId) return fallbackRuntime;
  return threadRuntime;
};

const isArchivedSession = (session: Pick<GlobalSession, "time">) => {
  return typeof session.time.archived === "number";
};

const mapThreadMetadata = (session: {
  id: string;
  title: string;
  time: { archived?: number };
}) => ({
  status: isArchivedSession(session as GlobalSession)
    ? ("archived" as const)
    : ("regular" as const),
  remoteId: session.id,
  externalId: session.id,
  title: session.title,
});

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
    () => ({
      list: async () => {
        const response = await client.experimental.session.list({
          roots: true,
          archived: true,
        });
        const sessions = new Map<string, GlobalSession>();

        for (const session of response.data ?? []) {
          if (session.parentID) continue;
          sessions.set(session.id, session);
        }

        return {
          threads: [...sessions.values()].map(mapThreadMetadata),
        };
      },
      rename: async (remoteId: string, newTitle: string) => {
        await client.session.update({
          sessionID: remoteId,
          title: newTitle,
        });
      },
      archive: async (remoteId: string) => {
        await client.session.update({
          sessionID: remoteId,
          time: { archived: Date.now() },
        });
      },
      unarchive: async (remoteId: string) => {
        await client.session.update({
          sessionID: remoteId,
          // The SDK models archived timestamps as numbers, but OpenCode uses
          // `null` here to clear the archived flag when unarchiving.
          time: { archived: null as never } as never,
        });
      },
      delete: async (remoteId: string) => {
        await client.session.delete({
          sessionID: remoteId,
        });
      },
      initialize: async () => {
        const response = await client.session.create({});
        if (!response.data?.id) {
          throw new Error("Failed to create OpenCode session");
        }
        return {
          remoteId: response.data.id,
          externalId: response.data.id,
        };
      },
      generateTitle: async (remoteId: string) => {
        await client.session.summarize({
          sessionID: remoteId,
        });
        // Title updates arrive through the OpenCode event stream, so this
        // placeholder stream only satisfies the remote thread list contract.
        return new ReadableStream({
          start(controller) {
            controller.close();
          },
        }) as never;
      },
      fetch: async (threadId: string) => {
        const response = await client.session.get({
          sessionID: threadId,
        });
        if (!response.data?.id) {
          throw new Error("OpenCode session not found");
        }
        return mapThreadMetadata(response.data as GlobalSession);
      },
    }),
    [client],
  );

  return unstable_useRemoteThreadListRuntime({
    allowNesting: true,
    adapter,
    initialThreadId: options.initialSessionId,
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    runtimeHook: () => useRuntimeHook(client, registry, options),
  });
};

export const useOpenCodeRuntimeExtras = (): OpenCodeRuntimeExtras => {
  return useAuiState((state: any) =>
    asOpenCodeRuntimeExtras(state.thread.extras),
  );
};

export const useOpenCodeSession = () => {
  return useAuiState((state: any) => {
    return tryGetOpenCodeRuntimeExtras(state.thread.extras)?.session ?? null;
  });
};

export function useOpenCodeThreadState(): OpenCodeThreadState;
export function useOpenCodeThreadState<T>(
  selector: (state: OpenCodeThreadState) => T,
): T;
export function useOpenCodeThreadState<T>(
  selector?: (state: OpenCodeThreadState) => T,
) {
  return useAuiState((state: any) => {
    const extras = tryGetOpenCodeRuntimeExtras(state.thread.extras);
    const threadState = extras?.state ?? EMPTY_THREAD_STATE;
    return selector ? selector(threadState) : threadState;
  });
}

export const useOpenCodePermissions = () => {
  const extras = useAuiState((state: any) =>
    tryGetOpenCodeRuntimeExtras(state.thread.extras),
  );

  return useMemo(
    () => ({
      pending: extras
        ? (Object.values(extras.permissions) as Array<
            OpenCodeRuntimeExtras["permissions"][string]
          >)
        : [],
      reply:
        extras?.replyToPermission ??
        (async () => {
          throw new Error("OpenCode runtime is not ready yet");
        }),
    }),
    [extras],
  );
};

export const useOpenCodeQuestions = () => {
  const extras = useAuiState((state: any) =>
    tryGetOpenCodeRuntimeExtras(state.thread.extras),
  );

  return useMemo(
    () =>
      extras
        ? (Object.values(extras.questions) as Array<
            OpenCodeRuntimeExtras["questions"][string]
          >)
        : [],
    [extras],
  );
};
