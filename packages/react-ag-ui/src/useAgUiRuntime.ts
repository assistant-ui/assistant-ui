"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useExternalStoreRuntime,
  useExternalStoreSharedOptions,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import { createMessageQueue } from "@assistant-ui/core";
import type {
  MessageQueueController,
  ToolExecutionStatus,
} from "@assistant-ui/core";
import type {
  AssistantRuntime,
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { makeLogger } from "./runtime/logger";
import type {
  AgUiInterrupt,
  AgUiResumeEntry,
  UseAgUiRuntimeOptions,
} from "./runtime/types";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";
import { agUiExtras } from "./agUiExtras";
import type { QueueItemState } from "@assistant-ui/core/store";

const EMPTY_INTERRUPTS: readonly AgUiInterrupt[] = [];
const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = Object.freeze([]);
const subscribeNoop = () => () => {};

export type AgUiAssistantRuntime = AssistantRuntime & {
  /**
   * @deprecated Use the `useAgUiInterrupts()` hook instead. This method is kept
   * for backward compatibility and will be removed in a future major release.
   */
  unstable_getPendingInterrupts: () => readonly AgUiInterrupt[];
  /**
   * @deprecated Use the `useAgUiSubmitInterruptResponses()` hook instead. This
   * method is kept for backward compatibility and will be removed in a future
   * major release.
   */
  unstable_submitInterruptResponses: (
    responses: readonly AgUiResumeEntry[],
  ) => Promise<void>;
};

export function useAgUiRuntime(
  options: UseAgUiRuntimeOptions,
): AgUiAssistantRuntime {
  const logger = useMemo(() => makeLogger(options.logger), [options.logger]);
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const coreRef = useRef<AgUiThreadRuntimeCore | null>(null);
  const runtimeAdapters = useRuntimeAdapters();

  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const threadListAdapter = options.adapters?.threadList;

  if (!coreRef.current) {
    coreRef.current = new AgUiThreadRuntimeCore({
      agent: options.agent,
      logger,
      showThinking: options.showThinking ?? true,
      autoCancelPendingToolCalls: options.autoCancelPendingToolCalls,
      ...(options.onError && { onError: options.onError }),
      ...(options.onCancel && { onCancel: options.onCancel }),
      ...(historyAdapter && { history: historyAdapter }),
      notifyUpdate,
    });
  }

  const core = coreRef.current;
  useEffect(() => {
    core.updateOptions({
      agent: options.agent,
      logger,
      showThinking: options.showThinking ?? true,
      autoCancelPendingToolCalls: options.autoCancelPendingToolCalls,
      ...(options.onError && { onError: options.onError }),
      ...(options.onCancel && { onCancel: options.onCancel }),
      ...(historyAdapter && { history: historyAdapter }),
    });
  });

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const isRunning = core.isRunning() || hasExecutingTools;

  // The driver sends through the agent core rather than the runtime, because
  // the runtime's append routes every tail append back into this queue.
  const queueRef = useRef<MessageQueueController | null>(null);
  // Counts rendered busy edges, whether a run start or an interrupt arriving.
  // A dispatch whose count never moves was never observed as busy, so no
  // falling edge is coming to release the queue.
  const busyEdgesRef = useRef(0);
  if (options.unstable_enableMessageQueue && !queueRef.current) {
    queueRef.current = createMessageQueue({
      run: (message) => {
        const controller = queueRef.current;
        const edgesAtDispatch = busyEdgesRef.current;
        // The queue drops the item before dispatching and stays busy until an
        // idle edge. An append observed as busy is released by that falling
        // edge, and releasing again here would advance the queue twice; one
        // that never runs (a pre-run rejection, or startRun false) has to be
        // released here or every later send buffers forever. An interrupt is
        // rechecked because a run that resolves without yielding to React
        // reaches here before the effect below has seen either edge.
        const releaseIfNoRun = () => {
          if (
            queueRef.current !== controller ||
            busyEdgesRef.current !== edgesAtDispatch ||
            core.getPendingInterrupts() !== null
          )
            return;
          controller?.notifyIdle();
        };
        void core.append(message).then(releaseIfNoRun, (e: unknown) => {
          releaseIfNoRun();
          logger.error?.("[agui] queued message failed to send", e);
        });
      },
    });
  } else if (!options.unstable_enableMessageQueue && queueRef.current) {
    queueRef.current.clear();
    queueRef.current = null;
  }
  const queueController = options.unstable_enableMessageQueue
    ? queueRef.current
    : null;

  // Feeds the store memo below: the runtime core skips an adapter whose
  // identity is unchanged, so queue items have to move the store reference or
  // subscribers never see composer.queue change.
  const queueItems = useSyncExternalStore(
    queueController?.subscribe ?? subscribeNoop,
    () => queueController?.adapter.items ?? EMPTY_QUEUE_ITEMS,
    () => EMPTY_QUEUE_ITEMS,
  );
  const steerQueueItems = useSyncExternalStore(
    queueController?.subscribe ?? subscribeNoop,
    () => queueController?.adapter.steerItems ?? EMPTY_QUEUE_ITEMS,
    () => EMPTY_QUEUE_ITEMS,
  );

  // Holds the queue while client-side tools are still executing, and while an
  // interrupt is unanswered: `append` refuses a new run until it is resolved,
  // and the queue drops an item before dispatching it, so draining into that
  // refusal would lose the message instead of keeping it visible.
  const queueBusy = isRunning || core.getPendingInterrupts() !== null;
  useEffect(() => {
    if (queueBusy) {
      busyEdgesRef.current++;
      queueController?.notifyBusy();
    } else {
      queueController?.notifyIdle();
    }
  }, [queueBusy, queueController]);

  const threadList = useMemo(() => {
    if (!threadListAdapter) return undefined;

    const { onSwitchToNewThread, onSwitchToThread, ...rest } =
      threadListAdapter;

    return {
      ...rest,
      onSwitchToNewThread: onSwitchToNewThread
        ? async () => {
            await onSwitchToNewThread();
            core.applyExternalMessages([]);
            core.resetState();
          }
        : undefined,
      onSwitchToThread: onSwitchToThread
        ? async (threadId: string) => {
            // Clear before the thread id flips, or the old messages leak
            // into the new thread as a sibling branch.
            core.applyExternalMessages([]);
            const result = await onSwitchToThread(threadId);
            core.applyExternalMessages(result.messages);
            if (result.state !== undefined) {
              core.loadExternalState(result.state);
            } else {
              core.resetState();
            }
            if (result.unstable_resume) {
              void core.resumeInFlightRun(result.messages);
            }
          }
        : undefined,
    };
  }, [threadListAdapter, core]);

  const adapters = options.adapters;
  const adapterAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
      threadList,
    }),
    [adapters, runtimeAdapters, threadList],
  );

  const shared = useExternalStoreSharedOptions(options);
  const store = useMemo(
    () => {
      void _version; // rerender on version change

      return {
        ...shared,
        isLoading: core.isLoading,
        messageRepository: core.getMessageRepository(),
        state: core.getState(),
        isRunning: core.isRunning(),
        extras: agUiExtras.provide({
          interrupts:
            core.getPendingInterrupts()?.interrupts ?? EMPTY_INTERRUPTS,
          sendA2uiAction: (action) => core.sendA2uiAction(action),
          submitInterruptResponses: (responses) =>
            core.submitInterruptResponses(responses),
          steerAway: (message, responses) => core.steerAway(message, responses),
          state: core.getState(),
          setState: (next) => core.setState(next),
        }),
        unstable_enableToolInvocations: true,
        setToolStatuses,
        onNew: (message: AppendMessage) => core.append(message),
        onEdit: (message: AppendMessage) => {
          queueController?.clear();
          return core.edit(message);
        },
        onReload: (parentId: string | null, config: { runConfig?: any }) => {
          queueController?.clear();
          return core.reload(parentId, config);
        },
        onCancel: async () => {
          queueController?.notifyCancelled();
          core.cancel();
        },
        onAddToolResult: (options) => core.addToolResult(options),
        onRespondToToolApproval: (options) =>
          core.respondToToolApproval(options).catch((error: unknown) => {
            core.reportError(error);
            throw error;
          }),
        onResume: (config) => core.resume(config),
        setMessages: (messages: readonly ThreadMessage[]) =>
          core.applyExternalMessages(messages),
        onImport: (messages: readonly ThreadMessage[]) =>
          core.applyExternalMessages(messages),
        onLoadExternalState: (state: ReadonlyJSONValue) =>
          core.loadExternalState(state),
        adapters: adapterAdapters,
        ...(queueController && { queue: queueController.adapter }),
      } satisfies ExternalStoreAdapter<ThreadMessage>;
    },
    // _version is intentionally included to trigger re-computation when core state changes via notifyUpdate
    // toolInvocations intentionally excluded: abort/resume use refs internally and work with stale captures
    [
      adapterAdapters,
      core,
      _version,
      isRunning,
      queueController,
      queueItems,
      steerQueueItems,
      shared,
    ],
  );

  const baseRuntime = useExternalStoreRuntime(store);

  const runtime = useMemo<AgUiAssistantRuntime>(() => {
    const wrapper = Object.create(baseRuntime) as AgUiAssistantRuntime;
    wrapper.unstable_getPendingInterrupts = () =>
      core.getPendingInterrupts()?.interrupts ?? [];
    wrapper.unstable_submitInterruptResponses = (responses) =>
      core.submitInterruptResponses(responses);
    return wrapper;
  }, [baseRuntime, core]);

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
