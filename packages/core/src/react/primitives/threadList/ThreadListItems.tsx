import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import type { ThreadListItemState } from "../../../store/scopes/thread-list-item";
import { ThreadListItemByIndexProvider } from "../../providers/ThreadListItemByIndexProvider";

type ThreadListItemsComponentConfig = {
  ThreadListItem: ComponentType;
};

export namespace ThreadListPrimitiveItems {
  export type Props = {
    archived?: boolean | undefined;
  } & (
    | {
        /** @deprecated Use the children render function instead. */
        components: ThreadListItemsComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each thread list item. Receives the item. */
        children: (value: { threadListItem: ThreadListItemState }) => ReactNode;
        components?: never;
      }
  );
}

export namespace ThreadListPrimitiveItemByIndex {
  export type Props = {
    index: number;
    archived?: boolean | undefined;
    components: ThreadListItemsComponentConfig;
  };
}

/**
 * Renders a single thread list item at the specified index.
 */
export const ThreadListPrimitiveItemByIndex: FC<ThreadListPrimitiveItemByIndex.Props> =
  memo(
    ({ index, archived = false, components }) => {
      const ThreadListItemComponent = components.ThreadListItem;

      return (
        <ThreadListItemByIndexProvider index={index} archived={archived}>
          <ThreadListItemComponent />
        </ThreadListItemByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.archived === next.archived &&
      prev.components.ThreadListItem === next.components.ThreadListItem,
  );

ThreadListPrimitiveItemByIndex.displayName = "ThreadListPrimitive.ItemByIndex";

const ThreadListPrimitiveItemsInner: FC<{
  archived: boolean;
  children: (value: { threadListItem: ThreadListItemState }) => ReactNode;
}> = ({ archived, children }) => {
  const contentLength = useAuiState((s) =>
    archived ? s.threads.archivedThreadIds.length : s.threads.threadIds.length,
  );

  return useMemo(
    () =>
      Array.from({ length: contentLength }, (_, index) => (
        <ThreadListItemByIndexProvider
          key={index}
          index={index}
          archived={archived}
        >
          <RenderChildrenWithAccessor
            getItemState={(aui) =>
              aui.threads().item({ index, archived }).getState()
            }
          >
            {(getItem) =>
              children({
                get threadListItem() {
                  return getItem();
                },
              })
            }
          </RenderChildrenWithAccessor>
        </ThreadListItemByIndexProvider>
      )),
    [contentLength, archived, children],
  );
};

export const ThreadListPrimitiveItems: FC<ThreadListPrimitiveItems.Props> = ({
  archived = false,
  components,
  children,
}) => {
  if (components) {
    const ThreadListItemComponent = components.ThreadListItem;
    return (
      <ThreadListPrimitiveItemsInner archived={archived}>
        {() => <ThreadListItemComponent />}
      </ThreadListPrimitiveItemsInner>
    );
  }
  return (
    <ThreadListPrimitiveItemsInner archived={archived}>
      {children}
    </ThreadListPrimitiveItemsInner>
  );
};

ThreadListPrimitiveItems.displayName = "ThreadListPrimitive.Items";
