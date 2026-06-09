import type { Unsubscribe } from "../../types/unsubscribe";
import { useEffect } from "react";
import { resource } from "@assistant-ui/tap";
import { type ClientOutput, useAssistantEmit } from "@assistant-ui/store";
import type {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../../runtime/api/thread-list-item-runtime";
import { useSubscribable } from "./useSubscribable";

const useThreadListItemClient = ({
  runtime,
}: {
  runtime: ThreadListItemRuntime;
}): ClientOutput<"threadListItem"> => {
  const state = useSubscribable(runtime);
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
