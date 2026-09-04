"use client";

import {
  ExportedMessageRepository,
  useAui,
  useAuiState,
  useExternalStoreRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type {
  AssistantRuntime,
  ExternalStoreAdapter,
  ExternalThreadQueueAdapter,
  ThreadMessage,
  ThreadMessageLike,
} from "@assistant-ui/react";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import {
  useEffect,
  useEffectEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  appendMessageParts,
  PiThreadController,
  type PiThreadControllerLike,
} from "./ThreadController";
import { piQueueItemId } from "../queueIds";
import { splitHostUiRequests, type PiInterruptAnswer } from "./hostUi";
import { createPiThreadState, type PiThreadState } from "./threadState";
import type { PiClient, PiThreadMetadata } from "../types";
import { piExtras } from "./piExtras";
import type { PiRuntimeExtrasInternal, PiRuntimeOptions } from "./runtimeTypes";

const EMPTY_THREAD_STATE = createPiThreadState("__pending__");
const EMPTY_PROJECTED_MESSAGES: readonly ThreadMessageLike[] = [];
const EMPTY_MESSAGE_REPOSITORY = ExportedMessageRepository.fromArray([]);

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

const getController = (registry: PiControllerRegistry, threadId: string) => {
  const existing = registry.controllers.get(threadId);
  if (existing) return existing;
  const controller = new PiThreadController(registry.client, threadId);
  registry.controllers.set(threadId, controller);
  return controller;
};

export const NOOP_CONTROLLER: PiThreadControllerLike = {
  getState: () => EMPTY_THREAD_STATE,
  getProjectedMessages: () => EMPTY_PROJECTED_MESSAGES,
  getMessageRepository: () => EMPTY_MESSAGE_REPOSITORY,
  getVersion: () => 0,
  subscribe: () => () => {},
  subscribeMetadata: () => () => {},
  subscribeMessages: () => () => {},
  connect: () => () => {},
  load: async () => {},
  refresh: async () => {},
  sendMessage: async () => {},
  cancel: async () => {},
  clearQueue: async () => ({ steering: [], followUp: [] }),
  setModel: async () => {},
  setThinkingLevel: async () => {},
  respondToToolApproval: async () => {},
  resumeToolCall: async () => {},
  respondToHostUiRequest: async () => {},
  dispose: () => {},
};

const invokePiErrorCallback = (
  onError: PiRuntimeOptions["onError"],
  error: unknown,
) => {
  void invokeUserCallback("react-pi", "onError", onError, error);
};

const buildExtras = (
  controller: PiThreadControllerLike,
  state: PiThreadState,
): PiRuntimeExtrasInternal => {
  const { freeStanding } = splitHostUiRequests(state.hostUiRequests);
  return piExtras.provide({
    controller,
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
    clearQueue: () => controller.clearQueue(),
    setModel: (input) => controller.setModel(input),
    setThinkingLevel: (level) => controller.setThinkingLevel(level),
    respondToHostUiRequest: (response) =>
      controller.respondToHostUiRequest(response),
    respondToToolApproval: (id, approved) =>
      controller.respondToToolApproval(id, approved),
    resumeToolCall: (toolCallId, payload) =>
      controller.resumeToolCall(toolCallId, payload),
  });
};

export const EMPTY_RUNTIME_EXTRAS = buildExtras(
  NOOP_CONTROLLER,
  EMPTY_THREAD_STATE,
);

// ---------------------------------------------------------------------------
// Per-thread runtime.
// ---------------------------------------------------------------------------

const stateSnapshotOf = (controller: PiThreadControllerLike): PiThreadState =>
  controller.getStateSnapshot?.() ?? controller.getState();

const usePiControllerState = (
  controller: PiThreadControllerLike,
): PiThreadState => {
  const getSnapshot = useCallback(
    () => stateSnapshotOf(controller),
    [controller],
  );
  return useSyncExternalStore(
    useCallback(
      (listener: () => void) => controller.subscribe(listener),
      [controller],
    ),
    getSnapshot,
    getSnapshot,
  );
};

const usePiControllerMessageRepository = (
  controller: PiThreadControllerLike,
): ExportedMessageRepository => {
  const getSnapshot = useCallback(
    () => controller.getMessageRepository(),
    [controller],
  );
  return useSyncExternalStore(
    useCallback(
      (listener: () => void) => controller.subscribeMessages(listener),
      [controller],
    ),
    getSnapshot,
    getSnapshot,
  );
};

export const usePiControllerStateSelector = <T>(
  controller: PiThreadControllerLike,
  selector: (state: PiThreadState) => T,
): T => {
  // `useSyncExternalStore` compares snapshots with `Object.is`, so selecting
  // inside `getSnapshot` is what lets the store observe the selected slice
  // rather than the whole state. Memoizing on the source state keeps repeated
  // reads of one state object referentially stable; re-keying the memo on the
  // selector re-runs a changed closure instead of replaying its last result.
  const getSelection = useMemo(() => {
    let memo: { state: PiThreadState; selection: T } | undefined;
    return () => {
      const state = stateSnapshotOf(controller);
      if (!memo || memo.state !== state)
        memo = { state, selection: selector(state) };
      return memo.selection;
    };
  }, [controller, selector]);

  return useSyncExternalStore(
    useCallback(
      (listener: () => void) => controller.subscribe(listener),
      [controller],
    ),
    getSelection,
    getSelection,
  );
};

const isPiStateRunning = (state: PiThreadState): boolean =>
  state.runStatus === "running" ||
  state.compaction.active ||
  state.retry.active;

const usePiThreadStore = (
  controller: PiThreadControllerLike,
  options: PiRuntimeOptions,
): ExternalStoreAdapter<ThreadMessage> => {
  const state = usePiControllerState(controller);
  const messageRepository = usePiControllerMessageRepository(controller);

  const {
    adapters,
    isDisabled,
    isSendDisabled,
    onError,
    suggestions,
    unstable_capabilities,
  } = options;
  const isLoading = state.loadState === "loading";
  const isRunning = isPiStateRunning(state);

  const onLoadError = useEffectEvent((error: unknown) => {
    invokePiErrorCallback(onError, error);
  });

  useEffect(() => {
    if (controller === NOOP_CONTROLLER) return;
    void controller.load().catch(onLoadError);
  }, [controller]);

  // A running thread must stream live events even when this client never
  // called `sendMessage` — e.g. the first message of a new thread starts the
  // run server-side inside `createThread`. The supervisor already holds a live
  // record for a running thread, so subscribing attaches to it; idle threads
  // never connect and the cold-read path stays cheap.
  useEffect(() => {
    if (controller === NOOP_CONTROLLER) return;
    if (!isRunning) return;
    return controller.connect();
  }, [controller, isRunning]);

  const extras = useMemo<PiRuntimeExtrasInternal>(
    () => buildExtras(controller, state),
    [controller, state],
  );

  // Pi queues natively (`prompt()` steers/follows up mid-run), so the queue
  // adapter forwards every send straight to the controller instead of
  // buffering client-side. Exposing it flips on `capabilities.queue`, which is
  // what lets the composer keep accepting input while a run is streaming
  // (mid-run sends steer by default; `send({ steer: false })` queues a
  // follow-up).
  const queue = useMemo<ExternalThreadQueueAdapter>(
    () => ({
      items: state.queue.followUp.map((content, index) => ({
        id: piQueueItemId("followUp", index),
        prompt: content,
        parts: [{ type: "text" as const, text: content }],
      })),
      steerItems: state.queue.steering.map((content, index) => ({
        id: piQueueItemId("steer", index),
        prompt: content,
        parts: [{ type: "text" as const, text: content }],
      })),
      enqueue: (message) => {
        void controller
          .sendMessage(message)
          .catch((error: unknown) => invokePiErrorCallback(onError, error));
      },
      steer: (message) => {
        void controller
          .sendMessage(message, { streamingBehavior: "steer" })
          .catch((error: unknown) => invokePiErrorCallback(onError, error));
      },
      // the server-side queue exposes no per-item operations; shared queue
      // UI cannot feature-detect these, so they deliberately no-op rather
      // than crash an unguarded click path
      move: () => {},
      edit: () => {},
      remove: () => {},
    }),
    [controller, state.queue, onError],
  );

  const store = useMemo<ExternalStoreAdapter<ThreadMessage>>(
    () => ({
      isDisabled,
      isSendDisabled,
      unstable_capabilities,
      suggestions,
      isLoading,
      isRunning,
      messageRepository,
      extras,
      queue,
      ...(adapters ? { adapters } : {}),
      onNew: async (message) => {
        try {
          await controller.sendMessage(message);
        } catch (error) {
          invokePiErrorCallback(onError, error);
          throw error;
        }
      },
      onCancel: async () => {
        try {
          // clear before cancelling so the server cannot promote a queued
          // prompt into a new run in between
          try {
            await controller.clearQueue();
          } finally {
            await controller.cancel();
          }
        } catch (error) {
          invokePiErrorCallback(onError, error);
          throw error;
        }
      },
      onRespondToToolApproval: async ({ approvalId, approved }) => {
        try {
          await controller.respondToToolApproval(approvalId, approved);
        } catch (error) {
          invokePiErrorCallback(onError, error);
          throw error;
        }
      },
      onResumeToolCall: ({ toolCallId, payload }) => {
        void controller
          .resumeToolCall(toolCallId, payload as PiInterruptAnswer)
          .catch((error) => invokePiErrorCallback(onError, error));
      },
    }),
    [
      controller,
      extras,
      messageRepository,
      queue,
      adapters,
      isDisabled,
      isLoading,
      isRunning,
      isSendDisabled,
      onError,
      suggestions,
      unstable_capabilities,
    ],
  );

  return store;
};

const toOptimisticThreadMessage = (
  message: Parameters<ExternalStoreAdapter<ThreadMessageLike>["onNew"]>[0],
  index: number,
): ThreadMessageLike => ({
  id: `pi-new-user:${index}`,
  role: "user",
  createdAt: new Date(),
  content: appendMessageParts(message),
});

const useNewPiThreadStore = (
  registry: PiControllerRegistry,
  options: PiRuntimeOptions,
): ExternalStoreAdapter<ThreadMessage> => {
  const aui = useAui();
  const {
    adapters,
    isDisabled,
    isSendDisabled,
    onError,
    suggestions,
    unstable_capabilities,
  } = options;
  const [optimisticMessages, setOptimisticMessages] = useState<
    readonly ThreadMessageLike[]
  >([]);
  const optimisticMessageIndexRef = useRef(0);
  const optimisticRepository = useMemo(
    () => ExportedMessageRepository.fromArray(optimisticMessages),
    [optimisticMessages],
  );

  const store = useMemo<ExternalStoreAdapter<ThreadMessage>>(
    () => ({
      isDisabled: isDisabled ?? false,
      isSendDisabled,
      unstable_capabilities,
      suggestions,
      isLoading: false,
      isRunning: false,
      messageRepository: optimisticRepository,
      extras: EMPTY_RUNTIME_EXTRAS,
      ...(adapters ? { adapters } : {}),
      onNew: async (message) => {
        const optimistic = toOptimisticThreadMessage(
          message,
          optimisticMessageIndexRef.current++,
        );
        setOptimisticMessages((messages) => [...messages, optimistic]);
        try {
          // The core starts thread initialization before dispatching onNew,
          // so adapter.initialize has already created the thread empty;
          // deliver the message to the live thread.
          const { remoteId, externalId } =
            await aui.threadListItem.initialize();
          await getController(registry, externalId ?? remoteId).sendMessage(
            message,
          );
          setOptimisticMessages((messages) =>
            messages.filter((candidate) => candidate !== optimistic),
          );
        } catch (error) {
          setOptimisticMessages((messages) =>
            messages.filter((message) => message !== optimistic),
          );
          invokePiErrorCallback(onError, error);
          throw error;
        }
      },
    }),
    [
      aui,
      optimisticRepository,
      registry,
      adapters,
      isDisabled,
      isSendDisabled,
      onError,
      suggestions,
      unstable_capabilities,
    ],
  );

  return store;
};

const useRuntimeHook = (
  registry: PiControllerRegistry,
  options: PiRuntimeOptions,
) => {
  const threadListItem = useAuiState((state) => state.threadListItem);
  const isMainThread = useAuiState(
    (state) => state.threads.mainThreadId === state.threadListItem.id,
  );
  const threadId = threadListItem.externalId ?? threadListItem.remoteId;

  // No render-local cache on top: `getController` is already an idempotent
  // registry lookup, and a second cache could outlive a recreated registry.
  const controller = threadId
    ? getController(registry, threadId)
    : NOOP_CONTROLLER;

  const threadStore = usePiThreadStore(
    isMainThread ? controller : NOOP_CONTROLLER,
    options,
  );
  const newThreadStore = useNewPiThreadStore(registry, options);

  // One runtime whose store CONTENT switches between the new-thread and
  // live-thread branches. Returning two alternating runtime instances breaks
  // the remote-thread-list main binding: it can latch onto the runtime that
  // was current at switch time and miss the other one's later updates.
  return useExternalStoreRuntime<ThreadMessage>(
    threadId ? threadStore : newThreadStore,
  );
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
        // Pi has no server-side title summarization; titles come from
        // `session_info_changed`. Satisfy the contract with an empty stream.
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
    ...(options.onThreadIdChange !== undefined
      ? { onThreadIdChange: options.onThreadIdChange }
      : {}),
    runtimeHook: () => {
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- runtimeHook is invoked by useRemoteThreadListRuntime at the correct hook position
      return useRuntimeHook(registry, options);
    },
  });
};
