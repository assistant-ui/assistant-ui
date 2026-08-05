"use client";

import { ChatPanel } from "@/components/elements/chat-panel";
import { useElapsed, useStoryPhases } from "./use-demo";

const USER_MESSAGE = "Why did my draft disappear?";
const REPLY =
  "Drafts were living in component state, so switching threads reset them. The runtime now keys every draft by thread id and restores it when you come back.";
const PHASES = [1400, 1500, 3400, 2800] as const;

export function ChatPanelDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const streamTenths = useElapsed(running && phase === 2);
  const words = REPLY.split(" ");
  const visibleWords =
    phase < 2
      ? 0
      : phase === 2
        ? Math.min(Math.floor(streamTenths * 0.9), words.length)
        : words.length;

  return (
    <ChatPanel
      userMessage={USER_MESSAGE}
      reply={REPLY}
      showUserMessage
      typing={running && phase === 1}
      visibleWords={visibleWords}
      streaming={running && phase === 2 && visibleWords < words.length}
    />
  );
}
