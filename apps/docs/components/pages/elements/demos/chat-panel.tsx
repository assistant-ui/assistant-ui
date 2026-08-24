"use client";

import {
  ChatPanel,
  ChatPanelComposer,
  ChatPanelMessages,
  ChatPanelTyping,
  ChatPanelUserMessage,
} from "@/components/elements/chat-panel";
import { StreamingText } from "@/components/elements/streaming-text";
import { useElapsed, useStoryPhases } from "@/components/demo/use-demo";

const USER_MESSAGE = "Why did my draft disappear?";
const SEGMENTS = [
  {
    text: "Drafts were living in component state, so switching threads reset them. The runtime now keys every draft by thread id and restores it when you come back.",
  },
];
const WORD_COUNT = SEGMENTS[0]!.text.split(" ").length;
const PHASES = [1400, 1500, 3400, 2800] as const;

export function ChatPanelDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const streamTenths = useElapsed(running && phase === 2);
  const count =
    phase < 2
      ? 0
      : phase === 2
        ? Math.min(Math.floor(streamTenths * 0.9), WORD_COUNT)
        : WORD_COUNT;

  return (
    <ChatPanel>
      <ChatPanelMessages>
        <ChatPanelUserMessage>{USER_MESSAGE}</ChatPanelUserMessage>
        {running && phase === 1 && <ChatPanelTyping />}
        {count > 0 && (
          <StreamingText
            segments={SEGMENTS}
            count={count}
            streaming={running && phase === 2 && count < WORD_COUNT}
            className="text-foreground/70 min-h-0 max-w-[85%] self-start text-xs"
          />
        )}
      </ChatPanelMessages>
      <ChatPanelComposer placeholder="Message" onSend={() => undefined} />
    </ChatPanel>
  );
}
