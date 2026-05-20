import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Text } from "ink";
import { useThreadIsRunning } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
};

export type LoadingElapsedTimeProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  format?: (seconds: number) => string;
};

export const LoadingElapsedTime = ({
  format = defaultFormat,
  ...textProps
}: LoadingElapsedTimeProps) => {
  const isRunning = useThreadIsRunning();
  const streamStartTime = useAuiState((s) => {
    const lastMessage = s.thread.messages.at(-1);

    if (lastMessage?.role !== "assistant") return undefined;
    if (lastMessage.status?.type !== "running") return undefined;
    return lastMessage.metadata?.timing?.streamStartTime;
  });
  const [now, setNow] = useState(() => Date.now());
  const fallbackStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning]);

  const startTime = streamStartTime ?? fallbackStartTimeRef.current;
  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

  return <Text {...textProps}>({format(elapsedSeconds)})</Text>;
};

LoadingElapsedTime.displayName = "LoadingPrimitive.ElapsedTime";
