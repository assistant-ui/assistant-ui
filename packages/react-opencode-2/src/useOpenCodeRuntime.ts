"use client";

import {
  unstable_useRemoteThreadListRuntime,
  useAuiState,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type {
  OpenCodeProjectedThreadMessage,
  OpenCodeRuntimeExtras,
  OpenCodeRuntimeOptions,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
} from "./types";
import { OpenCodeEventSource } from "./OpenCodeEventSource";
import { OpenCodeThreadController } from "./OpenCodeThreadController";
import { projectOpenCodeThreadMessages } from "./openCodeMessageProjection";
import { createOpenCodeThreadState } from "./openCodeThreadState";

type OpenCodeControllerRegistry = {
  eventSource: OpenCodeEventSource;
  controllers: Map<string, OpenCodeThreadController>;
};

const symbolOpenCodeRuntimeExtras = Symbol("opencode-runtime-extras");

type OpenCodeRuntimeExtrasInternal = OpenCodeRuntimeExtras & {
  [symbolOpenCodeRuntimeExtras]: true;
};

const asOpenCodeRuntimeExtras = (extras: unknown) => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolOpenCodeRuntimeExtras in extras)
  ) {
    throw new Error(
      "This hook can only be used inside an OpenCode runtime context",
    );
  }

  return extras as OpenCodeRuntimeExtrasInternal;
};

const tryGetOpenCodeRuntimeExtras = (extras: unknown) => {
  try {
    return asOpenCodeRuntimeExtras(extras);
  } catch {
    return undefined;
  }
};

const EMPTY_THREAD_STATE = createOpenCodeThreadState("__pending__");

const createRegistry = (
  client: ReturnType<typeof createOpencodeClient>,
): OpenCodeControllerRegistry => ({
  eventSource: new OpenCodeEventSource(client),
  controllers: new Map(),
});

const getController = (
  registry: OpenCodeControllerRegistry,
  client: ReturnType<typeof createOpencodeClient>,
  baseUrl: string,
  sessionId: string,
) => {
  const existing = registry.controllers.get(sessionId);
  if (existing) return existing;

  const controller = new OpenCodeThreadController(
    client,
    registry.eventSource,
    baseUrl,
    sessionId,
  );
  registry.controllers.set(sessionId, controller);
  return controller;
};

const useOpenCodeControllerState = (
  controller: OpenCodeThreadControllerLike,
): OpenCodeThreadState => {
  return useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
  );
};

const useOpenCodeThreadRuntime = (
  controller: OpenCodeThreadControllerLike,
  options: OpenCodeRuntimeOptions,
): AssistantRuntime => {
  const state = useOpenCodeControllerState(controller);

  useEffect(() => {
    controller.load().catch((error) => {
      options.onError?.(error);
    });
  }, [controller, options]);

  const messages = useMemo(
    () => projectOpenCodeThreadMessages(state),
    [state],
  );

  const extras = useMemo(
    () =>
      ({
        [symbolOpenCodeRuntimeExtras]: true,
        session: state.session,
        state,
        permissions: state.permissions.pending,
        fork: (messageId: string) => controller.fork(messageId),
        revert: (messageId: string) => controller.revert(messageId),
        unrevert: () => controller.unrevert(),
        cancel: () => controller.cancel(),
        refresh: () => controller.refresh(),
        replyToPermission: (
          permissionId: string,
          response: "once" | "always" | "reject",
        ) => controller.replyToPermission(permissionId, response),
      }) satisfies OpenCodeRuntimeExtrasInternal,
    [controller, state],
  );

  return useExternalStoreRuntime({
    isLoading: state.loadState.type === "loading",
    isRunning:
      state.runState.type === "streaming" ||
      state.runState.type === "cancelling" ||
      state.runState.type === "reverting",
    messages,
    extras,
    convertMessage: (message: OpenCodeProjectedThreadMessage) => message,
    onNew: async (message: any) => {
      try {
        const sendOptions =
          options.defaultModel || options.defaultAgent
            ? {
                ...(options.defaultModel
                  ? { model: options.defaultModel }
                  : {}),
                ...(options.defaultAgent
                  ? { agent: options.defaultAgent }
                  : {}),
              }
            : undefined;
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
  baseUrl: string,
  options: OpenCodeRuntimeOptions,
) => {
  const sessionId = useAuiState(
    (state: any) => state.threadListItem.externalId ?? state.threadListItem.remoteId,
  );

  const fallbackRuntime = useExternalStoreRuntime<OpenCodeProjectedThreadMessage>({
    isDisabled: true,
    isLoading: true,
    messages: [] as OpenCodeProjectedThreadMessage[],
    convertMessage: (message: OpenCodeProjectedThreadMessage) => message,
    onNew: async () => {
      throw new Error("OpenCode session is still initializing");
    },
  });

  if (!sessionId) return fallbackRuntime;
  const controller = getController(registry, client, baseUrl, sessionId);
  return useOpenCodeThreadRuntime(controller, options);
};

export const useOpenCodeRuntime = (
  options: OpenCodeRuntimeOptions = {},
): AssistantRuntime => {
  const baseUrl = options.baseUrl ?? "http://localhost:4096";
  const client = useMemo(
    () => options.client ?? createOpencodeClient({ baseUrl }),
    [baseUrl, options.client],
  );
  const registryRef = useRef<OpenCodeControllerRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = createRegistry(client);
  }

  const registry = registryRef.current;

  useEffect(() => {
    return () => {
      registry.eventSource.dispose();
      for (const controller of registry.controllers.values()) {
        controller.dispose();
      }
      registry.controllers.clear();
    };
  }, [registry]);

  const adapter = useMemo(
    () => ({
      list: async () => {
        const response = await client.session.list();
        const sessions = (response.data ?? []).filter(
          (session) => !session.parentID,
        );
        return {
          threads: sessions.map((session) => ({
            status: "regular" as const,
            remoteId: session.id,
            externalId: session.id,
            title: session.title,
          })),
        };
      },
      rename: async (remoteId: string, newTitle: string) => {
        await client.session.update({
          path: { id: remoteId },
          body: { title: newTitle } as never,
        });
      },
      archive: async (_remoteId: string) => {},
      unarchive: async (_remoteId: string) => {},
      delete: async (remoteId: string) => {
        await client.session.delete({
          path: { id: remoteId },
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
          path: { id: remoteId },
        });
        return new ReadableStream({
          start(controller) {
            controller.close();
          },
        }) as never;
      },
      fetch: async (threadId: string) => {
        const response = await client.session.get({
          path: { id: threadId },
        });
        if (!response.data?.id) {
          throw new Error("OpenCode session not found");
        }
        return {
          status: "regular" as const,
          remoteId: response.data.id,
          externalId: response.data.id,
          title: response.data.title,
        };
      },
    }),
    [client],
  );

  return unstable_useRemoteThreadListRuntime({
    allowNesting: true,
    adapter,
    runtimeHook: () => useRuntimeHook(client, registry, baseUrl, options),
  });
};

export const useOpenCodeRuntimeExtras = (): OpenCodeRuntimeExtras => {
  return useAuiState((state: any) => asOpenCodeRuntimeExtras(state.thread.extras));
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
  const pending = extras
    ? (Object.values(extras.permissions) as Array<
        OpenCodeRuntimeExtras["permissions"][string]
      >)
    : [];

  return useMemo(
    () => ({
      pending,
      reply:
        extras?.replyToPermission ??
        (async () => {
          throw new Error("OpenCode runtime is not ready yet");
        }),
    }),
    [extras, pending],
  );
};
