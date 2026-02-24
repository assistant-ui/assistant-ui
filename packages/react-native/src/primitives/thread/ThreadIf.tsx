import type { ReactNode } from "react";
import { useAuiState } from "@assistant-ui/store";

export type ThreadIfProps = {
  children: ReactNode;
  empty?: boolean | undefined;
  running?: boolean | undefined;
};

export const ThreadIf = ({ children, empty, running }: ThreadIfProps) => {
  const thread = useAuiState((s) => s.thread);

  if (empty !== undefined) {
    const isEmpty = thread.messages.length === 0;
    if (empty !== isEmpty) return null;
  }

  if (running !== undefined) {
    if (running !== thread.isRunning) return null;
  }

  return <>{children}</>;
};
