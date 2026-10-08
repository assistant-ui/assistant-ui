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
}: {
  enabled: boolean;
  isRunning: boolean;
  isSendDisabled: boolean;
  send: (message: AppendMessage) => Promise<void>;
  cancel: () => Promise<void>;
}) => {
  const sendRef = useRef(send);
  const cancelRef = useRef(cancel);
  useInsertionEffect(() => {
    sendRef.current = send;
    cancelRef.current = cancel;
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

  const queueRef = useRef<MessageQueueController | null>(null);
  if (enabled && !queueRef.current) {
    const controller = createMessageQueue({
      run: (message) => {
        const previous = lastDispatchRef.current;
        const cancels = cancelsRef.current;
        lastDispatchRef.current = (async () => {
          // A stopped AI SDK request still reports its status and runs its
          // onFinish once it settles, so a send waits for the previous one
          // and for the chat to be seen idle.
          await previous;
          while (reportedRef.current.busy) {
            await new Promise<void>((resolve) => {
              idleWaitersRef.current.push(resolve);
            });
          }
          const busyEdges = busyEdgesRef.current;
          try {
            await sendRef.current(
              cancels === cancelsRef.current
                ? message
                : { ...message, startRun: false },
            );
          } finally {
            if (
              busyEdgesRef.current === busyEdges &&
              !reportedRef.current.busy
            ) {
              controller.notifyIdle();
            }
          }
        })().catch(() => {});
      },
      cancel: () => {
        void cancelRun().catch(() => {});
      },
    });
    queueRef.current = controller;
  } else if (!enabled && queueRef.current) {
    queueRef.current = null;
  }
  const controller = enabled ? queueRef.current : null;

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
    if (!controller) return;
    if (isSendDisabled) controller.hold();
    else controller.release();
  }, [controller, isSendDisabled]);

  useEffect(() => {
    const reported = reportedRef.current;
    if (reported.controller === controller && reported.busy === isRunning)
      return;
    reportedRef.current = { controller, busy: isRunning };
    if (isRunning) {
      busyEdgesRef.current++;
      controller?.notifyBusy();
      return;
    }
    controller?.notifyIdle();
    const waiters = idleWaitersRef.current;
    idleWaitersRef.current = [];
    for (const resolve of waiters) resolve();
  }, [controller, isRunning]);

  return { adapter: controller?.adapter, cancel: cancelRun };
};
