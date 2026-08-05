"use client";

import { useEffect, useState } from "react";
import { Composer } from "@/components/elements/composer";
import { useElapsed, useStoryPhases } from "./use-demo";

const PHASES = [1400, 3600, 1600, 3000, 0] as const;
const TRANSCRIPT = "Add a regression test for draft restore";

export function ComposerVoiceDemo() {
  const { phase, running, takeOver } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");
  const elapsedTenths = useElapsed(running && phase === 1);

  useEffect(() => {
    if (phase >= 3) setValue(TRANSCRIPT);
  }, [phase]);

  return (
    <Composer
      value={value}
      onValueChange={(v) => {
        takeOver();
        setValue(v);
      }}
      onSend={() => setValue("")}
      recording={running && phase === 1}
      transcribing={running && phase === 2}
      recordingSeconds={Math.floor(elapsedTenths / 10)}
      onVoiceStart={takeOver}
      onVoiceStop={takeOver}
    />
  );
}
