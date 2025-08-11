import { Unsubscribe } from "@assistant-ui/tap";

export type ThreadListItemEventType = "switched-to" | "switched-away";

export type ThreadListItemStatus = "archived" | "regular" | "new" | "deleted";

export type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
};

export type ThreadListItemActions = {
  initialize(): Promise<{ remoteId: string; externalId: string | undefined }>;
  generateTitle(): Promise<void>;

  switchTo(): Promise<void>;
  rename(newTitle: string): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  detach(): void;

  subscribe(callback: () => void): Unsubscribe;

  unstable_on(
    event: ThreadListItemEventType,
    callback: () => void,
  ): Unsubscribe;
};
