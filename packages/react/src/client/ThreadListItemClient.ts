import { ThreadListItemEventType } from "../api/ThreadListItemRuntime";
import { ThreadListItemStatus, Unsubscribe } from "../types";

export type ThreadListItemClientState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly status: ThreadListItemStatus;
};

export type ThreadListItemClientActions = {
  readonly switchTo: () => void;
  readonly rename: (newTitle: string) => void;
  readonly archive: () => void;
  readonly unarchive: () => void;
  readonly delete: () => void;
  readonly generateTitle: () => void;
  readonly initialize: () => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  readonly detach: () => void;

  readonly unstable_on: (
    event: ThreadListItemEventType,
    callback: () => void,
  ) => Unsubscribe;
};
