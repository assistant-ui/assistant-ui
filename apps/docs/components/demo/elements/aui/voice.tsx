"use client";

import { VoiceOrb } from "@/components/assistant-ui/elements/voice.aui";
import { RuntimeDemo } from "./surface";

export function AuiVoiceDemo() {
  return (
    <RuntimeDemo>
      <div className="flex flex-col items-center gap-5">
        <VoiceOrb state="speaking" variant="blue" className="size-32" />
        <span className="text-muted-foreground text-sm font-medium">
          Speaking
        </span>
      </div>
    </RuntimeDemo>
  );
}
