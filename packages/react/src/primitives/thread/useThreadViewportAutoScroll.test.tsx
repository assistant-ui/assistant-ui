// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useEffect, useState, type FC, type PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../context";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";
import * as MessagePrimitive from "../message";
import { ThreadPrimitiveMessages } from "./ThreadMessages";
import { ThreadPrimitiveRoot } from "./ThreadRoot";
import { ThreadPrimitiveScrollToBottom } from "./ThreadScrollToBottom";
import { ThreadPrimitiveViewport } from "./ThreadViewport";
import {
  ExportedMessageRepository,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessageLike,
} from "../../index";

const adapter: ChatModelAdapter = {
  async *run() {},
};

const messages: ThreadMessageLike[] = Array.from({ length: 8 }, (_, index) => ({
  role: index % 2 === 0 ? "user" : "assistant",
  content: [{ type: "text", text: `Message ${index + 1}` }],
}));

const getViewport = () => screen.getByTestId("viewport");

const getMaxScrollTop = (element: Element) =>
  Math.max(0, element.scrollHeight - element.clientHeight);

let forceShortViewportMeasurement = false;
let viewportMeasurementOffset = 0;
const resizeObserverCallbacks = new Set<ResizeObserverCallback>();

class TestResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverCallbacks.add(callback);
  }

  observe() {}
  disconnect() {
    resizeObserverCallbacks.delete(this.callback);
  }
}

const notifyResizeObservers = () => {
  for (const callback of resizeObserverCallbacks) {
    callback([], {} as ResizeObserver);
  }
};

const descriptors = {
  scrollTop: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollTop",
  ),
  scrollHeight: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight",
  ),
  clientHeight: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight",
  ),
  scrollTo: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo"),
};

const scrollTopByElement = new WeakMap<Element, number>();

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );

  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get() {
      return scrollTopByElement.get(this) ?? 0;
    },
    set(value: number) {
      scrollTopByElement.set(this, value);
    },
  });

  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return this.getAttribute("data-testid") === "viewport" ? 100 : 0;
    },
  });

  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      if (this.getAttribute("data-testid") !== "viewport") return 0;
      if (forceShortViewportMeasurement) return this.clientHeight;
      return (
        document.querySelectorAll('[data-testid="thread-message"]').length *
          80 +
        viewportMeasurementOffset
      );
    },
  });

  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value({ top = 0 }: ScrollToOptions) {
      this.scrollTop = Math.min(Number(top), getMaxScrollTop(this));
      this.dispatchEvent(new Event("scroll"));
    },
  });
});

afterEach(() => {
  forceShortViewportMeasurement = false;
  viewportMeasurementOffset = 0;
  resizeObserverCallbacks.clear();
  cleanup();
});

afterAll(() => {
  vi.unstubAllGlobals();

  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
  }
});

const Message: FC = () => (
  <MessagePrimitive.Root data-testid="thread-message">
    <MessagePrimitive.Content />
  </MessagePrimitive.Root>
);

const AtBottom: FC = () => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);
  return <output data-testid="is-at-bottom">{String(isAtBottom)}</output>;
};

const Thread = ({
  autoScroll,
  scrollToBottomOnInitialize,
}: {
  autoScroll?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
}) => (
  <ThreadPrimitiveRoot>
    <ThreadPrimitiveViewport
      autoScroll={autoScroll}
      data-testid="viewport"
      turnAnchor="top"
      scrollToBottomOnInitialize={scrollToBottomOnInitialize}
    >
      <ThreadPrimitiveMessages components={{ Message }} />
      <AtBottom />
      {/* The canonical Thread renders its composer inside the viewport, so
          composer keystrokes bubble to the viewport's keydown listener. */}
      <textarea data-testid="composer" />
      {/* An input that activates on a key, and a `contenteditable="false"`
          element in message content, both act on content rather than accept
          text. Neither is a text-entry surface. */}
      <input type="checkbox" data-testid="checkbox" />
      <span contentEditable={false} data-testid="readonly-island" tabIndex={0}>
        tool call
      </span>
    </ThreadPrimitiveViewport>
  </ThreadPrimitiveRoot>
);

const BottomAnchorThread = () => (
  <ThreadPrimitiveRoot>
    <ThreadPrimitiveViewport data-testid="viewport">
      <ThreadPrimitiveMessages components={{ Message }} />
      <AtBottom />
    </ThreadPrimitiveViewport>
  </ThreadPrimitiveRoot>
);

