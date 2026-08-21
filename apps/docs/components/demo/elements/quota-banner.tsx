"use client";

import { QuotaBanner } from "@/components/elements/quota-banner";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [1400, 1400, 0] as const;
const USED = [32, 44, 47] as const;

export function QuotaBannerDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <QuotaBanner
      used={USED[Math.min(phase, USED.length - 1)] ?? 47}
      limit={50}
      unit="messages"
      resetsIn="3h 12m"
      upgradeLabel="Upgrade"
    />
  );
}
