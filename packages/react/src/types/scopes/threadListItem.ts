import type { ThreadListItemStatus } from "../../legacy-runtime/runtime/ThreadListItemRuntime";

export type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly status: ThreadListItemStatus;
};

export type ThreadListItemMethods = {
  switchTo(): void;
  rename(newTitle: string): void;
  archive(): void;
  unarchive(): void;
  delete(): void;
  generateTitle(): void;
  initialize(): Promise<{ remoteId: string; externalId: string | undefined }>;
  detach(): void;
};

export type ThreadListItemMeta = {
  source: "threads";
  query: { type: "main" } | { id: string } | { index: number; archived?: boolean };
};

export type ThreadListItemEvents = {
  "threadListItem.switched-to": { threadId: string };
  "threadListItem.switched-away": { threadId: string };
};

export type ThreadListItemClientSchema = {
  state: ThreadListItemState;
  methods: ThreadListItemMethods;
  meta: ThreadListItemMeta;
  events: ThreadListItemEvents;
};
