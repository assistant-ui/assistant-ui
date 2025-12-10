"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  useExtendedAssistantApi,
} from "../react/AssistantApiContext";
import { PartMethods, PartState } from "../../types/scopes";
import { resource, tapMemo } from "@assistant-ui/tap";
import { useResource } from "@assistant-ui/tap/react";
import { asStore, tapApi } from "../../utils/tap-store";
import { DerivedScope } from "../../utils/tap-store/derived-scopes";

const TextMessagePartClient = resource(
  ({ text, isRunning }: { text: string; isRunning: boolean }) => {
    const state = tapMemo<PartState>(
      () => ({
        type: "text",
        text,
        status: isRunning ? { type: "running" } : { type: "complete" },
      }),
      [text, isRunning],
    );

    return tapApi<PartMethods>({
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
  const api = useExtendedAssistantApi({
    part: DerivedScope({
      source: "root",
      query: {},
      get: () => store.getState().api,
    }),
    subscribe: store.subscribe,
  });

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
