import {
  StreamingText,
  type Segment,
} from "@assistant-ui/ui/components/assistant-ui/elements/streaming-text.tsx";
import { defineSections } from "../types";

const SEGMENTS: Segment[] = [
  { text: "Here is what changed in the latest release: the composer now" },
  { text: "restores drafts per thread, tool calls stream partial arguments" },
  { text: "through" },
  { text: "useAuiState", mono: true },
  { text: "selectors, and reasoning traces collapse on their own the moment" },
  { text: "a reply starts streaming." },
];

const WORDS = SEGMENTS.map((s) => s.text)
  .join(" ")
  .split(" ").length;

export default defineSections([
  {
    id: "streaming-text",
    title: "Streaming text",
    category: "chat",
    notes: "streaming-text.tsx: mid-stream (with caret), then complete.",
    render: () => (
      <div className="flex flex-col gap-4">
        <StreamingText segments={SEGMENTS} count={17} streaming />
        <StreamingText segments={SEGMENTS} count={WORDS} streaming={false} />
      </div>
    ),
  },
]);
