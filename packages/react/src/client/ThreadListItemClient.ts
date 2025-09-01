import {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "../api/ThreadListItemRuntime";
import { ThreadListItemStatus, Unsubscribe } from "../types";

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

  unstable_on(
    event: ThreadListItemEventType,
    callback: () => void,
  ): Unsubscribe;

  __internal_getRuntime(): ThreadListItemRuntime;
};
