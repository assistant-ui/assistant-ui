import { resource, tapMemo } from "@assistant-ui/tap";
import {
  type ClientElement,
  type ClientOutput,
  tapClientResource,
} from "@assistant-ui/store";

const RESOLVED_PROMISE = Promise.resolve();
const THREAD_ID = "default";

const SingleThreadListItem = resource((): ClientOutput<"threadListItem"> => {
  return {
    getState: () => ({
      id: THREAD_ID,
      remoteId: undefined,
      externalId: undefined,
      title: undefined,
      status: "regular",
    }),
    switchTo: () => {},
    rename: () => {},
    archive: () => {},
    unarchive: () => {},
    delete: () => {},
    generateTitle: () => {},
    initialize: async () => ({ remoteId: THREAD_ID, externalId: undefined }),
    detach: () => {},
  };
});

type SingleThreadListProps = {
  thread: ClientElement<"thread">;
};

/**
 * A minimal threads scope that wraps a single thread.
 * Automatically provided by ExternalThread when no threads scope exists.
 * Mounts the provided thread resource element.
 */
export const SingleThreadList = resource(
  ({ thread }: SingleThreadListProps): ClientOutput<"threads"> => {
    const itemClient = tapClientResource(SingleThreadListItem());
    const threadClient = tapClientResource(thread);

    const state = tapMemo(
      () => ({
        mainThreadId: THREAD_ID,
        newThreadId: null,
        isLoading: false,
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
  },
);
