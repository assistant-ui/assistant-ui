import type { ReactNode } from "react";
import { useMessage } from "../../hooks/useMessage";

export type MessageIfProps = {
  children: ReactNode;
  user?: boolean | undefined;
  assistant?: boolean | undefined;
  running?: boolean | undefined;
  last?: boolean | undefined;
};

export const MessageIf = ({
  children,
  user,
  assistant,
  running,
  last,
}: MessageIfProps) => {
  const message = useMessage();

  if (user !== undefined) {
    if (user !== (message.role === "user")) return null;
  }

  if (assistant !== undefined) {
    if (assistant !== (message.role === "assistant")) return null;
  }

  if (running !== undefined) {
    const isRunning =
      message.role === "assistant" && message.status.type === "running";
    if (running !== isRunning) return null;
  }

  if (last !== undefined) {
    if (last !== message.isLast) return null;
  }

  return <>{children}</>;
};
