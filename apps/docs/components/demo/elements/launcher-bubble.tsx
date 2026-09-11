"use client";

import { useState } from "react";
import { LauncherBubble } from "@/components/assistant-ui/elements/launcher-bubble";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const PROMPTS = [
  "How do I add a thread list?",
  "What changed in 0.14?",
  "Show me an external store example",
];

const PHASES = [1200, 0] as const;

export function LauncherBubbleDemo() {
  const { phase, takeOver } = useStoryPhases(PHASES);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? phase >= 1;

  return (
    <LauncherBubble
      open={open}
      unread={2}
      greeting="Need a hand with assistant-ui?"
      prompts={PROMPTS}
      onToggle={() => {
        takeOver();
        setOverride(!open);
      }}
    />
  );
}
