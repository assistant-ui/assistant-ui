"use client";

import { type FC, type PropsWithChildren, useMemo } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import { AssistantStoreContext } from "../react/AssistantContext";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../client/MessagePartClient";

const TextMessagePartActions = new Proxy({} as MessagePartClientActions, {
  get() {
    throw new Error("Not implemented");
  },
});

export const TextMessagePartProvider: FC<
  PropsWithChildren<{
    text: string;
    isRunning?: boolean;
  }>
> = ({ text, isRunning, children }) => {
  const state = useMemo(
    () =>
      ({
        type: "text",
        text,
        status: isRunning ? { type: "running" } : { type: "complete" },
      }) satisfies MessagePartClientState,
    [text, isRunning],
  );

  const client = useAssistantStoreWithSelector({
    part: {
      state: () => state,
      action: () => TextMessagePartActions,
    },
    meta: {
      part: {
        source: "root",
        query: {},
      },
    },
  });
  // This is a placeholder provider for now
  // The actual text content is accessed through the part state
  return (
    <AssistantStoreContext value={client}>{children}</AssistantStoreContext>
  );
};
