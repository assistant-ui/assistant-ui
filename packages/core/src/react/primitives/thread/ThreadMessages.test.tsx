/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MessageState } from "../../../store";

const mocks = vi.hoisted(() => ({
  messages: [] as MessageState[],
  aui: {
    thread: {
      message: ({ index }: { index: number }) => ({
        getState: () => mocks.messages[index],
      }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ thread: { messages: mocks.messages } }),
  RenderChildrenWithAccessor: ({
    getItemState,
    children,
  }: {
    getItemState: (aui: typeof mocks.aui) => MessageState;
    children: (getItem: () => MessageState) => ReactNode;
  }) => children(() => getItemState(mocks.aui)),
}));

vi.mock("../../providers/MessageByIndexProvider", () => ({
  MessageByIndexProvider: ({ children }: { children: ReactNode }) => children,
}));

import { ThreadPrimitiveMessages } from "./ThreadMessages";

const message = (id: string): MessageState =>
  ({
    id,
    createdAt: new Date(),
    role: "user",
    content: [],
    attachments: [],
    metadata: { custom: {} },
  }) as unknown as MessageState;

const StatefulMessage = ({ message }: { message: MessageState }) => {
  const [initialId] = useState(message.id);
  return <span>{initialId}</span>;
};

describe("ThreadPrimitiveMessages", () => {
  it("does not reuse component state for a different message", () => {
    mocks.messages = [message("first-message"), message("second-message")];

    const view = render(
      <ThreadPrimitiveMessages>
        {({ message }) => <StatefulMessage message={message} />}
      </ThreadPrimitiveMessages>,
    );

    mocks.messages = [mocks.messages[1]!];
    view.rerender(
      <ThreadPrimitiveMessages>
        {({ message }) => <StatefulMessage message={message} />}
      </ThreadPrimitiveMessages>,
    );

    expect(screen.queryByText("second-message")).not.toBeNull();
    expect(screen.queryByText("first-message")).toBeNull();
  });
});
