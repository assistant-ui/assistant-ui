import {
  ThreadListItemClientState,
  ThreadListItemClientApi,
} from "./ThreadListItem";
import { ThreadClientApi, ThreadClientState } from "./Thread";

export type ThreadListClientState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];

  readonly threadItems: readonly ThreadListItemClientState[];

  readonly main: ThreadClientState;
};

export type ThreadListClientApi = {
  getState(): ThreadListClientState;

  switchToThread(threadId: string): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions:
      | "main"
      | { id: string }
      | { index: number; archived?: boolean },
  ): ThreadListItemClientApi;

  thread(selector: "main"): ThreadClientApi;
};
