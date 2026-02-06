"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, type ClientOutput } from "@assistant-ui/store";
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
      getState: () => state,
      addToolResult: () => {
        throw new Error("Not supported");
      },
      resumeToolCall: () => {
        throw new Error("Not supported");
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
  const aui = useAui({
    part: TextMessagePartClient({ text, isRunning }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
