import { useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import {
  type ClientElement,
  type ClientOutput,
  useClientResource,
} from "@assistant-ui/store";

const RESOLVED_PROMISE = Promise.resolve();
const THREAD_ID = "default";

const useSingleThreadListItem = (): ClientOutput<"threadListItem"> => {
  const [custom, setCustom] = useState<Record<string, unknown> | undefined>();

  return {
    getState: () => ({
      id: THREAD_ID,
      remoteId: undefined,
      externalId: undefined,
      title: undefined,
      status: "regular",
      custom,
    }),
    switchTo: () => {},
    rename: () => {},
    updateCustom: setCustom,
    archive: () => {},
    unarchive: () => {},
    delete: () => {},
    generateTitle: () => {},
    initialize: async () => ({ remoteId: THREAD_ID, externalId: undefined }),
    detach: () => {},
  };
};

const SingleThreadListItem = resource(useSingleThreadListItem);

type SingleThreadListProps = {
  thread: ClientElement<"thread">;
};

/**
 * A minimal threads scope that wraps a single thread.
 * Automatically provided by ExternalThread when no threads scope exists.
 * Mounts the provided thread resource element.
 */
const useSingleThreadList = ({
  thread,
}: SingleThreadListProps): ClientOutput<"threads"> => {
  const itemClient = useClientResource(SingleThreadListItem());
  const threadClient = useClientResource(thread);

  const state = useMemo(
    () => ({
      mainThreadId: THREAD_ID,
      newThreadId: null,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      threadIds: [THREAD_ID],
      archivedThreadIds: [],
      threadItems: [itemClient.state],
      main: threadClient.state,
    }),
    [itemClient.state, threadClient.state],
  );

  return {
    getState: () => state,
    switchToThread: () => {
      throw new Error("SingleThreadList does not support switchToThread");
    },
    switchToNewThread: () => {
      throw new Error("SingleThreadList does not support switchToNewThread");
    },
    getLoadThreadsPromise: () => RESOLVED_PROMISE,
    reload: () => RESOLVED_PROMISE,
    loadMore: () => RESOLVED_PROMISE,
    item: (selector) => {
      if (
        selector !== "main" &&
        !(
          typeof selector === "object" &&
          "id" in selector &&
          selector.id === THREAD_ID
        ) &&
        !(
          typeof selector === "object" &&
          "index" in selector &&
          selector.index === 0
        )
      ) {
        throw new Error(
          `SingleThreadList: unknown item selector ${JSON.stringify(selector)}`,
        );
      }
      return itemClient.methods;
    },
    thread: (selector) => {
      if (selector !== "main" && selector !== THREAD_ID) {
        throw new Error(
          `SingleThreadList: unknown thread selector ${JSON.stringify(selector)}`,
        );
      }
      return threadClient.methods;
    },
  };
};

export const SingleThreadList = resource(useSingleThreadList);
