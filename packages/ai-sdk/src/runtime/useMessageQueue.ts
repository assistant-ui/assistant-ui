"use client";

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  createMessageQueue,
  type AppendMessage,
  type MessageQueueController,
} from "@assistant-ui/core";

const subscribeNoop = () => () => {};
const getNoItems = () => undefined;

export const useMessageQueue = ({
  enabled,
  isRunning,
  isSendDisabled,
  send,
  cancel,
  interrupt,
  onError,
}: {
  enabled: boolean;
  isRunning: boolean;
  isSendDisabled: boolean;
  send: (message: AppendMessage) => Promise<void>;
  cancel: () => Promise<void>;
  interrupt: () => void | Promise<void>;
  onError?: ((error: Error | undefined) => void) | undefined;
}) => {
  const sendRef = useRef(send);
  const cancelRef = useRef(cancel);
  const interruptRef = useRef(interrupt);
  const onErrorRef = useRef(onError);
  const heldRef = useRef(!enabled || isSendDisabled);
  const runningRef = useRef(isRunning);
  useInsertionEffect(() => {
    sendRef.current = send;
    cancelRef.current = cancel;
    interruptRef.current = interrupt;
    onErrorRef.current = onError;
    heldRef.current = !enabled || isSendDisabled;
    runningRef.current = isRunning;
  });

  const cancelsRef = useRef(0);
  const cancelRun = useCallback(() => {
    cancelsRef.current++;
    return cancelRef.current();
  }, []);

  const reportedRef = useRef<{
    controller: MessageQueueController | null;
    busy: boolean;
  }>({ controller: null, busy: false });
  const busyEdgesRef = useRef(0);
  const idleWaitersRef = useRef<(() => void)[]>([]);
  const lastDispatchRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  const queueRef = useRef<MessageQueueController | null>(null);
  if (enabled && !queueRef.current) {
    const controller = createMessageQueue({
      run: (message) => {
        const previous = lastDispatchRef.current;
        const cancels = cancelsRef.current;
        const generation = generationRef.current;
        const busyEdgesAtDispatch = busyEdgesRef.current;
        const dispatch = (async () => {
          // A stopped AI SDK request still reports its status and runs its
          // onFinish once it settles, so a send waits for the previous one
          // and for the chat to be seen idle.
          await previous;
          let settledCancels = cancels;
          while (true) {
            if (!mountedRef.current || generation !== generationRef.current) {
              if (
                mountedRef.current &&
                (!reportedRef.current.busy ||
                  busyEdgesAtDispatch === busyEdgesRef.current)
              ) {
                controller.notifyIdle();
              }
              return;
            }
            if (
              heldRef.current ||
              runningRef.current ||
              reportedRef.current.busy
            ) {
              await new Promise<void>((resolve) => {
                idleWaitersRef.current.push(resolve);
              });
              continue;
            }
            // The runtime schedules its cancellation rollback before returning.
            // A later task lets that rollback commit before this append.
            if (settledCancels !== cancelsRef.current) {
              settledCancels = cancelsRef.current;
              await new Promise((resolve) => setTimeout(resolve));
              continue;
            }
            break;
          }
          const overtaken = settledCancels !== cancels;
          const busyEdges = busyEdgesRef.current;
          onErrorRef.current?.(undefined);
          try {
            await sendRef.current(
              overtaken ? { ...message, startRun: false } : message,
            );
          } catch (error) {
            if (mountedRef.current && generation === generationRef.current) {
              onErrorRef.current?.(
                error instanceof Error ? error : new Error(String(error)),
              );
            }
            throw error;
          }
          if (busyEdgesRef.current === busyEdges && !reportedRef.current.busy) {
            controller.notifyIdle();
          }
        })();
        lastDispatchRef.current = dispatch.catch(() => {});
        return dispatch;
      },
      cancel: () => {
        cancelsRef.current++;
        void Promise.resolve(interruptRef.current()).catch(() => {});
      },
    });
    queueRef.current = controller;
  }
  const controller = queueRef.current;

  useSyncExternalStore(
    controller?.subscribe ?? subscribeNoop,
    () => controller?.adapter.items,
    getNoItems,
  );
  useSyncExternalStore(
    controller?.subscribe ?? subscribeNoop,
    () => controller?.adapter.steerItems,
    getNoItems,
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controller?.hold();
      const waiters = idleWaitersRef.current;
      idleWaitersRef.current = [];
      for (const resolve of waiters) resolve();
    };
  }, [controller]);

  useEffect(() => {
    if (!controller) return;
    if (!enabled || isSendDisabled) controller.hold();
    else controller.release();
  }, [controller, enabled, isSendDisabled]);

  useEffect(() => {
    const reported = reportedRef.current;
    if (reported.controller !== controller || reported.busy !== isRunning) {
      reportedRef.current = { controller, busy: isRunning };
      if (isRunning) {
        busyEdgesRef.current++;
        controller?.notifyBusy();
      } else {
        controller?.notifyIdle();
      }
    }
    if (!enabled || isSendDisabled || isRunning) return;
    const waiters = idleWaitersRef.current;
    idleWaitersRef.current = [];
    for (const resolve of waiters) resolve();
  }, [controller, enabled, isRunning, isSendDisabled]);

  return {
    adapter: enabled ? controller?.adapter : undefined,
    cancel: cancelRun,
    clear: () => {
      onErrorRef.current?.(undefined);
      generationRef.current++;
      controller?.clear();
      const waiters = idleWaitersRef.current;
      idleWaitersRef.current = [];
      for (const resolve of waiters) resolve();
    },
  };
};
