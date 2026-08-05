"use client";

import { useState } from "react";
import { Composer } from "@/components/elements/composer";
import { useElapsed, useStoryPhases } from "./use-demo";

const PHASES = [6000, 0] as const;

export function ComposerContextDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");
  const tenths = useElapsed(running && phase === 0);
  const messages =
    phase >= 1 ? 158 : Math.min(158, 4 + Math.round(tenths * 2.6));

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSend={() => setValue("")}
      placeholder="Hover the ring for the breakdown"
      usage={{ system: 12, tools: 8, messages, total: 200 }}
    />
  );
}
