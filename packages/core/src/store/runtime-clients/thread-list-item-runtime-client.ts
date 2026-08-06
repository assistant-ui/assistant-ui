import type { Unsubscribe } from "../../types/unsubscribe";
import { useEffect, useMemo } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useAssistantEmit } from "@assistant-ui/store/client";
import type {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../../runtime/api/thread-list-item-runtime";
import { useSubscribable } from "./useSubscribable";

const useThreadListItemClient = ({
  runtime,
  mainThreadIsRunning = false,
}: {
  runtime: ThreadListItemRuntime;
  // A thread list that cannot report per-thread run state still leaves the open
  // thread observable, and the thread client tracks that reactively. Omitted
  // where the runtime state is already authoritative for every thread.
  mainThreadIsRunning?: boolean | undefined;
}): ClientOutput<"threadListItem"> => {
  const runtimeState = useSubscribable(runtime);
  const state = useMemo(() => {
    const isRunning =
      runtimeState.isRunning || (runtimeState.isMain && mainThreadIsRunning);
    if (isRunning === runtimeState.isRunning) return runtimeState;
    return { ...runtimeState, isRunning };
  }, [runtimeState, mainThreadIsRunning]);
  const emit = useAssistantEmit();

  // Bind thread list item events to event manager
  useEffect(() => {
    const unsubscribers: Unsubscribe[] = [];

    // Subscribe to thread list item events
    const threadListItemEvents: ThreadListItemEventType[] = [
      "switchedTo",
      "switchedAway",
    ];

    for (const event of threadListItemEvents) {
      const unsubscribe = runtime.unstable_on(event, () => {
        emit(`threadListItem.${event}`, {
          threadId: runtime.getState()!.id,
        });
      });
      unsubscribers.push(unsubscribe);
    }

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [runtime, emit]);

  return {
    getState: () => state,
    switchTo: runtime.switchTo,
    rename: runtime.rename,
    updateCustom: runtime.updateCustom,
    archive: runtime.archive,
    unarchive: runtime.unarchive,
    delete: runtime.delete,
    generateTitle: runtime.generateTitle,
    initialize: runtime.initialize,
    detach: runtime.detach,
    __internal_getRuntime: () => runtime,
  };
};

export const ThreadListItemClient = resource(useThreadListItemClient);
