"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import {
  AssistantApi,
  AssistantApiContext,
  useAssistantApi,
} from "../react/AssistantApiContext";
import { ThreadListClientActions } from "../../client/ThreadListClient";

export namespace ThreadListItemProvider {
  export type Props = PropsWithChildren<{
    id: Parameters<ThreadListClientActions["item"]>[0];
    meta: NonNullable<AssistantApi["meta"]["threadListItem"]>;
  }>;
}

const ThreadListItemProvider: FC<ThreadListItemProvider.Props> = ({
  id: idOrSelector,
  children,
  meta,
}) => {
  const { actions } = useAssistantApi();

  const threadListItemActions = useMemo(() => {
    return actions.threads.item(idOrSelector);
  }, [actions, idOrSelector]);

  const client = useAssistantStoreWithSelector({
    threadListItem: {
      state:
        "index" in idOrSelector
          ? (state) =>
              state.threads.threadItems[
                idOrSelector.archived
                  ? state.threads.archivedThreadIds[idOrSelector.index]!
                  : state.threads.threadIds[idOrSelector.index]!
              ]!
          : (state) => state.threads.threadItems[idOrSelector.id]!,
      action: () => threadListItemActions,
    },
    meta: {
      threadListItem: meta,
    },
  });

  return <AssistantApiContext value={client}>{children}</AssistantApiContext>;
};

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  return (
    <ThreadListItemProvider
      id={useMemo(() => ({ index, archived }), [index, archived])}
      meta={{
        source: "threads",
        query: {
          type: "index",
          index,
          archived,
        },
      }}
    >
      {children}
    </ThreadListItemProvider>
  );
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  return (
    <ThreadListItemProvider
      id={{ id }}
      meta={{
        source: "threads",
        query: {
          type: "id",
          id,
        },
      }}
    >
      {children}
    </ThreadListItemProvider>
  );
};
