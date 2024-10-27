"use client";

import { ComponentType, FC, memo, useMemo } from "react";
import { ThreadManagerItemRuntimeProvider } from "../../context/providers/ThreadManagerItemRuntimeProvider";
import { useAssistantRuntime, useThreadManager } from "../../context";

export namespace MessagePrimitiveContent {
  export type Props = {
    archived?: boolean | undefined;
    components: {
      ThreadManagerItem: ComponentType;
    };
  };
}

type ThreadManagerItemProps = {
  partIndex: number;
  archived: boolean;
  components: MessagePrimitiveContent.Props["components"];
};

const ThreadManagerItemImpl: FC<ThreadManagerItemProps> = ({
  partIndex,
  archived,
  components,
}) => {
  const assistantRuntime = useAssistantRuntime();
  const runtime = useMemo(
    () =>
      archived
        ? assistantRuntime.threadManager.getThreadManagerArchivedItemByIndex(
            partIndex,
          )
        : assistantRuntime.threadManager.getThreadManagerItemByIndex(partIndex),
    [assistantRuntime, partIndex],
  );

  const ThreadManagerItemComponent = components.ThreadManagerItem;

  return (
    <ThreadManagerItemRuntimeProvider runtime={runtime}>
      <ThreadManagerItemComponent />
    </ThreadManagerItemRuntimeProvider>
  );
};

const ThreadManagerItem = memo(
  ThreadManagerItemImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.archived === next.archived &&
    prev.components.ThreadManagerItem === next.components.ThreadManagerItem,
);

export const ThreadManagerPrimitiveItems: FC<MessagePrimitiveContent.Props> = ({
  archived = false,
  components,
}) => {
  const contentLength = useThreadManager((s) =>
    archived ? s.archivedThreads.length : s.threads.length,
  );

  return Array.from({ length: contentLength }, (_, index) => (
    <ThreadManagerItem
      key={index}
      partIndex={index}
      archived={archived}
      components={components}
    />
  ));
};

ThreadManagerPrimitiveItems.displayName = "ThreadManagerPrimitive.Items";
