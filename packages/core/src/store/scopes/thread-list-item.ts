import type {
  ThreadListItemRuntime,
  ThreadListItemStatus,
} from "../../runtime";

export type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly status: ThreadListItemStatus;
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
