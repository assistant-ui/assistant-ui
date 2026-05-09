"use client";

import { useEffect, useState } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { VoiceOrb, type VoiceOrbState } from "@/components/assistant-ui/voice";

const CYCLE_STATES: VoiceOrbState[] = [
  "idle",
  "connecting",
  "listening",
  "speaking",
  "muted",
];

export function VoiceSample() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % CYCLE_STATES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const state = CYCLE_STATES[index]!;

  return (
    <SampleFrame className="flex h-auto flex-col items-center gap-6 bg-black/[0.03] py-12 dark:bg-white/[0.03]">
      <VoiceOrb state={state} variant="blue" className="size-32" />
      <span className="font-medium text-muted-foreground text-sm capitalize">
        {state}
      </span>
    </SampleFrame>
  );
}

export function VoiceVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-12 bg-black/[0.03] py-12 dark:bg-white/[0.03]">
      {(["default", "blue", "violet", "emerald"] as const).map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-4">
          <VoiceOrb state="speaking" variant={variant} className="size-24" />
          <span className="font-medium text-muted-foreground text-xs capitalize">
            {variant}
          </span>
        </div>
      ))}
    </SampleFrame>
  );
}

export function VoiceStatesSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-10 bg-black/[0.03] py-12 dark:bg-white/[0.03]">
      {CYCLE_STATES.map((state) => (
        <div key={state} className="flex flex-col items-center gap-4">
          <VoiceOrb state={state} variant="blue" className="size-20" />
          <span className="font-medium text-muted-foreground text-xs capitalize">
            {state}
          </span>
        </div>
      ))}
    </SampleFrame>
  );
}
