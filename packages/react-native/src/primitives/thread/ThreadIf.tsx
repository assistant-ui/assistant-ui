import type { ReactNode } from "react";
import { useThread } from "../../hooks/useThread";

export type ThreadIfProps = {
  children: ReactNode;
  empty?: boolean | undefined;
  running?: boolean | undefined;
};

export const ThreadIf = ({ children, empty, running }: ThreadIfProps) => {
  const thread = useThread();

  if (empty !== undefined) {
    const isEmpty = thread.messages.length === 0;
    if (empty !== isEmpty) return null;
  }

  if (running !== undefined) {
    if (running !== thread.isRunning) return null;
  }

  return <>{children}</>;
};
