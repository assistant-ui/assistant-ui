import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
};

export type LoadingElapsedTimeProps = {
  color?: ComponentProps<typeof Text>["color"];
  format?: (seconds: number) => string;
};

export const LoadingElapsedTime = ({
  color = "gray",
  format = defaultFormat,
}: LoadingElapsedTimeProps) => {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const streamStartTime = useAuiState((s) => {
    const lastMessage = s.thread.messages.at(-1);

    if (lastMessage?.role !== "assistant") return undefined;
    return lastMessage.metadata?.timing?.streamStartTime;
  });
  const [now, setNow] = useState(() => Date.now());
  const fallbackStartTimeRef = useRef(Date.now());
  const wasRunningRef = useRef(isRunning);

  useEffect(() => {
    if (isRunning && !wasRunningRef.current) {
      fallbackStartTimeRef.current = Date.now();
      setNow(Date.now());
    }

    wasRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    setNow(Date.now());

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning]);

  const startTime = streamStartTime ?? fallbackStartTimeRef.current;
  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

  return (
    <Text color={color} dimColor>
      ({format(elapsedSeconds)})
    </Text>
  );
};

LoadingElapsedTime.displayName = "LoadingPrimitive.ElapsedTime";
