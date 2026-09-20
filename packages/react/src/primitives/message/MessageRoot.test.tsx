// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { createContext, useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { ThreadPrimitiveMessageByIndex } from "../thread/ThreadMessages";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { ThreadPrimitiveViewport } from "../thread/ThreadViewport";
import { MessagePrimitiveRoot } from "./MessageRoot";

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

const VisibilityContext = createContext(true);

const Message = () => {
  const visible = useContext(VisibilityContext);
  const isHovering = useAuiState((s) => s.message.isHovering);

  return (
    <>
      {visible ? <MessagePrimitiveRoot /> : null}
      <span data-testid="hover-state" data-hovering={isHovering} />
    </>
  );
};

const Example = ({ visible = true }: { visible?: boolean }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VisibilityContext.Provider value={visible}>
        <ThreadPrimitiveRoot>
          <ThreadPrimitiveViewport>
            <ThreadPrimitiveMessageByIndex index={0} components={{ Message }} />
          </ThreadPrimitiveViewport>
        </ThreadPrimitiveRoot>
      </VisibilityContext.Provider>
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

const mockHoveredElement = () => {
  const matches = HTMLElement.prototype.matches;
  vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function (
    this: HTMLElement,
    selector,
  ) {
    return selector === ":hover" || matches.call(this, selector);
  });
};

describe("MessagePrimitiveRoot", () => {
  it("synchronizes hover state while mounted", async () => {
    mockHoveredElement();

    const view = render(<Example />);
    await act(() => Promise.resolve());

    expect(view.getByTestId("hover-state").getAttribute("data-hovering")).toBe(
      "true",
    );
    view.unmount();
  });

  it("does not restore hover state after unmount", async () => {
    mockHoveredElement();

    const view = render(<Example />);
    view.rerender(<Example visible={false} />);
    await act(() => Promise.resolve());

    expect(view.getByTestId("hover-state").getAttribute("data-hovering")).toBe(
      "false",
    );
  });
});
