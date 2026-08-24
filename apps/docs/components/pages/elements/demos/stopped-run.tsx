"use client";

import { StoppedRun } from "@/components/elements/stopped-run";
import { useWordStream } from "@/components/demo/use-demo";

const TEXT =
  "The composer reads the draft from the per-thread slot, so switching threads mid-edit no longer";

export function StoppedRunDemo() {
  const { words, count } = useWordStream(TEXT, { interval: 90 });

  return <StoppedRun words={words.slice(0, count)} reason="stopped by you" />;
}