const RunState = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return <output data-testid="run-state">{String(isRunning)}</output>;
};

const SyncRuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const runtime = useLocalRuntime(adapter, { initialMessages: messages });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const AsyncRuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const history: ThreadHistoryAdapter = {
    async load() {
      await Promise.resolve();
      return ExportedMessageRepository.fromArray(messages);
    },
    async append() {},
  };
  const runtime = useLocalRuntime(adapter, { adapters: { history } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const DelayedThread = ({
  autoScroll,
  scrollToBottomOnInitialize,
}: {
  autoScroll?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
}) => {
  const [showThread, setShowThread] = useState(false);

  useEffect(() => {
    setShowThread(true);
  }, []);

  if (!showThread) return null;
  return (
    <Thread
      autoScroll={autoScroll}
      scrollToBottomOnInitialize={scrollToBottomOnInitialize}
    />
  );
};

describe("useThreadViewportAutoScroll", () => {
  it("preserves smooth scrolling from a control outside the viewport", async () => {
    render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
        <ThreadPrimitiveScrollToBottom behavior="smooth">
          Scroll to bottom
        </ThreadPrimitiveScrollToBottom>
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    act(() => {
      viewport.dispatchEvent(new Event("scroll"));
    });
    const button = screen.getByRole("button", { name: "Scroll to bottom" });
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));

    const scrollToSpy = vi.spyOn(viewport, "scrollTo");
    try {
      fireEvent.click(button);
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    } finally {
      scrollToSpy.mockRestore();
    }
  });

  it("scrolls sync initialMessages to the bottom when the viewport mounts after initialization", async () => {
    render(
      <SyncRuntimeProvider>
        <DelayedThread />
      </SyncRuntimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
      expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
    });
  });

  it("keeps async history initialization scroll pending until imported messages are measurable", async () => {
    forceShortViewportMeasurement = true;

    render(
      <AsyncRuntimeProvider>
        <Thread />
      </AsyncRuntimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getViewport().scrollTop).toBe(0);

    forceShortViewportMeasurement = false;
    notifyResizeObservers();

    await waitFor(() => {
      expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
    });
  });

  it("preserves run-start's auto behavior on the first message of an empty thread", async () => {
    const scrollToSpy = vi.spyOn(HTMLElement.prototype, "scrollTo");

    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const Harness: FC = () => {
      runtime = useLocalRuntime(adapter);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <BottomAnchorThread />
        </AssistantRuntimeProvider>
      );
    };

    render(<Harness />);

    expect(screen.queryAllByTestId("thread-message")).toHaveLength(0);

    await act(async () => {
      runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
    });

    const behaviors = scrollToSpy.mock.calls.map(
      (call) => (call[0] as ScrollToOptions).behavior,
    );
    expect(behaviors[0]).toBe("auto");
    expect(behaviors).not.toContain("instant");

    scrollToSpy.mockRestore();
  });

  it("keeps following after a content-growth burst undershoots the bottom", async () => {
    render(
      <SyncRuntimeProvider>
        <BottomAnchorThread />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    const scrollTopBeforeBurst = viewport.scrollTop;
    viewportMeasurementOffset += 164;
    act(() => {
      viewport.scrollTop = scrollTopBeforeBurst + 106;
      viewport.dispatchEvent(new Event("scroll"));
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));

    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
  });

  it("keeps following after a pointerdown that does not scroll the viewport", async () => {
    render(
      <SyncRuntimeProvider>
        <BottomAnchorThread />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    act(() => {
      viewport.dispatchEvent(new Event("pointerdown"));
    });
    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
  });

  it.each([
    { label: "pointerdown", make: () => new Event("pointerdown") },
    {
      label: "keydown",
      make: () => new KeyboardEvent("keydown", { key: "Enter" }),
    },
  ])(
    "drops pending bottom-scroll intent after a $label in a thread that cannot scroll",
    async ({ make }) => {
      // the viewport never overflows, so handleScroll keeps the intent alive
      forceShortViewportMeasurement = true;

      render(
        <AsyncRuntimeProvider>
          <Thread />
        </AsyncRuntimeProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByTestId("thread-message")).toHaveLength(
          messages.length,
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getViewport().scrollTop).toBe(0);

      // the user activates something in the thread, e.g. a collapsible tool call
      act(() => {
        getViewport().dispatchEvent(make());
      });

      // that activation grows the content
      forceShortViewportMeasurement = false;
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(0);
    },
  );

  it.each([
    { label: "pointerdown", make: () => new Event("pointerdown") },
    {
      label: "keydown",
      make: () => new KeyboardEvent("keydown", { key: "Enter" }),
    },
  ])(
    "cancels the frame a pending bottom scroll queued when a $label arrives first",
    async ({ make }) => {
      let nextFrameId = 0;
      let pendingFrame: {
        id: number;
        callback: FrameRequestCallback;
      } | null = null;
      const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
      const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          const id = ++nextFrameId;
          pendingFrame = { id, callback };
          return id;
        },
      );
      vi.stubGlobal(
        "cancelAnimationFrame",
        vi.fn((id: number) => {
          if (pendingFrame?.id === id) pendingFrame = null;
        }),
      );

      try {
        render(
          <SyncRuntimeProvider>
            <BottomAnchorThread />
          </SyncRuntimeProvider>,
        );

        const viewport = getViewport();
        await waitFor(() => {
          expect(screen.getAllByTestId("thread-message")).toHaveLength(
            messages.length,
          );
          expect(pendingFrame).not.toBeNull();
        });

        // the gesture lands before the queued frame runs
        act(() => {
          viewport.dispatchEvent(make());
        });

        // clearing the ref alone would leave this frame to re-plant the intent
        expect(pendingFrame).toBeNull();
      } finally {
        vi.stubGlobal("requestAnimationFrame", originalRequestAnimationFrame);
        vi.stubGlobal("cancelAnimationFrame", originalCancelAnimationFrame);
      }
    },
  );

  it.each([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
    "NumLock",
    "ScrollLock",
    "AltGraph",
  ])(
    "keeps pending bottom-scroll intent through a bare %s press",
    async (key) => {
      forceShortViewportMeasurement = true;

      render(
        <AsyncRuntimeProvider>
          <Thread />
        </AsyncRuntimeProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByTestId("thread-message")).toHaveLength(
          messages.length,
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // holding a modifier is not an interaction with the thread
      act(() => {
        getViewport().dispatchEvent(new KeyboardEvent("keydown", { key }));
      });

      forceShortViewportMeasurement = false;
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
    },
  );

  it("keeps pending bottom-scroll intent while the user types in the composer", async () => {
    forceShortViewportMeasurement = true;

    render(
      <AsyncRuntimeProvider>
        <Thread />
      </AsyncRuntimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      screen
        .getByTestId("composer")
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true }),
        );
    });

    forceShortViewportMeasurement = false;
    act(notifyResizeObservers);

    expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
  });

  it.each([
    { label: "a checkbox", testid: "checkbox" },
    { label: "a non-editable element", testid: "readonly-island" },
  ])(
    "drops pending bottom-scroll intent when a key activates $label",
    async ({ testid }) => {
      forceShortViewportMeasurement = true;

      render(
        <AsyncRuntimeProvider>
          <Thread />
        </AsyncRuntimeProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByTestId("thread-message")).toHaveLength(
          messages.length,
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      act(() => {
        screen
          .getByTestId(testid)
          .dispatchEvent(
            new KeyboardEvent("keydown", { key: " ", bubbles: true }),
          );
      });

      forceShortViewportMeasurement = false;
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(0);
    },
  );

  it("cancels a queued bottom scroll when the user scrolls up", async () => {
    let nextFrameId = 0;
    let pendingFrame: {
      id: number;
      callback: FrameRequestCallback;
    } | null = null;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      pendingFrame = { id, callback };
      return id;
    });
    const cancelAnimationFrame = vi.fn((id: number) => {
      if (pendingFrame?.id === id) pendingFrame = null;
    });
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    try {
      render(
        <SyncRuntimeProvider>
          <BottomAnchorThread />
        </SyncRuntimeProvider>,
      );

      const viewport = getViewport();
      await waitFor(() => {
        expect(screen.getAllByTestId("thread-message")).toHaveLength(
          messages.length,
        );
        expect(pendingFrame).not.toBeNull();
      });

      let scrollTopAfterLeave = 0;
      act(() => {
        viewport.scrollTop = getMaxScrollTop(viewport);
        viewport.dispatchEvent(new Event("scroll"));
        viewport.scrollTop -= 80;
        scrollTopAfterLeave = viewport.scrollTop;
        viewport.dispatchEvent(new Event("scroll"));
      });

      const frame = pendingFrame as {
        id: number;
        callback: FrameRequestCallback;
      } | null;
      if (frame) {
        act(() => {
          frame.callback(performance.now());
        });
      }

      expect(viewport.scrollTop).toBe(scrollTopAfterLeave);
      expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
      expect(cancelAnimationFrame).toHaveBeenCalledWith(expect.any(Number));
    } finally {
      vi.stubGlobal("requestAnimationFrame", originalRequestAnimationFrame);
      vi.stubGlobal("cancelAnimationFrame", originalCancelAnimationFrame);
    }
  });

  it("does not resume bottom follow after a stable-height user scroll-up", async () => {
    render(
      <SyncRuntimeProvider>
        <BottomAnchorThread />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    act(() => {
      viewport.scrollTop = viewport.scrollTop - 80;
      viewport.dispatchEvent(new Event("scroll"));
    });

    const scrollTopAfterLeave = viewport.scrollTop;
    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(scrollTopAfterLeave);
    expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
  });

  it("starts following when auto-scroll is enabled at the bottom", async () => {
    const view = render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    act(() => {
      viewport.scrollTop = getMaxScrollTop(viewport);
      viewport.dispatchEvent(new Event("scroll"));
    });

    view.rerender(
      <SyncRuntimeProvider>
        <Thread autoScroll scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );

    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
  });

  it("preserves bottom follow on initial mount when initialize scrolling is disabled", async () => {
    render(
      <SyncRuntimeProvider>
        <ThreadPrimitiveRoot>
          <ThreadPrimitiveViewport
            autoScroll
            data-testid="viewport"
            scrollToBottomOnInitialize={false}
            turnAnchor="top"
          >
            {messages.map((_, index) => (
              <div key={index} data-testid="thread-message" />
            ))}
          </ThreadPrimitiveViewport>
        </ThreadPrimitiveRoot>
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
  });

  it("does not jump down when auto-scroll is enabled away from the bottom", async () => {
    const view = render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    act(() => {
      viewport.scrollTop = getMaxScrollTop(viewport) - 80;
      viewport.dispatchEvent(new Event("scroll"));
    });
    const scrollTopBeforeEnable = viewport.scrollTop;

    view.rerender(
      <SyncRuntimeProvider>
        <Thread autoScroll scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );

    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);

    expect(viewport.scrollTop).toBe(scrollTopBeforeEnable);
    expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));
  });

  it("defers auto-scroll to an active top anchor only while the run is active", async () => {
    let releaseRun!: () => void;
    const runGate = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    const deferredAdapter: ChatModelAdapter = {
      async *run() {
        await runGate;
        yield { content: [{ type: "text", text: "done" }] };
      },
    };
    const scrollToSpy = vi.spyOn(HTMLElement.prototype, "scrollTo");

    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const Harness: FC = () => {
      runtime = useLocalRuntime(deferredAdapter, { initialMessages: messages });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread autoScroll scrollToBottomOnInitialize={false} />
          <RunState />
        </AssistantRuntimeProvider>
      );
    };

    render(<Harness />);

    act(() => {
      void runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => {
      expect(
        document.querySelector("[data-aui-top-anchor-user]"),
      ).not.toBeNull();
    });

    scrollToSpy.mockClear();
    viewportMeasurementOffset = 1;
    act(notifyResizeObservers);

    expect(
      scrollToSpy.mock.calls.map(
        (call) => (call[0] as ScrollToOptions).behavior,
      ),
    ).not.toContain("instant");

    await act(async () => {
      releaseRun();
    });
    await waitFor(() => {
      expect(screen.getByTestId("run-state").textContent).toBe("false");
    });
    expect(document.querySelector("[data-aui-top-anchor-user]")).not.toBeNull();

    const viewport = getViewport();
    act(() => {
      viewport.scrollTop = getMaxScrollTop(viewport);
      viewport.dispatchEvent(new Event("scroll"));
    });
    scrollToSpy.mockClear();
    viewportMeasurementOffset = 2;
    act(notifyResizeObservers);

    expect(
      scrollToSpy.mock.calls.map(
        (call) => (call[0] as ScrollToOptions).behavior,
      ),
    ).toContain("instant");

    scrollToSpy.mockRestore();
  });

  it("does not scroll initial messages when initialize scrolling is disabled", async () => {
    render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    expect(getViewport().scrollTop).toBe(0);
    viewportMeasurementOffset += 200;
    act(notifyResizeObservers);
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
  });
});
