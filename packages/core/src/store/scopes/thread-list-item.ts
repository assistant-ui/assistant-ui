import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import type { ThreadListItemStatus } from "../../runtime/interfaces/thread-list-runtime-core";

export type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly custom?: Record<string, unknown> | undefined;
};

export type ThreadListItemMethods = {
  getState(): ThreadListItemState;
  switchTo(): void;
  rename(newTitle: string): void;
  archive(): void;
  unarchive(): void;
  delete(): void;
  generateTitle(): void;
  initialize(): Promise<{ remoteId: string; externalId: string | undefined }>;
  detach(): void;
  __internal_getRuntime?(): ThreadListItemRuntime;
};

export type ThreadListItemMeta = {
  source: "threads";
  query:
    | { type: "main" }
    | { type: "id"; id: string }
    | { type: "index"; index: number; archived?: boolean };
};

export type ThreadListItemEvents = {
  "threadListItem.switchedTo": { threadId: string };
  "threadListItem.switchedAway": { threadId: string };
};

export type ThreadListItemClientSchema = {
  methods: ThreadListItemMethods;
  meta: ThreadListItemMeta;
  events: ThreadListItemEvents;
};
