"use client";

import {
  CanvasSplit,
  CanvasSplitBody,
  CanvasSplitDocument,
  CanvasSplitHeader,
  CanvasSplitLine,
  CanvasSplitMessage,
  CanvasSplitThread,
} from "@/components/elements/canvas-split";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const MESSAGES = [
  {
    id: "u1",
    speaker: "user" as const,
    text: "Draft the migration note for 0.14",
  },
  {
    id: "a1",
    speaker: "assistant" as const,
    text: "Opened it in the canvas — editing now.",
  },
];

const LINES: readonly { text: string; heading?: boolean }[] = [
  { text: "Migrating to 0.14", heading: true },
  {
    text: "The composer now owns its draft, so `useState` in the parent is no longer read.",
  },
  {
    text: "Replace the local draft with `useDraft(threadId)` and drop the hydrate effect.",
  },
  {
    text: "Threads that switch mid-edit keep their own draft instead of inheriting the last one.",
  },
];

const PHASES = [900, 900, 900, 900, 0] as const;

export function CanvasSplitDemo() {
  const { phase } = useStoryPhases(PHASES);
  const visible = Math.min(phase, LINES.length);

  return (
    <CanvasSplit>
      <CanvasSplitThread>
        {MESSAGES.map((message) => (
          <CanvasSplitMessage key={message.id} speaker={message.speaker}>
            {message.text}
          </CanvasSplitMessage>
        ))}
      </CanvasSplitThread>
      <CanvasSplitDocument>
        <CanvasSplitHeader
          title="migration-0.14.md"
          version={3}
          saved={visible >= LINES.length}
          onCopy={() => undefined}
          onClose={() => undefined}
        />
        <CanvasSplitBody writing={visible < LINES.length}>
          {LINES.slice(0, visible).map((line) => (
            <CanvasSplitLine
              key={line.text}
              {...(line.heading ? { heading: true } : {})}
            >
              {line.text}
            </CanvasSplitLine>
          ))}
        </CanvasSplitBody>
      </CanvasSplitDocument>
    </CanvasSplit>
  );
}
