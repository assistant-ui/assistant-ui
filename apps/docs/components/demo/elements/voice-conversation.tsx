"use client";

import { useEffect, useState } from "react";
import {
  VoiceConversation,
  type VoiceMode,
  type VoiceTurn,
} from "@/components/assistant-ui/elements/voice-conversation";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const MODES: readonly VoiceMode[] = [
  "connecting",
  "listening",
  "thinking",
  "speaking",
  "listening",
];

const TRANSCRIPT: readonly VoiceTurn[] = [
  { id: "u1", role: "user", text: "What broke in the last deploy?" },
  {
    id: "a1",
    role: "assistant",
    text: "The converter dropped empty parts. I pushed a guard.",
  },
];

const PHASES = [1200, 2600, 1600, 3200, 0] as const;
const VISIBLE = [0, 0, 1, 1, 2] as const;

export function VoiceConversationDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const mode = MODES[Math.min(phase, MODES.length - 1)]!;
  const [amplitude, setAmplitude] = useState(0.2);
  const [muted, setMuted] = useState(false);
  const oscillating = running && (mode === "listening" || mode === "speaking");
  const [syncedOscillating, setSyncedOscillating] = useState(oscillating);
  const displayAmplitude = oscillating ? amplitude : 0.15;

  if (syncedOscillating !== oscillating) {
    setSyncedOscillating(oscillating);
    if (oscillating) setAmplitude(0.15);
  }

  useEffect(() => {
    if (!oscillating) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setAmplitude(0.35 + Math.abs(Math.sin(tick * 0.7)) * 0.6);
    }, 110);
    return () => clearInterval(id);
  }, [oscillating]);

  return (
    <VoiceConversation
      mode={mode}
      amplitude={displayAmplitude}
      transcript={TRANSCRIPT.slice(0, VISIBLE[Math.min(phase, 4)])}
      muted={muted}
      onToggleMute={() => setMuted((current) => !current)}
      onEnd={() => setMuted(false)}
    />
  );
}
