"use client";

import { NumberTicker } from "@/components/elements/number-ticker";
import { useStoryPhases } from "@/components/demo/use-demo";

const VALUES = [12847, 14211, 15108, 17318, 17776] as const;
const PHASES = [900, 900, 900, 900, 0] as const;

export function NumberTickerDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <NumberTicker value={VALUES[phase] ?? VALUES[0]} label="tokens generated" />
  );
}
