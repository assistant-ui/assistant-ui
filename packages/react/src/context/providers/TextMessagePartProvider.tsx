"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  AssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";
import {
  MessagePartClientApi,
  MessagePartClientState,
} from "../../client/types/Part";
import { resource, tapMemo } from "@assistant-ui/tap";
import { useResource } from "@assistant-ui/tap/react";
import { asStore, tapApi } from "../../utils/tap-store";

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

    return tapApi<MessagePartClientApi>({
      getState: () => state,
      addToolResult: () => {
        throw new Error("Not supported");
      },
      resumeToolCall: () => {
        throw new Error("Not supported");
      },
    });
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
        get: () => store.getState().api,
      }),
      subscribe: store.subscribe,
      flushSync: store.flushSync,
    } satisfies Partial<AssistantApi>;
  }, [store]);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
