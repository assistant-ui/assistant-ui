"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import {
  AssistantApiContext,
  useAssistantApi,
} from "../react/AssistantApiContext";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const { actions } = useAssistantApi();
  const messageActions = useMemo(() => {
    return actions.thread.message({ index });
  }, [actions, index]);

  const client = useAssistantStoreWithSelector({
    message: {
      state: (state) => state.thread.messages[index]!,
      action: () => messageActions,
    },
    composer: {
      state: (state) => state.message.composer,
      action: (actions) => actions.message.composer,
    },
    meta: {
      message: {
        source: "thread",
        query: {
          type: "index",
          index,
        },
      },
    },
  });

  return <AssistantApiContext value={client}>{children}</AssistantApiContext>;
};
