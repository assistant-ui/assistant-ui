import {
  ThreadListItemClientState,
  ThreadListItemClientActions,
} from "../../legacy-runtime/client/ThreadListItemRuntimeClient";
import {
  ThreadClientState,
  ThreadClientActions,
} from "../../legacy-runtime/client/ThreadRuntimeClient";
import { StoreApi } from "../../utils/tap-store/tap-store-api";

export type ThreadListClientState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly isLoading: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];

  readonly threadItems: readonly ThreadListItemClientState[];

  readonly main: ThreadClientState;
};

export type ThreadListClientActions = {
  switchToThread(threadId: string): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions:
      | "main"
      | { id: string }
      | { index: number; archived?: boolean },
  ): StoreApi<ThreadListItemClientState, ThreadListItemClientActions>;

  thread(selector: "main"): StoreApi<ThreadClientState, ThreadClientActions>;
};
