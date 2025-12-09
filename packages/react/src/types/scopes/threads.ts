import type { ThreadListItemState } from "./threadListItem";
import type { ThreadState } from "./thread";

export type ThreadsState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadItems: readonly ThreadListItemState[];
  readonly main: ThreadState;
};

export type ThreadsMethods = {
  switchToThread(threadId: string): void;
  switchToNewThread(): void;
};

export type ThreadsClientSchema = {
  state: ThreadsState;
  methods: ThreadsMethods;
};
