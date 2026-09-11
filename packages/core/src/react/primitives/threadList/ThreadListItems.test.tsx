/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ThreadListItemState } from "../../../store/scopes/thread-list-item";

const mocks = vi.hoisted(() => ({
  threadItems: [] as ThreadListItemState[],
  archivedThreadItems: [] as ThreadListItemState[],
  aui: {
    threads: {
      item: ({ index, archived }: { index: number; archived?: boolean }) => ({
        getState: () =>
          archived
            ? mocks.archivedThreadItems[index]
            : mocks.threadItems[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threads: {
        threadIds: mocks.threadItems.map((item) => item.id),
        archivedThreadIds: mocks.archivedThreadItems.map((item) => item.id),
      },
    }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => ThreadListItemState;
    children: (getItem: () => ThreadListItemState) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock(
  "../../providers/ThreadListItemByIndexProvider",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../providers/ThreadListItemByIndexProvider")
    >()),
    ThreadListItemByIndexProvider: ({ children }: { children: ReactNode }) =>
      children,
  }),
);

import { ThreadListPrimitiveItems } from "./ThreadListItems";

const threadItem = (id: string, title: string): ThreadListItemState => ({
  id,
  remoteId: id,
  externalId: undefined,
  title,
  status: "regular",
  isRunning: false,
});

const StatefulThreadItem = ({
  threadListItem,
}: {
  threadListItem: ThreadListItemState;
}) => {
  const [initialTitle] = useState(threadListItem.title);
  return <span>{initialTitle}</span>;
};

describe("ThreadListPrimitiveItems", () => {
  it("does not reuse component state for a different thread", () => {
    mocks.threadItems = [
      threadItem("first", "First thread"),
      threadItem("second", "Second thread"),
    ];

    const view = render(
      <ThreadListPrimitiveItems>
        {({ threadListItem }) => (
          <StatefulThreadItem threadListItem={threadListItem} />
        )}
      </ThreadListPrimitiveItems>,
    );

    mocks.threadItems = [mocks.threadItems[1]!];
    view.rerender(
      <ThreadListPrimitiveItems>
        {({ threadListItem }) => (
          <StatefulThreadItem threadListItem={threadListItem} />
        )}
      </ThreadListPrimitiveItems>,
    );

    expect(screen.queryByText("Second thread")).not.toBeNull();
    expect(screen.queryByText("First thread")).toBeNull();
  });
});
