import { type FC, type PropsWithChildren, useMemo } from "react";
import { useAui, AuiProvider, type ClientOutput } from "@assistant-ui/store";
import type { PartState } from "../../store/scopes/part";

import { resource } from "@assistant-ui/tap";

const useTextMessagePartClient = ({
  text,
  isRunning,
}: {
  text: string;
  isRunning: boolean;
}): ClientOutput<"part"> => {
  const state = useMemo<PartState>(
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
    respondToToolApproval: () => {
      throw new Error("Not supported");
    },
  };
};

const TextMessagePartClient = resource(useTextMessagePartClient);

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
