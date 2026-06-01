"use client";

import {
  ExportedMessageRepository,
  pickExternalStoreSharedOptions,
  useAuiState,
  useExternalStoreRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type {
  AssistantRuntime,
  ExternalStoreAdapter,
  ExternalStoreSharedOptions,
  ThreadMessage,
} from "@assistant-ui/react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  PiThreadController,
  type PiThreadControllerLike,
} from "./PiThreadController";
import { projectPiThreadRepository } from "./piMessageProjection";
import { splitHostUiRequests, type PiInterruptAnswer } from "./piHostUi";
import { createPiThreadState, type PiThreadState } from "./piThreadState";
import type {
  PiClient,
  PiContextUsage,
  PiHostUiRequest,
  PiHostUiResponse,
  PiRuntimeReadiness,
  PiThreadMetadata,
  PiThreadStatus,
} from "./piTypes";

// ---------------------------------------------------------------------------
// Options & extras.
// ---------------------------------------------------------------------------

export type PiRuntimeOptions = ExternalStoreSharedOptions & {
  /** The transport-agnostic Pi client (HTTP/SSE, RPC, IPC). */
  client: PiClient;
  /** Workspace scoping for the thread list. */
  workspacePath?: string;
  includeArchived?: boolean;
  initialThreadId?: string;
  threadId?: string;
  onError?: (error: unknown) => void;
  adapters?: ExternalStoreAdapter<ThreadMessage>["adapters"];
};

export interface PiRuntimeExtras {
  state: PiThreadState;
  metadata: PiThreadMetadata;
  status: PiThreadStatus;
  readiness: PiRuntimeReadiness | undefined;
  contextUsage: PiContextUsage | undefined;
  /** Pending side-channel (free-standing) host-UI requests — those not attached
   * to a tool call. Tool-associated requests render as native approval/interrupt
   * on the message instead. */
  hostUiRequests: readonly PiHostUiRequest[];
  /** All pending host-UI requests, including tool-associated ones. */
  allHostUiRequests: readonly PiHostUiRequest[];
  queue: PiThreadState["queue"];
  compaction: PiThreadState["compaction"];
  retry: PiThreadState["retry"];
  lastError: string | undefined;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  respondToHostUiRequest: (response: PiHostUiResponse) => Promise<void>;
  respondToToolApproval: (id: string, approved: boolean) => Promise<void>;
  resumeToolCall: (
    toolCallId: string,
    payload: PiInterruptAnswer,
  ) => Promise<void>;
}

// Keep the host-UI answer type in the public surface.
export type { PiInterruptAnswer } from "./piHostUi";

// ---------------------------------------------------------------------------
// Symbol-tagged extras (so the selector hooks can validate context).
// ---------------------------------------------------------------------------

const symbolPiRuntimeExtras = Symbol("pi-runtime-extras");

type PiRuntimeExtrasInternal = PiRuntimeExtras & {
  [symbolPiRuntimeExtras]: true;
};

const isPiRuntimeExtras = (
  extras: unknown,
): extras is PiRuntimeExtrasInternal =>
  typeof extras === "object" &&
  extras != null &&
  symbolPiRuntimeExtras in extras;

const tryGetPiRuntimeExtras = (extras: unknown) =>
  isPiRuntimeExtras(extras) ? extras : undefined;

const asPiRuntimeExtras = (extras: unknown) => {
  const found = tryGetPiRuntimeExtras(extras);
  if (!found) {
    throw new Error("This hook can only be used inside a Pi runtime context");
  }
  return found;
};

const EMPTY_THREAD_STATE = createPiThreadState("__pending__");

// ---------------------------------------------------------------------------
// Controller registry (cached across StrictMode remounts).
// ---------------------------------------------------------------------------

type PiControllerRegistry = {
  /** The client these controllers are bound to (a new client ⇒ a new registry). */
  client: PiClient;
  controllers: Map<string, PiThreadController>;
  dispose(): void;
};

const createRegistry = (client: PiClient): PiControllerRegistry => {
  const controllers = new Map<string, PiThreadController>();
  return {
    client,
    controllers,
    dispose() {
      for (const controller of controllers.values()) controller.dispose();
      // Controllers stay cached so a StrictMode cleanup/remount reuses them;
      // a real unmount drops this whole registry.
    },
  };
};

