"use client";

import {
  CanvasSplit,
  CanvasSplitBody,
  CanvasSplitDocument,
  CanvasSplitHeader,
  CanvasSplitLine,
  CanvasSplitMessage,
  CanvasSplitThread,
} from "@/components/assistant-ui/elements/canvas-split";
import { defineStates } from "./types";

const noop = () => {};

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

function Thread({ reply }: { reply: string }) {
  return (
    <CanvasSplitThread>
      <CanvasSplitMessage speaker="user">
        Draft the migration note for 0.14
      </CanvasSplitMessage>
      <CanvasSplitMessage speaker="assistant">{reply}</CanvasSplitMessage>
    </CanvasSplitThread>
  );
}

function Lines({
  lines,
}: {
  lines: readonly { text: string; heading?: boolean }[];
}) {
  return lines.map((line) => (
    <CanvasSplitLine
      key={line.text}
      {...(line.heading ? { heading: true } : {})}
    >
      {line.text}
    </CanvasSplitLine>
  ));
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty canvas",
    note: "The canvas has opened but nothing is written yet.",
    Component: () => (
      <CanvasSplit>
        <Thread reply="Opening it in the canvas." />
        <CanvasSplitDocument>
          <CanvasSplitHeader
            title="migration-0.14.md"
            version={1}
            saved={false}
            onCopy={noop}
            onClose={noop}
          />
          <CanvasSplitBody writing />
        </CanvasSplitDocument>
      </CanvasSplit>
    ),
  },
  {
    key: "streaming",
    label: "Writing",
    note: "The document is partway written and still unsaved.",
    Component: () => (
      <CanvasSplit>
        <Thread reply="Opened it in the canvas. Editing now." />
        <CanvasSplitDocument>
          <CanvasSplitHeader
            title="migration-0.14.md"
            version={3}
            saved={false}
            onCopy={noop}
            onClose={noop}
          />
          <CanvasSplitBody writing>
            <Lines lines={LINES.slice(0, 2)} />
          </CanvasSplitBody>
        </CanvasSplitDocument>
      </CanvasSplit>
    ),
  },
  {
    key: "success",
    label: "Saved",
    note: "Writing finished and the version is saved.",
    Component: () => (
      <CanvasSplit>
        <Thread reply="Done. The note is saved as version 3." />
        <CanvasSplitDocument>
          <CanvasSplitHeader
            title="migration-0.14.md"
            version={3}
            saved
            onCopy={noop}
            onClose={noop}
          />
          <CanvasSplitBody>
            <Lines lines={LINES} />
          </CanvasSplitBody>
        </CanvasSplitDocument>
      </CanvasSplit>
    ),
  },
  {
    key: "disabled",
    label: "No actions",
    note: "Without copy or close handlers both header buttons are disabled.",
    Component: () => (
      <CanvasSplit>
        <Thread reply="Done. The note is saved as version 3." />
        <CanvasSplitDocument>
          <CanvasSplitHeader title="migration-0.14.md" version={3} saved />
          <CanvasSplitBody>
            <Lines lines={LINES} />
          </CanvasSplitBody>
        </CanvasSplitDocument>
      </CanvasSplit>
    ),
  },
  {
    key: "long-content",
    label: "Long document",
    note: "A long title truncates and a long body scrolls inside the canvas.",
    Component: () => (
      <CanvasSplit>
        <Thread reply="Opened it in the canvas with the full upgrade guide." />
        <CanvasSplitDocument>
          <CanvasSplitHeader
            title="migration-0.14-composer-drafts-and-remote-thread-list-upgrade-guide.md"
            version={12}
            saved
            onCopy={noop}
            onClose={noop}
          />
          <CanvasSplitBody>
            <Lines
              lines={[
                ...LINES,
                { text: "Remote thread lists", heading: true },
                {
                  text: "`RemoteThreadListAdapter.list` now returns a cursor. Pass it back to load the next page.",
                },
                {
                  text: "Archived threads are excluded by default. Set `includeArchived: true` to keep the old behavior.",
                },
                { text: "Attachments", heading: true },
                {
                  text: "`SimpleImageAttachmentAdapter` moved to `@assistant-ui/react/attachments`. Update the import path.",
                },
                {
                  text: "Uploads larger than 20 MB are rejected before the request starts, with a typed error you can show in the composer.",
                },
              ]}
            />
          </CanvasSplitBody>
        </CanvasSplitDocument>
      </CanvasSplit>
    ),
  },
]);
