import { resource } from "../../../tap/dist/core/resource";
import {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../api/ThreadListItemRuntime";
import { ThreadListItemStatus, Unsubscribe } from "../types";
import { tapApi } from "../utils/tap-store";
import { tapSubscribable } from "./util-hooks/tapSubscribable";

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

  /**
   * The event system will be overhauled in a future release. This API will be removed.
   */
  unstable_on(
    event: ThreadListItemEventType,
    callback: () => void,
  ): Unsubscribe;

  __internal_getRuntime(): ThreadListItemRuntime;
};

export const ThreadListItemClient = resource(
  ({ runtime }: { runtime: ThreadListItemRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

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
        unstable_on: runtime.unstable_on,
        __internal_getRuntime: () => runtime,
      },
    );

    return {
      state: runtimeState,
      api,
    };
  },
);
