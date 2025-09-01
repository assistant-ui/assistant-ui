"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  AssistantState,
  ExtendedAssistantApiProvider,
} from "../react/AssistantApiContext";
import { MessagePartClientActions } from "../../client/MessagePartClient";
import { resource, tapMemo } from "@assistant-ui/tap";
import { useResource } from "@assistant-ui/tap/react";
import { asStore, tapActions } from "../../utils/tap-store";

const TextMessagePartActions = new Proxy({} as MessagePartClientActions, {
  get() {
    throw new Error("Not implemented");
  },
});

const TextMessagePartClient = resource(
  ({ text, isRunning }: { text: string; isRunning: boolean }) => {
    const state = tapMemo<Partial<AssistantState>>(
      () => ({
        part: {
          type: "text",
          text,
          status: isRunning ? { type: "running" } : { type: "complete" },
        },
      }),
      [text, isRunning],
    );

    const actions = tapActions({
      part: TextMessagePartActions,
    });

    return {
      state,
      actions,
      meta: {
        part: {
          source: "root",
          query: {},
        },
      } as const,
    };
  },
);

export const TextMessagePartProvider: FC<
  PropsWithChildren<{
    text: string;
    isRunning?: boolean;
  }>
> = ({ text, isRunning = false, children }) => {
  const api = useResource(asStore(TextMessagePartClient({ text, isRunning })));

  return (
    <ExtendedAssistantApiProvider api={api}>
      {children}
    </ExtendedAssistantApiProvider>
  );
};
