"use client";

import { useCallback, useContext } from "react";
import {
  ScrollAnchor,
  type ScrollAnchorMessage,
} from "@/components/elements/scroll-anchor";
import { DemoStageContext } from "./demo-stage";

const MESSAGES: ScrollAnchorMessage[] = [
  { role: "user", text: "Why does the thread jump while streaming?" },
  {
    role: "assistant",
    text: "The viewport pins to the bottom only while you are already there, so mid-stream layout shifts never steal your position.",
  },
  { role: "user", text: "And when I scroll up to reread something?" },
  {
    role: "assistant",
    text: "Pinning pauses. New tokens keep arriving below without moving your scroll position at all.",
  },
  { role: "user", text: "How do I get back down quickly?" },
  {
    role: "assistant",
    text: "A jump pill appears once content lands out of view. One click resumes the pinned follow.",
  },
  {
    role: "assistant",
    text: "That is also exactly what the ScrollToBottom primitive wires up for you.",
  },
];

export function ScrollAnchorDemo() {
  const stage = useContext(DemoStageContext);
  const handleSettled = useCallback(() => stage?.setPlaying(false), [stage]);

  return (
    <ScrollAnchor
      messages={MESSAGES}
      paused={stage?.stopped ?? false}
      onSettled={handleSettled}
    />
  );
}
