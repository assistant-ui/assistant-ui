"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import { AssistantStoreContext } from "../react/AssistantContext";

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

  return (
    <AssistantStoreContext value={client}>{children}</AssistantStoreContext>
  );
};
