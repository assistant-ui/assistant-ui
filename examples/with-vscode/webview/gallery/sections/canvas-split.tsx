import {
  CanvasSplit,
  CanvasSplitBody,
  CanvasSplitDocument,
  CanvasSplitHeader,
  CanvasSplitLine,
  CanvasSplitMessage,
  CanvasSplitThread,
} from "@assistant-ui/ui/components/assistant-ui/elements/canvas-split.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

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

function Canvas({ visible }: { visible: number }) {
  return (
    <CanvasSplit>
      <CanvasSplitThread>
        <CanvasSplitMessage speaker="user">
          Draft the migration note for 0.14
        </CanvasSplitMessage>
        <CanvasSplitMessage speaker="assistant">
          Opened it in the canvas. Editing now.
        </CanvasSplitMessage>
      </CanvasSplitThread>
      <CanvasSplitDocument>
        <CanvasSplitHeader
          title="migration-0.14.md"
          version={3}
          saved={visible >= LINES.length}
          onCopy={noop}
          onClose={noop}
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

export default defineSections([
  {
    id: "canvas-split",
    title: "Canvas split",
    category: "agents",
    notes: "Chat beside a document: writing (2 of 4 lines), then saved.",
    render: () => (
      <States>
        <State label="writing">
          <Canvas visible={2} />
        </State>
        <State label="saved">
          <Canvas visible={LINES.length} />
        </State>
      </States>
    ),
  },
]);
