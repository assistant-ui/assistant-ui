"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantApiProvider,
  AssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../client/MessagePartClient";
import { resource, tapMemo } from "@assistant-ui/tap";
import { useResource } from "@assistant-ui/tap/react";
import { asStore, tapApi } from "../../utils/tap-store";

const TextMessagePartActions = new Proxy({} as MessagePartClientActions, {
  get() {
    throw new Error("Not implemented");
  },
});

const TextMessagePartClient = resource(
  ({ text, isRunning }: { text: string; isRunning: boolean }) => {
    const state = tapMemo<MessagePartClientState>(
      () => ({
        type: "text",
        text,
        status: isRunning ? { type: "running" } : { type: "complete" },
      }),
      [text, isRunning],
    );

    const api = tapApi(state, TextMessagePartActions);

    return {
      state,
      api,
    };
  },
);

export const TextMessagePartProvider: FC<
  PropsWithChildren<{
    text: string;
    isRunning?: boolean;
  }>
> = ({ text, isRunning = false, children }) => {
  const store = useResource(
    asStore(TextMessagePartClient({ text, isRunning })),
  );
  const api = useMemo(() => {
    return {
      part: createAssistantApiField({
        source: "root",
        query: {},
        get: () => store.getApi(),
      }),
      subscribe: store.subscribe,
      // flushSync: store.flushSync,
    } satisfies Partial<AssistantApi>;
  }, [store]);

  return <AssistantApiProvider api={api}>{children}</AssistantApiProvider>;
};
