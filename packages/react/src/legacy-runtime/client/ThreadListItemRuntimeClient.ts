import { resource, tapEffect } from "@assistant-ui/tap";
import {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../runtime/ThreadListItemRuntime";
import { ThreadListItemStatus, Unsubscribe } from "../../types";
import { tapApi } from "../../utils/tap-store";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { tapEvents } from "../../client/EventContext";

export type ThreadListItemClientState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly status: ThreadListItemStatus;
};

export type ThreadListItemClientActions = {
  switchTo(): void;
  rename(newTitle: string): void;
  archive(): void;
  unarchive(): void;
  delete(): void;
  generateTitle(): void;
  initialize(): Promise<{ remoteId: string; externalId: string | undefined }>;
  detach(): void;

  /** @internal */
  __internal_getRuntime(): ThreadListItemRuntime;
};

export const ThreadListItemClient = resource(
  ({ runtime }: { runtime: ThreadListItemRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const events = tapEvents();

    // Bind thread list item events to event manager
    tapEffect(() => {
      const unsubscribers: Unsubscribe[] = [];

      // Subscribe to thread list item events
      const threadListItemEvents: ThreadListItemEventType[] = [
        "switched-to",
        "switched-away",
      ];

      for (const event of threadListItemEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          events.emit(`thread-list-item.${event}`, {
            threadId: runtime.getState()!.id,
          });
        });
        unsubscribers.push(unsubscribe);
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, events]);

    const api = tapApi<ThreadListItemClientState, ThreadListItemClientActions>(
      runtimeState,
      {
        switchTo: runtime.switchTo,
        rename: runtime.rename,
        archive: runtime.archive,
        unarchive: runtime.unarchive,
        delete: runtime.delete,
        generateTitle: runtime.generateTitle,
        initialize: runtime.initialize,
        detach: runtime.detach,
        __internal_getRuntime: () => runtime,
      },
    );

    return {
      state: runtimeState,
      api,
      key: runtimeState.id,
    };
  },
);
