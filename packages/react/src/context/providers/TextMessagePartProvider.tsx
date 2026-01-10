"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  useAssistantClient,
  AssistantProvider,
  type ClientOutput,
} from "@assistant-ui/store";
import { PartState } from "../../types/scopes";
import { resource, tapMemo } from "@assistant-ui/tap";

const TextMessagePartClient = resource(
  ({
    text,
    isRunning,
  }: {
    text: string;
    isRunning: boolean;
  }): ClientOutput<"part"> => {
    const state = tapMemo<PartState>(
      () => ({
        type: "text",
        text,
        status: isRunning ? { type: "running" } : { type: "complete" },
      }),
      [text, isRunning],
    );

    return {
      state,
      methods: {
        getState: () => state,
        addToolResult: () => {
          throw new Error("Not supported");
        },
        resumeToolCall: () => {
          throw new Error("Not supported");
        },
      },
    };
  },
);

export const TextMessagePartProvider: FC<
  PropsWithChildren<{
    text: string;
    isRunning?: boolean;
  }>
> = ({ text, isRunning = false, children }) => {
  const aui = useAssistantClient({
    part: TextMessagePartClient({ text, isRunning }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};
