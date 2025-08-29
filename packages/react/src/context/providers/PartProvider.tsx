"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import { AssistantApiContext } from "../react/AssistantApiContext";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const client = useAssistantStoreWithSelector({
    part: {
      state: (state) => {
        return state.message!.parts[index]!;
      },
      action: (actions) => {
        return actions.message.part({ index });
      },
    },
    meta: {
      part: {
        source: "message",
        query: {
          type: "index",
          index,
        },
      },
    },
  });

  return <AssistantApiContext value={client}>{children}</AssistantApiContext>;
};
