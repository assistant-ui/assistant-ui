import { useEffect, useRef, useState, type ComponentProps } from "react";

import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (seconds: number) => {
  if (seconds < 60) return `(${seconds}s)`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `(${minutes}m ${remainingSeconds}s)`;
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
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const runningMessageId = useAuiState((s) => {
    const lastMessage = s.thread.messages.at(-1);

    if (lastMessage?.role !== "assistant") return undefined;
    if (lastMessage.status?.type !== "running") return undefined;
    return lastMessage.id;
  });
  const runningMessageIsOptimistic = useAuiState((s) => {
    const lastMessage = s.thread.messages.at(-1);

    if (lastMessage?.role !== "assistant") return false;
    if (lastMessage.status?.type !== "running") return false;
    return lastMessage.metadata?.isOptimistic === true;
  });
  const streamStartTime = useAuiState((s) => {
    const lastMessage = s.thread.messages.at(-1);

    if (lastMessage?.role !== "assistant") return undefined;
    if (lastMessage.status?.type !== "running") return undefined;
    return lastMessage.metadata?.timing?.streamStartTime;
  });
  const [clock, setClock] = useState(() => {
    const now = Date.now();
    return { start: now, now };
  });
  const previousRunningMessageRef = useRef<
    { id: string | undefined; isOptimistic: boolean } | undefined
  >(undefined);

  useEffect(() => {
    if (!isRunning) {
      previousRunningMessageRef.current = undefined;
      return;
    }

    const previousMessage = previousRunningMessageRef.current;
    const replacesOptimisticMessage =
      previousMessage?.isOptimistic === true && !runningMessageIsOptimistic;
    previousRunningMessageRef.current = {
      id: runningMessageId,
      isOptimistic: runningMessageIsOptimistic,
    };

    if (!replacesOptimisticMessage) {
      const now = Date.now();
      setClock({ start: now, now });
    }

    const interval = setInterval(() => {
      setClock((current) => ({ ...current, now: Date.now() }));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning, runningMessageId, runningMessageIsOptimistic]);

  const startTime = streamStartTime ?? clock.start;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((clock.now - startTime) / 1000),
  );

  return <Text {...textProps}>{format(elapsedSeconds)}</Text>;
};

LoadingElapsedTime.displayName = "LoadingPrimitive.ElapsedTime";
