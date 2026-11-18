import {
  createComponent,
  createMemo,
  For,
  onCleanup,
  Show,
  type JSX,
} from "solid-js";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";
import type { ThreadListItemMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * Scopes the subtree to the thread-list item at `index`: descendants read it
 * through `s.threadListItem`.
 */
export const ThreadListItemByIndexProvider = (props: {
  index: number;
  archived?: boolean;
  children?: JSX.Element;
}): JSX.Element => {
  const aui = useAui();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });
  const config = createMemo(() => {
    const index = props.index;
    const archived = props.archived ?? false;
    const idsOf = (state: {
      archivedThreadIds: readonly string[];
      threadIds: readonly string[];
    }) => (archived ? state.archivedThreadIds : state.threadIds);
    const cache = createLastValidCache<ThreadListItemMethods>(
      createStaleReporter({
        name: "ThreadListItemByIndexProvider",
        index,
        isCurrent: () =>
          !disposed &&
          index === props.index &&
          archived === (props.archived ?? false),
        isValid: () => index < idsOf(aui.threads.getState()).length,
      }),
      queueMicrotask,
    );
    return AuiConfig({
      threadListItem: Derived({
        source: "threads",
        query: { type: "index", index, archived },
        get: (aui) =>
          cache.resolve(index < idsOf(aui.threads.getState()).length, () =>
            aui.threads.item({ index, archived }),
          ),
      }),
    });
  });
  return createComponent(AuiProvider, {
    get config() {
      return config();
    },
    extends: aui,
    get children() {
      return props.children;
    },
  });
};

/**
 * Renders the children once per thread in the list (or per archived thread
 * with `archived`), each instance scoped through
 * {@link ThreadListItemByIndexProvider}.
 */
export const ThreadListPrimitiveItems = (props: {
  archived?: boolean;
  children?: JSX.Element;
}): JSX.Element => {
  const threadIds = useAuiState((s) =>
    props.archived ? s.threads.archivedThreadIds : s.threads.threadIds,
  );
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return threadIds();
    },
    children: (_threadId, index) =>
      createComponent(ThreadListItemByIndexProvider, {
        get index() {
          return index();
        },
        get archived() {
          return props.archived ?? false;
        },
        get children() {
          return props.children;
        },
      }),
  });
};

/**
 * Renders the current thread-list item's title. When the title is empty,
 * renders the children, or the `fallback` string.
 */
export const ThreadListItemPrimitiveTitle = (props: {
  fallback?: string;
  children?: JSX.Element;
}): JSX.Element => {
  const title = useAuiState((s) => s.threadListItem.title);
  return createComponent(Show, {
    keyed: true,
    get when() {
      return title();
    },
    get fallback() {
      return "children" in props ? props.children : (props.fallback ?? "");
    },
    get children() {
      return title();
    },
  });
};
