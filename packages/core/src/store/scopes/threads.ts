import type { AssistantRuntime } from "../../runtime";
import type {
  ThreadListItemMethods,
  ThreadListItemState,
} from "./thread-list-item";
import type { ThreadMethods, ThreadState } from "./thread";

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
  getState(): ThreadsState;
  switchToThread(threadId: string): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions:
      | "main"
      | { id: string }
      | { index: number; archived?: boolean },
  ): ThreadListItemMethods;
  thread(selector: "main"): ThreadMethods;
  __internal_getAssistantRuntime?(): AssistantRuntime;
};

export type ThreadsClientSchema = {
  methods: ThreadsMethods;
};
