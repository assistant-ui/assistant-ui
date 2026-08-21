"use client";

import { useEffect, useState } from "react";
import {
  VoiceConversation,
  type VoiceMode,
  type VoiceTurn,
} from "@/components/elements/voice-conversation";
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

  useEffect(() => {
    if (!running) return;
    if (mode !== "listening" && mode !== "speaking") {
      setAmplitude(0.15);
      return;
    }
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setAmplitude(0.35 + Math.abs(Math.sin(tick * 0.7)) * 0.6);
    }, 110);
    return () => clearInterval(id);
  }, [mode, running]);

  return (
    <VoiceConversation
      mode={mode}
      amplitude={amplitude}
      transcript={TRANSCRIPT.slice(0, VISIBLE[Math.min(phase, 4)])}
      muted={muted}
      onToggleMute={() => setMuted((current) => !current)}
      onEnd={() => setMuted(false)}
    />
  );
}
