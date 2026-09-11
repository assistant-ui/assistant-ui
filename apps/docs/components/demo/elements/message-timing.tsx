"use client";

import {
  MessageTiming,
  type TimingStat,
} from "@/components/assistant-ui/elements/message-timing";
import { useElapsed, useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [2600, 0] as const;

export function MessageTimingDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const streaming = running && phase === 0;
  const tenths = useElapsed(running && streaming);

  const stats: TimingStat[] = streaming
    ? [
        { label: "ttft", value: "0.4s" },
        { label: "elapsed", value: `${(tenths / 10).toFixed(1)}s` },
        { label: "tok/s", value: "58" },
      ]
    : [
        { label: "ttft", value: "0.4s" },
        { label: "total", value: "2.6s" },
        { label: "tok/s", value: "61" },
        { label: "tokens", value: "1,204" },
        { label: "cost", value: "$0.018" },
      ];

  return <MessageTiming stats={stats} streaming={streaming} />;
}
