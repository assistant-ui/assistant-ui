// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { ThreadPrimitiveMessageByIndex } from "../thread/ThreadMessages";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { ThreadPrimitiveViewport } from "../thread/ThreadViewport";
import { MessagePrimitiveRoot } from "./MessageRoot";

type MessageClient = ReturnType<typeof useAui>["message"];

const messages: ThreadMessageLike[] = [
  {
    id: "message-1",
    role: "assistant",
    content: [{ type: "text", text: "Hello" }],
  },
];

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const Example = ({ capture }: { capture: (client: MessageClient) => void }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const Message = () => {
    capture(useAui().message);
    return <MessagePrimitiveRoot />;
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitiveRoot>
        <ThreadPrimitiveViewport>
          <ThreadPrimitiveMessageByIndex index={0} components={{ Message }} />
        </ThreadPrimitiveViewport>
      </ThreadPrimitiveRoot>
    </AssistantRuntimeProvider>
  );
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MessagePrimitiveRoot", () => {
  it("synchronizes hover state while mounted", async () => {
    vi.spyOn(HTMLElement.prototype, "matches").mockReturnValue(true);
    let message: MessageClient | undefined;

    const view = render(<Example capture={(client) => (message = client)} />);
    await act(() => Promise.resolve());

    expect(message?.getState().isHovering).toBe(true);
    view.unmount();
  });

  it("does not restore hover state after unmount", async () => {
    vi.spyOn(HTMLElement.prototype, "matches").mockReturnValue(true);
    let message: MessageClient | undefined;

    const view = render(<Example capture={(client) => (message = client)} />);
    view.unmount();
    await act(() => Promise.resolve());

    expect(message?.getState().isHovering).toBe(false);
  });
});
