"use client";

import { ComponentType, FC, memo, useMemo } from "react";
import { ThreadListItemRuntimeProvider } from "../../context/providers/ThreadListItemRuntimeProvider";
import { useAssistantRuntime, useThreadList } from "../../context";

export namespace MessagePrimitiveContent {
  export type Props = {
    archived?: boolean | undefined;
    components: {
      ThreadListItem: ComponentType;
    };
  };
}

type ThreadListItemProps = {
  partIndex: number;
  archived: boolean;
  components: MessagePrimitiveContent.Props["components"];
};

const ThreadListItemImpl: FC<ThreadListItemProps> = ({
  partIndex,
  archived,
  components,
}) => {
  const assistantRuntime = useAssistantRuntime();
  const runtime = useMemo(
    () =>
      archived
        ? assistantRuntime.threadList.getThreadListArchivedItemByIndex(
            partIndex,
          )
        : assistantRuntime.threadList.getThreadListItemByIndex(partIndex),
    [assistantRuntime, partIndex],
  );

  const ThreadListItemComponent = components.ThreadListItem;

  return (
    <ThreadListItemRuntimeProvider runtime={runtime}>
      <ThreadListItemComponent />
    </ThreadListItemRuntimeProvider>
  );
};

const ThreadListItem = memo(
  ThreadListItemImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.archived === next.archived &&
    prev.components.ThreadListItem === next.components.ThreadListItem,
);

export const ThreadListPrimitiveItems: FC<MessagePrimitiveContent.Props> = ({
  archived = false,
  components,
}) => {
  const contentLength = useThreadList((s) =>
    archived ? s.archivedThreads.length : s.threads.length,
  );

  return Array.from({ length: contentLength }, (_, index) => (
    <ThreadListItem
      key={index}
      partIndex={index}
      archived={archived}
      components={components}
    />
  ));
};

ThreadListPrimitiveItems.displayName = "ThreadListPrimitive.Items";
