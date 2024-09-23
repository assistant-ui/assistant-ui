import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import type { ReactThreadRuntimeCore } from "../../runtimes/core/ReactThreadRuntimeCore";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeThreadComposerStore } from "../stores/ThreadComposer";
import { getThreadStateFromRuntime, makeThreadStore } from "../stores/Thread";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { makeThreadMessagesStore } from "../stores/ThreadMessages";
import { writableStore } from "../ReadonlyStore";
import { ThreadRuntime } from "../../api/ThreadRuntime";
import { create } from "zustand";

type ThreadProviderProps = {
  provider: ThreadRuntime;
};

export const ThreadProvider: FC<PropsWithChildren<ThreadProviderProps>> = ({
  children,
  provider: thread,
}) => {
  const [context] = useState<ThreadContextValue>(() => {
    const useThreadRuntime = create(() => thread);
    const useThread = makeThreadStore(useThreadRuntime);
    const useThreadMessages = makeThreadMessagesStore(useThreadRuntime);
    const useViewport = makeThreadViewportStore();
    const useComposer = makeThreadComposerStore(useThreadRuntime);

    return {
      useThread,
      useThreadRuntime,
      useThreadMessages,
      useThreadActions: useThreadRuntime,
      useComposer,
      useViewport,
    };
  });

  // TODO remove after 0.6.0
  useEffect(() => {
    const onThreadUpdate = () => {
      const oldState = context.useThread.getState();
      const state = getThreadStateFromRuntime(thread);
      if (
        oldState.threadId !== state.threadId ||
        oldState.isDisabled !== state.isDisabled ||
        oldState.isRunning !== state.isRunning ||
        oldState.capabilities !== state.capabilities
      ) {
        writableStore(context.useThread).setState(state, true);
      }

      if (thread.messages !== context.useThreadMessages.getState()) {
        writableStore(context.useThreadMessages).setState(
          thread.messages,
          true,
        );
      }

      const composerState = context.useComposer.getState();
      if (state.capabilities.cancel !== composerState.canCancel) {
        writableStore(context.useComposer).setState({
          canCancel: state.capabilities.cancel,
        });
      }
    };

    onThreadUpdate();
    return thread.subscribe(onThreadUpdate);
  }, [thread, context]);

  useEffect(() => {
    const onComposerUpdate = () => {
      const composer = thread.composer;

      const composerState = context.useComposer.getState();
      if (
        composer.isEmpty !== composerState.isEmpty ||
        composer.text !== composerState.text ||
        composer.attachmentAccept !== composerState.attachmentAccept ||
        composer.attachments !== composerState.attachments
      ) {
        writableStore(context.useComposer).setState({
          isEmpty: composer.isEmpty,
          text: composer.text,
          attachmentAccept: composer.attachmentAccept,
          attachments: composer.attachments,
        });
      }
    };

    onComposerUpdate();
    return thread.composer.subscribe(onComposerUpdate);
  }, [thread, context]);

  useEffect(
    () =>
      thread.subscribe(() => {
        writableStore(context.useThreadRuntime).setState(thread, true);
      }),
    [thread, context],
  );

  // subscribe to thread updates
  const Synchronizer = context.useThreadRuntime(
    (t) => (t as ReactThreadRuntimeCore).unstable_synchronizer,
  );

  return (
    <ThreadContext.Provider value={context}>
      {Synchronizer && <Synchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};
