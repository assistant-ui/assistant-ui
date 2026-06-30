import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import type { ThreadListItemStatus } from "../../runtime/interfaces/thread-list-runtime-core";

export type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly forkedFrom?:
    | {
        readonly threadId: string;
        readonly messageId?: string | undefined;
      }
    | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly status: ThreadListItemStatus;
  readonly custom?: Record<string, unknown> | undefined;
};

export type ThreadListItemMethods = {
  getState(): ThreadListItemState;
  switchTo(options?: { unarchive?: boolean }): void;
  rename(newTitle: string): void;
  updateCustom(custom: Record<string, unknown> | undefined): void;
  archive(): void;
  unarchive(): void;
  delete(): void;
  fork(options?: {
    fromMessageId?: string | undefined;
  }): Promise<{ threadId: string }>;
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
  /**
   * @deprecated State-derivable. Compare `s.threads.mainThreadId` against the
   * item's `s.threadListItem.id` via `useAuiState` instead. Kept for backward
   * compatibility.
   */
  "threadListItem.switchedTo": { threadId: string };
  /**
   * @deprecated State-derivable. Compare `s.threads.mainThreadId` against the
   * item's `s.threadListItem.id` via `useAuiState` instead. Kept for backward
   * compatibility.
   */
  "threadListItem.switchedAway": { threadId: string };
};

export type ThreadListItemClientSchema = {
  methods: ThreadListItemMethods;
  meta: ThreadListItemMeta;
  events: ThreadListItemEvents;
};
