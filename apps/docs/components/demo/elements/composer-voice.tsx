"use client";

import { useState } from "react";
import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
  ComposerVoice,
  ComposerVoiceButton,
} from "@/components/assistant-ui/elements/composer";
import { useElapsed, useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [1400, 3600, 1600, 3000, 0] as const;
const TRANSCRIPT = "Add a regression test for draft restore";

export function ComposerVoiceDemo() {
  const { phase, running, takeOver } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");
  const elapsedTenths = useElapsed(running && phase === 1);
  const recording = running && phase === 1;
  const transcribing = running && phase === 2;
  const active = recording || transcribing;

  const [syncedPhase, setSyncedPhase] = useState(phase);

  if (syncedPhase !== phase) {
    setSyncedPhase(phase);
    if (phase >= 3) setValue(TRANSCRIPT);
  }

  return (
    <Composer>
      <ComposerBar>
        {active ? (
          <ComposerVoice
            recording={recording}
            seconds={Math.floor(elapsedTenths / 10)}
          />
        ) : (
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={(event) => {
              takeOver();
              setValue(event.target.value);
            }}
            onSubmit={() => setValue("")}
          />
        )}
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={() => undefined} />
          </ComposerActions>
          <ComposerActions>
            <ComposerVoiceButton active={active} onClick={takeOver} />
            <ComposerSend
              streaming={false}
              idle={value.length === 0}
              onClick={() => setValue("")}
            />
          </ComposerActions>
        </ComposerToolbar>
      </ComposerBar>
    </Composer>
  );
}
