import { resource, tapState, tapMemo } from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapClientLookup,
  Derived,
  attachDefaultPeers,
  tapClientResource,
} from "@assistant-ui/store";
import { withKey } from "@assistant-ui/tap";
import type { ResourceElement } from "@assistant-ui/tap";
import type { ThreadState } from "../types/scopes/thread";
import { Suggestions } from "./Suggestions";
import { ModelContext } from "./ModelContextClient";
import { Tools } from "./Tools";

export type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  onSwitchToThread?: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
};

type ThreadData = {
  id: string;
  title?: string;
  status: "regular" | "archived";
};

// ThreadListItem Client
const ThreadListItemClient = resource(
  (props: {
    data: ThreadData;
    onSwitchTo: () => void;
    onArchive: () => void;
    onUnarchive: () => void;
    onDelete: () => void;
  }): ClientOutput<"threadListItem"> => {
    const { data, onSwitchTo, onArchive, onUnarchive, onDelete } = props;
    const state = tapMemo(
      () => ({
        id: data.id,
        remoteId: undefined,
        externalId: undefined,
        title: data.title,
        status: data.status,
      }),
      [data.id, data.title, data.status],
    );

    return {
      state,
      methods: {
        getState: () => state,
        switchTo: onSwitchTo,
        rename: () => {},
        archive: onArchive,
        unarchive: onUnarchive,
        delete: onDelete,
        generateTitle: () => {},
        initialize: async () => ({ remoteId: data.id, externalId: undefined }),
        detach: () => {},
      },
    };
  },
);

// InMemoryThreadList Client
export const InMemoryThreadList = resource(
  (props: InMemoryThreadListProps): ClientOutput<"threads"> => {
    const {
      thread: threadFactory,
      onSwitchToThread,
      onSwitchToNewThread,
    } = props;

    const [mainThreadId, setMainThreadId] = tapState("main");
    const [threads, setThreads] = tapState<readonly ThreadData[]>(() => [
      { id: "main", title: "Main Thread", status: "regular" },
    ]);

    const handleSwitchToThread = (threadId: string) => {
      setMainThreadId(threadId);
      onSwitchToThread?.(threadId);
    };

    const handleArchive = (threadId: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, status: "archived" as const } : t,
        ),
      );
    };

    const handleUnarchive = (threadId: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, status: "regular" as const } : t,
        ),
      );
    };

    const handleDelete = (threadId: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (mainThreadId === threadId) {
        const remaining = threads.filter((t) => t.id !== threadId);
        setMainThreadId(remaining[0]?.id || "main");
      }
    };

    const handleSwitchToNewThread = () => {
      const newId = `thread-${Date.now()}`;
      setThreads((prev) => [
        ...prev,
        { id: newId, title: "New Thread", status: "regular" },
      ]);
      setMainThreadId(newId);
      onSwitchToNewThread?.();
    };

    const threadListItems = tapClientLookup(
      () =>
        threads.map((t) =>
          withKey(
            t.id,
            ThreadListItemClient({
              data: t,
              onSwitchTo: () => handleSwitchToThread(t.id),
              onArchive: () => handleArchive(t.id),
              onUnarchive: () => handleUnarchive(t.id),
              onDelete: () => handleDelete(t.id),
            }),
          ),
        ),
      [threads],
    );

    // Create the main thread
    const mainThreadClient = tapClientResource(threadFactory(mainThreadId));

    const state = tapMemo(() => {
      const regularThreads = threads.filter((t) => t.status === "regular");
      const archivedThreads = threads.filter((t) => t.status === "archived");
      const mainThreadState = mainThreadClient.state as ThreadState;

      return {
        mainThreadId,
        newThreadId: null,
        isLoading: false,
        threadIds: regularThreads.map((t) => t.id),
        archivedThreadIds: archivedThreads.map((t) => t.id),
        threadItems: threadListItems.state,
        main: mainThreadState,
      };
    }, [mainThreadId, threads, threadListItems.state, mainThreadClient.state]);

    return {
      state,
      methods: {
        getState: () => state,
        switchToThread: handleSwitchToThread,
        switchToNewThread: handleSwitchToNewThread,
        item: (selector) => {
          if (selector === "main") {
            const index = threads.findIndex((t) => t.id === mainThreadId);
            return threadListItems.get({ index: index === -1 ? 0 : index });
          }
          if ("id" in selector) {
            const index = threads.findIndex((t) => t.id === selector.id);
            return threadListItems.get({ index });
          }
          return threadListItems.get(selector);
        },
        thread: () => mainThreadClient.methods,
      },
    };
  },
);

attachDefaultPeers(InMemoryThreadList, {
  thread: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().thread("main"),
  }),
  threadListItem: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().item("main"),
  }),
  composer: Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.threads().thread("main").composer,
  }),
  modelContext: ModelContext(),
  tools: Tools({}),
  suggestions: Suggestions(),
});
