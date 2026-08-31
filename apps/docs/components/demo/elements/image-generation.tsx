"use client";

import { ImageGeneration } from "@/components/assistant-ui/elements/image-generation";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [3600, 4000] as const;

export function ImageGenerationDemo() {
  const { phase } = useStoryPhases(PHASES);
  return (
    <ImageGeneration
      prompt="A calm mountain lake at dawn"
      generating={phase === 0}
    />
  );
}
