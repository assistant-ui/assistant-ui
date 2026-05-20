// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../../context";
import * as MessagePrimitive from "../message";
import * as ThreadPrimitive from "../thread";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter, ThreadMessageLike } from "../../index";

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const initialMessages: ThreadMessageLike[] = [
  {
    role: "user",
    content: [{ type: "text", text: "hello" }],
  },
  {
    role: "assistant",
    content: [{ type: "text", text: "world" }],
  },
];

const RuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const Message = () => (
  <MessagePrimitive.Root>
    <div style={{ minHeight: 120 }}>
      <MessagePrimitive.Content />
    </div>
  </MessagePrimitive.Root>
);

let clientHeightDescriptor: PropertyDescriptor | undefined;
let scrollHeightDescriptor: PropertyDescriptor | undefined;
let scrollToDescriptor: PropertyDescriptor | undefined;
let scrollTo: ReturnType<typeof vi.fn>;

describe("useThreadViewportAutoScroll", () => {
  beforeEach(() => {
    clientHeightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientHeight",
    );
    scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );
    scrollToDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollTo",
    );
    scrollTo = vi.fn();

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "thread-viewport" ? 100 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "thread-viewport" ? 300 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreDescriptor("clientHeight", clientHeightDescriptor);
    restoreDescriptor("scrollHeight", scrollHeightDescriptor);
    restoreDescriptor("scrollTo", scrollToDescriptor);
  });

  it("scrolls to bottom when initial messages are already loaded before the viewport subscribes", async () => {
    render(
      <RuntimeProvider>
        <ThreadPrimitive.Viewport
          data-testid="thread-viewport"
          scrollToBottomOnInitialize
        >
          <ThreadPrimitive.Messages components={{ Message }} />
        </ThreadPrimitive.Viewport>
      </RuntimeProvider>,
    );

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({
        top: 300,
        behavior: "instant",
      });
    });
  });
});

const restoreDescriptor = (
  key: "clientHeight" | "scrollHeight" | "scrollTo",
  descriptor: PropertyDescriptor | undefined,
) => {
  if (descriptor) {
    Object.defineProperty(HTMLElement.prototype, key, descriptor);
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, key);
  }
};
