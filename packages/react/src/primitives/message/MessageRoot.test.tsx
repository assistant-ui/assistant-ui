// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChatModelAdapter,
  ThreadMessageLike,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  ThreadListItemRuntimeProvider,
  useExternalStoreRuntime,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import {
  ThreadPrimitiveMessageByIndex,
  ThreadPrimitiveMessages,
} from "../thread/ThreadMessages";
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

const initialMessages: readonly ThreadMessageLike[] = [
  { role: "user", content: "Hydrated message" },
];

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

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
          <ThreadPrimitiveViewport scrollToBottomOnInitialize={false}>
            <ThreadPrimitiveMessageByIndex index={0} components={{ Message }} />
          </ThreadPrimitiveViewport>
        </ThreadPrimitiveRoot>
      </VisibilityContext.Provider>
    </AssistantRuntimeProvider>
  );
};

const HydrationMessage = () => (
  <MessagePrimitiveRoot data-testid="hydration-message" />
);

const LocalThread = ({
  onRuntime,
  turnAnchor,
}: {
  onRuntime: (runtime: ReturnType<typeof useLocalRuntime>) => void;
  turnAnchor: "bottom" | "top";
}) => {
  const runtime = useLocalRuntime(chatModel, { initialMessages });
  onRuntime(runtime);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitiveRoot>
        <ThreadPrimitiveViewport
          scrollToBottomOnInitialize={false}
          turnAnchor={turnAnchor}
        >
          <ThreadPrimitiveMessages components={{ Message: HydrationMessage }} />
        </ThreadPrimitiveViewport>
      </ThreadPrimitiveRoot>
    </AssistantRuntimeProvider>
  );
};

const NestedLocalRuntime = ({
  onRuntime,
  turnAnchor,
}: {
  onRuntime: (runtime: ReturnType<typeof useLocalRuntime>) => void;
  turnAnchor: "bottom" | "top";
}) => {
  const host = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={host}>
      <ThreadListItemRuntimeProvider runtime={host.threads.mainItem}>
        <LocalThread onRuntime={onRuntime} turnAnchor={turnAnchor} />
      </ThreadListItemRuntimeProvider>
    </AssistantRuntimeProvider>
  );
};

const renderOnServer = (node: ReactNode) => {
  vi.stubGlobal("document", undefined);
  try {
    return renderToString(node);
  } finally {
    vi.unstubAllGlobals();
  }
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
  it.each(["bottom", "top"] as const)(
    "hydrates nested local message ids with %s anchoring",
    async (turnAnchor) => {
      let serverRuntime: ReturnType<typeof useLocalRuntime> | undefined;
      const html = renderOnServer(
        <NestedLocalRuntime
          onRuntime={(runtime) => (serverRuntime = runtime)}
          turnAnchor={turnAnchor}
        />,
      );
      const serverMessageId = serverRuntime!.thread.getState().messages[0]!.id;
      const container = document.createElement("div");
      container.innerHTML = html;
      vi.stubGlobal("ResizeObserver", TestResizeObserver);

      let clientRuntime: ReturnType<typeof useLocalRuntime> | undefined;
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(
          container,
          <NestedLocalRuntime
            onRuntime={(runtime) => (clientRuntime = runtime)}
            turnAnchor={turnAnchor}
          />,
        );
      });

      const clientMessageId = clientRuntime!.thread.getState().messages[0]!.id;
      const domMessageId = container
        .querySelector("[data-testid='hydration-message']")!
        .getAttribute("data-message-id");

      expect(clientMessageId).toBe(serverMessageId);
      expect(domMessageId).toBe(clientMessageId);
      expect(
        errors.mock.calls.some((args) =>
          args.some((value) => String(value).includes("data-message-id")),
        ),
      ).toBe(false);

      await act(async () => root?.unmount());
    },
  );

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
