import { resource, tapEffect } from "@assistant-ui/tap";
import { type ClientOutput, tapAssistantEmit } from "@assistant-ui/store";
import {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../runtime/ThreadListItemRuntime";
import { Unsubscribe } from "../../types";
import { tapSubscribable } from "../util-hooks/tapSubscribable";

export const ThreadListItemClient = resource(
  ({
    runtime,
  }: {
    runtime: ThreadListItemRuntime;
  }): ClientOutput<"threadListItem"> => {
    const state = tapSubscribable(runtime);
    const emit = tapAssistantEmit();

    // Bind thread list item events to event manager
    tapEffect(() => {
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
      archive: runtime.archive,
      unarchive: runtime.unarchive,
      delete: runtime.delete,
      generateTitle: runtime.generateTitle,
      initialize: runtime.initialize,
      detach: runtime.detach,
      __internal_getRuntime: () => runtime,
    };
  },
);