const getController = (
  registry: PiControllerRegistry,
  client: PiClient,
  threadId: string,
) => {
  const existing = registry.controllers.get(threadId);
  if (existing) return existing;
  const controller = new PiThreadController(client, threadId);
  registry.controllers.set(threadId, controller);
  return controller;
};

const NOOP_CONTROLLER: PiThreadControllerLike = {
  getState: () => EMPTY_THREAD_STATE,
  subscribe: () => () => {},
  load: async () => {},
  refresh: async () => {},
  sendMessage: async () => {},
  cancel: async () => {},
  respondToToolApproval: async () => {},
  resumeToolCall: async () => {},
  respondToHostUiRequest: async () => {},
  dispose: () => {},
};

const NOOP_ON_NEW = () =>
  Promise.reject(new Error("Pi thread is still initializing"));

// ---------------------------------------------------------------------------
// Per-thread runtime.
// ---------------------------------------------------------------------------

const usePiControllerState = (
  controller: PiThreadControllerLike,
): PiThreadState =>
  useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
    () => controller.getState(),
  );

const isPiStateRunning = (state: PiThreadState): boolean =>
  state.runStatus === "running" ||
  state.compaction.active ||
  state.retry.active;

const usePiThreadRuntime = (
  controller: PiThreadControllerLike,
  options: PiRuntimeOptions,
): AssistantRuntime => {
  const state = usePiControllerState(controller);

  const onLoadError = useEffectEvent((error: unknown) => {
    options.onError?.(error);
  });

  useEffect(() => {
    if (controller === NOOP_CONTROLLER) return;
    void controller.load().catch(onLoadError);
  }, [controller]);

  const messageRepository = useMemo(
    () =>
      projectPiThreadRepository({
        messages: state.messages,
        toolExecutions: state.toolExecutions,
        runStatus: state.runStatus,
        hostUiRequests: state.hostUiRequests,
      }),
    [state],
  );

  const extras = useMemo<PiRuntimeExtrasInternal>(() => {
    const { freeStanding } = splitHostUiRequests(state.hostUiRequests);
    return {
      [symbolPiRuntimeExtras]: true,
      state,
      metadata: state.metadata,
      status: state.runStatus === "failed" ? "failed" : state.runStatus,
      readiness: state.readiness,
      contextUsage: state.contextUsage,
      hostUiRequests: freeStanding,
      allHostUiRequests: state.hostUiRequests,
      queue: state.queue,
      compaction: state.compaction,
      retry: state.retry,
      lastError: state.lastError,
      cancel: () => controller.cancel(),
      refresh: () => controller.refresh(),
      respondToHostUiRequest: (response) =>
        controller.respondToHostUiRequest(response),
      respondToToolApproval: (id, approved) =>
        controller.respondToToolApproval(id, approved),
      resumeToolCall: (toolCallId, payload) =>
        controller.resumeToolCall(toolCallId, payload),
    };
  }, [controller, state]);

  return useExternalStoreRuntime<ThreadMessage>({
    ...pickExternalStoreSharedOptions(options),
    isLoading: state.loadState === "loading",
    isRunning: isPiStateRunning(state),
    messageRepository,
    extras,
    ...(options.adapters ? { adapters: options.adapters } : {}),
    onNew: async (message) => {
      try {
        await controller.sendMessage(message);
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
    onRespondToToolApproval: async ({ approvalId, approved }) => {
      try {
        await controller.respondToToolApproval(approvalId, approved);
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
    onResumeToolCall: ({ toolCallId, payload }) => {
      void controller
        .resumeToolCall(toolCallId, payload as PiInterruptAnswer)
        .catch((error) => options.onError?.(error));
    },
  });
};

const useRuntimeHook = (
  client: PiClient,
  registry: PiControllerRegistry,
  options: PiRuntimeOptions,
) => {
  const threadId = useAuiState(
    (state: any) =>
      state.threadListItem.externalId ?? state.threadListItem.remoteId,
  );

  const controller = threadId
    ? getController(registry, client, threadId)
    : NOOP_CONTROLLER;

  const threadRuntime = usePiThreadRuntime(controller, options);

  const fallbackRuntime = useExternalStoreRuntime<ThreadMessage>({
    isDisabled: true,
    isLoading: true,
    messageRepository: ExportedMessageRepository.fromArray([]),
    onNew: NOOP_ON_NEW,
  });

  return threadId ? threadRuntime : fallbackRuntime;
};

// ---------------------------------------------------------------------------
// Thread-list metadata mapping.
// ---------------------------------------------------------------------------

const mapThreadMetadata = (metadata: PiThreadMetadata) => ({
  status: metadata.archived ? ("archived" as const) : ("regular" as const),
  remoteId: metadata.id,
  externalId: metadata.id,
  ...(metadata.title !== undefined ? { title: metadata.title } : {}),
  custom: {
    status: metadata.status,
    ...(metadata.workspacePath !== undefined
      ? { workspacePath: metadata.workspacePath }
      : {}),
    ...(metadata.sessionFile !== undefined
      ? { sessionFile: metadata.sessionFile }
      : {}),
    ...(metadata.parentSessionPath !== undefined
      ? { parentSessionPath: metadata.parentSessionPath }
      : {}),
  },
});

// ---------------------------------------------------------------------------
// Public hook.
// ---------------------------------------------------------------------------

export const usePiRuntime = (options: PiRuntimeOptions): AssistantRuntime => {
  const { client } = options;
  const registry = useMemo(() => createRegistry(client), [client]);

  useEffect(() => () => registry.dispose(), [registry]);

  const adapter = useMemo(
    () => ({
      list: async () => {
        const threads = await client.listThreads({
          ...(options.workspacePath !== undefined
            ? { workspacePath: options.workspacePath }
            : {}),
          ...(options.includeArchived !== undefined
            ? { includeArchived: options.includeArchived }
            : {}),
        });
        return { threads: threads.map(mapThreadMetadata) };
      },
      rename: async (remoteId: string, newTitle: string) => {
        await client.renameThread(remoteId, newTitle);
      },
      archive: async (remoteId: string) => {
        await client.archiveThread?.(remoteId);
      },
      unarchive: async (remoteId: string) => {
        await client.unarchiveThread?.(remoteId);
      },
      delete: async (remoteId: string) => {
        await client.deleteThread?.(remoteId);
      },
      initialize: async () => {
        const snapshot = await client.createThread({
          ...(options.workspacePath !== undefined
            ? { workspacePath: options.workspacePath }
            : {}),
        });
        return {
          remoteId: snapshot.metadata.id,
          externalId: snapshot.metadata.id,
        };
      },
      generateTitle: async () =>
        // Pi has no server-side title summarization in the MVP; titles come
        // from `session_info_changed`. Satisfy the contract with an empty
        // stream.
        new ReadableStream({
          start(streamController) {
            streamController.close();
          },
        }) as never,
      fetch: async (threadId: string) => {
        const snapshot = await client.getThread(threadId);
        return mapThreadMetadata(snapshot.metadata);
      },
    }),
    [client, options.workspacePath, options.includeArchived],
  );

  return useRemoteThreadListRuntime({
    allowNesting: true,
    adapter,
    ...(options.initialThreadId !== undefined
      ? { initialThreadId: options.initialThreadId }
      : {}),
    ...(options.threadId !== undefined ? { threadId: options.threadId } : {}),
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- runtimeHook is invoked by useRemoteThreadListRuntime at the correct hook position
    runtimeHook: () => useRuntimeHook(client, registry, options),
  });
};

// ---------------------------------------------------------------------------
// Selector hooks.
// ---------------------------------------------------------------------------

export const usePiRuntimeExtras = (): PiRuntimeExtras =>
  useAuiState((state: any) => asPiRuntimeExtras(state.thread.extras));

export const usePiSession = (): PiThreadMetadata | null =>
  useAuiState(
    (state: any) =>
      tryGetPiRuntimeExtras(state.thread.extras)?.metadata ?? null,
  );

export function usePiThreadState(): PiThreadState;
export function usePiThreadState<T>(selector: (state: PiThreadState) => T): T;
export function usePiThreadState<T>(selector?: (state: PiThreadState) => T) {
  return useAuiState((state: any) => {
    const extras = tryGetPiRuntimeExtras(state.thread.extras);
    const threadState = extras?.state ?? EMPTY_THREAD_STATE;
    return selector ? selector(threadState) : threadState;
  });
}

export const usePiHostUiRequests = () => {
  const extras = useAuiState((state: any) =>
    tryGetPiRuntimeExtras(state.thread.extras),
  );

  return useMemo(
    () => ({
      requests: extras?.hostUiRequests ?? [],
      respond:
        extras?.respondToHostUiRequest ??
        (async () => {
          throw new Error("Pi runtime is not ready yet");
        }),
    }),
    [extras],
  );
};
