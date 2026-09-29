/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { QueueItemState } from "../../../runtime/queue/queue-item";

const mocks = vi.hoisted(() => ({
  queue: [] as QueueItemState[],
  aui: {
    composer: {
      queueItem: ({ index }: { index: number }) => ({
        getState: () => mocks.queue[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ composer: { queue: mocks.queue } }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => QueueItemState;
    children: (getItem: () => QueueItemState) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock("../../providers/QueueItemByIndexProvider", () => ({
  QueueItemByIndexProvider: ({ children }: { children: ReactNode }) => children,
}));

import { ComposerPrimitiveQueue } from "./ComposerQueue";

const queueItem = (id: string, prompt: string): QueueItemState => ({
  id,
  prompt,
  parts: [{ type: "text", text: prompt }],
});

const StatefulQueueItem = ({ queueItem }: { queueItem: QueueItemState }) => {
  const [initialPrompt] = useState(queueItem.prompt);
  return <span>{initialPrompt}</span>;
};

describe("ComposerPrimitiveQueue", () => {
  it("does not reuse component state for a different queue item", () => {
    mocks.queue = [
      queueItem("first", "first message"),
      queueItem("second", "second message"),
    ];

    const view = render(
      <ComposerPrimitiveQueue>
        {({ queueItem }) => <StatefulQueueItem queueItem={queueItem} />}
      </ComposerPrimitiveQueue>,
    );

    mocks.queue = [mocks.queue[1]!];
    view.rerender(
      <ComposerPrimitiveQueue>
        {({ queueItem }) => <StatefulQueueItem queueItem={queueItem} />}
      </ComposerPrimitiveQueue>,
    );

    expect(screen.queryByText("second message")).not.toBeNull();
    expect(screen.queryByText("first message")).toBeNull();
  });
});
