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
import {
  useThreadViewport,
  useThreadViewportStore,
} from "../../context/react/ThreadViewportContext";
import * as MessagePrimitive from "../message";
import { ThreadPrimitiveMessages } from "./ThreadMessages";
import { ThreadPrimitiveRoot } from "./ThreadRoot";
import { ThreadPrimitiveScrollToBottom } from "./ThreadScrollToBottom";
import { ThreadPrimitiveViewport } from "./ThreadViewport";
import {
  ExportedMessageRepository,
  useExternalStoreRuntime,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessageLike,
} from "../../index";
import { ThreadPrimitiveLoadEarlier } from "./ThreadLoadEarlier";

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
const messageHeights = new Map<string, number>();
const resizeObservers = new Set<TestResizeObserver>();

const messageRows = () => [
  ...document.querySelectorAll<HTMLElement>('[data-testid="thread-message"]'),
];

const rowHeight = (row: Element) =>
  messageHeights.get(row.getAttribute("data-message-id") ?? "") ?? 80;

const rowsHeight = (rows: readonly Element[]) =>
  rows.reduce((height, row) => height + rowHeight(row), 0);

class TestResizeObserver {
  readonly targets = new Set<Element>();
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.add(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    resizeObservers.delete(this);
  }
}

const notifyResizeObservers = () => {
  for (const observer of resizeObservers) {
    observer.callback([], {} as ResizeObserver);
  }
};

/** Resizes only `target`, as a child growing without a DOM mutation does. */
const notifyResizeOf = (target: Element) => {
  for (const observer of resizeObservers) {
    if (observer.targets.has(target)) {
      observer.callback([], {} as ResizeObserver);
    }
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
      return rowsHeight(messageRows()) + viewportMeasurementOffset;
    },
  });

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      const rows = messageRows();
      const index = rows.indexOf(this);
      const viewport = this.closest<HTMLElement>('[data-testid="viewport"]');
      const top =
        index === -1
          ? 0
          : rowsHeight(rows.slice(0, index)) - (viewport?.scrollTop ?? 0);
      const height = index === -1 ? 0 : rowHeight(this);
      return {
        x: 0,
        y: top,
        top,
        bottom: top + height,
        left: 0,
        right: 0,
        width: 0,
        height,
        toJSON: () => ({}),
      } satisfies DOMRect;
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
  messageHeights.clear();
  resizeObservers.clear();
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

const RequestSmoothScrollToBottom: FC = () => {
  const threadViewportStore = useThreadViewportStore();

  useEffect(() => {
    threadViewportStore.getState().scrollToBottom({ behavior: "smooth" });
  }, [threadViewportStore]);

  return null;
};

const Thread = ({
  autoScroll,
  scrollToBottomOnInitialize,
  scrollToBottomOnThreadSwitch,
}: {
  autoScroll?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
}) => (
  <ThreadPrimitiveRoot>
    <ThreadPrimitiveViewport
      autoScroll={autoScroll}
      data-testid="viewport"
      turnAnchor="top"
      scrollToBottomOnInitialize={scrollToBottomOnInitialize}
      scrollToBottomOnThreadSwitch={scrollToBottomOnThreadSwitch}
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
  it("keeps viewport listeners and observers across rerenders", () => {
    const view = render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
      </SyncRuntimeProvider>,
    );
    const observe = vi.spyOn(TestResizeObserver.prototype, "observe");
    const disconnect = vi.spyOn(TestResizeObserver.prototype, "disconnect");
    const observeMutations = vi.spyOn(MutationObserver.prototype, "observe");
    const disconnectMutations = vi.spyOn(
      MutationObserver.prototype,
      "disconnect",
    );
    const viewport = getViewport();
    const addListenerSpy = vi.spyOn(viewport, "addEventListener");
    const removeListenerSpy = vi.spyOn(viewport, "removeEventListener");
    try {
      view.rerender(
        <SyncRuntimeProvider>
          <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
        </SyncRuntimeProvider>,
      );

      expect(observe).not.toHaveBeenCalled();
      expect(disconnect).not.toHaveBeenCalled();
      expect(observeMutations).not.toHaveBeenCalled();
      expect(disconnectMutations).not.toHaveBeenCalled();
      expect(addListenerSpy).not.toHaveBeenCalled();
      expect(removeListenerSpy).not.toHaveBeenCalled();

      view.unmount();
      expect(disconnect).toHaveBeenCalled();
      expect(disconnectMutations).toHaveBeenCalled();
      expect(removeListenerSpy).toHaveBeenCalled();
    } finally {
      observe.mockRestore();
      disconnect.mockRestore();
      observeMutations.mockRestore();
      disconnectMutations.mockRestore();
      addListenerSpy.mockRestore();
      removeListenerSpy.mockRestore();
    }
  });

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

  it("updates isAtBottom when a wheel interrupts a smooth scroll short of the bottom", async () => {
    const view = render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
        <ThreadPrimitiveScrollToBottom behavior="smooth">
          Scroll to bottom
        </ThreadPrimitiveScrollToBottom>
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
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
    viewportMeasurementOffset += 200;

    const scrollToSpy = vi
      .spyOn(viewport, "scrollTo")
      .mockImplementation(() => {});
    try {
      view.rerender(
        <SyncRuntimeProvider>
          <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
          <ThreadPrimitiveScrollToBottom behavior="smooth">
            Scroll to bottom
          </ThreadPrimitiveScrollToBottom>
          <RequestSmoothScrollToBottom />
        </SyncRuntimeProvider>,
      );

      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      });

      act(() => {
        viewport.scrollTop += 100;
        viewport.dispatchEvent(new Event("scroll"));
      });
      expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
      expect(
        (
          screen.getByRole("button", {
            name: "Scroll to bottom",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);

      act(() => {
        viewport.dispatchEvent(new WheelEvent("wheel"));
      });

      expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
      expect(
        (
          screen.getByRole("button", {
            name: "Scroll to bottom",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    } finally {
      scrollToSpy.mockRestore();
    }
  });

  it("keeps a coalesced user scroll-up after a programmatic bottom scroll", async () => {
    render(
      <SyncRuntimeProvider>
        <Thread autoScroll={false} scrollToBottomOnInitialize={false} />
        <ThreadPrimitiveScrollToBottom behavior="instant">
          Scroll to bottom
        </ThreadPrimitiveScrollToBottom>
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(screen.getAllByTestId("thread-message")).toHaveLength(
        messages.length,
      );
    });

    act(() => {
      viewport.scrollTop = 0;
      viewport.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Scroll to bottom" })
          .hasAttribute("disabled"),
      ).toBe(false);
    });

    const scrollToDescriptor = Object.getOwnPropertyDescriptor(
      viewport,
      "scrollTo",
    );
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: ({ top = 0 }: ScrollToOptions) => {
        viewport.scrollTop = Math.min(Number(top), getMaxScrollTop(viewport));
      },
    });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Scroll to bottom" }));

      act(() => {
        viewport.scrollTop -= 80;
        viewport.dispatchEvent(new Event("scroll"));
      });

      const scrollTopAfterLeave = viewport.scrollTop;
      viewportMeasurementOffset += 200;
      act(notifyResizeObservers);

      expect(viewport.scrollTop).toBe(scrollTopAfterLeave);
      expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));
      expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
    } finally {
      if (scrollToDescriptor) {
        Object.defineProperty(viewport, "scrollTo", scrollToDescriptor);
      } else {
        Reflect.deleteProperty(viewport, "scrollTo");
      }
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

  it("follows a message that grows without a DOM mutation", async () => {
    render(
      <SyncRuntimeProvider>
        <BottomAnchorThread />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    const lastRow = messageRows().at(-1)!;
    messageHeights.set(lastRow.getAttribute("data-message-id")!, 280);
    act(() => notifyResizeOf(lastRow));

    expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
  });

  it("reports leaving the bottom when a message grows without a DOM mutation", async () => {
    render(
      <SyncRuntimeProvider>
        <Thread />
      </SyncRuntimeProvider>,
    );

    const viewport = getViewport();
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
      expect(screen.getByTestId("is-at-bottom").textContent).toBe("true");
    });

    const lastRow = messageRows().at(-1)!;
    messageHeights.set(lastRow.getAttribute("data-message-id")!, 280);
    act(() => notifyResizeOf(lastRow));

    expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));
    expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
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

  describe("disclosures in a message", () => {
    const renderPinned = async () => {
      render(
        <SyncRuntimeProvider>
          <BottomAnchorThread />
        </SyncRuntimeProvider>,
      );
      const viewport = getViewport();
      await waitFor(() => {
        expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
      });
      return viewport;
    };
    const growContent = () => {
      viewportMeasurementOffset += 200;
      act(notifyResizeObservers);
    };
    const lastMessage = () => screen.getAllByTestId("thread-message").at(-1)!;
    const addTrigger = (
      attributes: Record<string, string>,
      parent: Element = lastMessage(),
    ) => {
      const trigger = document.createElement("button");
      for (const [name, value] of Object.entries(attributes))
        trigger.setAttribute(name, value);
      parent.append(trigger);
      return trigger;
    };
    const click = (target: Element) => {
      act(() => {
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    it("stops following after a click expands a collapsed trigger", async () => {
      const viewport = await renderPinned();
      const scrollTop = viewport.scrollTop;

      click(addTrigger({ "aria-expanded": "false" }));
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
      expect(screen.getByTestId("is-at-bottom").textContent).toBe("false");
    });

    it("stops following after opening a closed details summary", async () => {
      const viewport = await renderPinned();
      const scrollTop = viewport.scrollTop;
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      details.append(summary);
      lastMessage().append(details);

      click(summary);
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
    });

    it("keeps the pause through a resize while the thread still fits", async () => {
      forceShortViewportMeasurement = true;
      const viewport = await renderPinned();

      click(addTrigger({ "aria-expanded": "false" }));
      act(notifyResizeObservers);
      forceShortViewportMeasurement = false;
      growContent();

      expect(viewport.scrollTop).toBe(0);
      expect(getMaxScrollTop(viewport)).toBeGreaterThan(0);
    });

    it("follows again after the reader scrolls back to the bottom", async () => {
      const viewport = await renderPinned();

      click(addTrigger({ "aria-expanded": "false" }));
      growContent();
      act(() => {
        viewport.dispatchEvent(new WheelEvent("wheel"));
        viewport.scrollTop = getMaxScrollTop(viewport);
        viewport.dispatchEvent(new Event("scroll"));
      });
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it.each([
      { label: "an expanded trigger", attributes: { "aria-expanded": "true" } },
      {
        label: "a dialog trigger",
        attributes: { "aria-expanded": "false", "aria-haspopup": "dialog" },
      },
      {
        label: "a menu trigger",
        attributes: { "aria-expanded": "false", "aria-haspopup": "menu" },
      },
      {
        label: "a combobox",
        attributes: { "aria-expanded": "false", role: "combobox" },
      },
      { label: "a plain control", attributes: {} },
    ])("keeps following after clicking $label", async ({ attributes }) => {
      const viewport = await renderPinned();

      click(addTrigger(attributes));
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it("keeps following after a press on a collapsed trigger that never clicks", async () => {
      const viewport = await renderPinned();

      act(() => {
        addTrigger({ "aria-expanded": "false" }).dispatchEvent(
          new Event("pointerdown", { bubbles: true }),
        );
      });
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it("keeps following after expanding a trigger outside the messages", async () => {
      const viewport = await renderPinned();

      click(addTrigger({ "aria-expanded": "false" }, viewport));
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });
    it.each([
      {
        label: "flips its state natively",
        listen: (trigger: HTMLElement) =>
          trigger.addEventListener("click", () =>
            trigger.setAttribute("aria-expanded", "true"),
          ),
      },
      {
        label: "stops the event",
        listen: (trigger: HTMLElement) =>
          trigger.addEventListener("click", (event) => event.stopPropagation()),
      },
    ])("stops following when the trigger $label", async ({ listen }) => {
      const viewport = await renderPinned();
      const scrollTop = viewport.scrollTop;
      const trigger = addTrigger({ "aria-expanded": "false" });
      listen(trigger);

      click(trigger);
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
    });

    it("keeps the pause when a scroll gesture stops short of the bottom and the thread then fits", async () => {
      const viewport = await renderPinned();

      click(addTrigger({ "aria-expanded": "false" }));
      growContent();
      act(() => {
        viewport.dispatchEvent(new WheelEvent("wheel"));
        viewport.scrollTop = getMaxScrollTop(viewport) - 50;
        viewport.dispatchEvent(new Event("scroll"));
      });
      forceShortViewportMeasurement = true;
      act(notifyResizeObservers);
      forceShortViewportMeasurement = false;
      const scrollTop = viewport.scrollTop;
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
    });

    it("treats aria-haspopup=false as a disclosure", async () => {
      const viewport = await renderPinned();
      const scrollTop = viewport.scrollTop;

      click(addTrigger({ "aria-expanded": "false", "aria-haspopup": "false" }));
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
    });

    it("follows again after the reader pages back to the bottom with Space", async () => {
      const viewport = await renderPinned();

      click(addTrigger({ "aria-expanded": "false" }));
      growContent();
      act(() => {
        viewport.dispatchEvent(
          new KeyboardEvent("keydown", { key: " ", bubbles: true }),
        );
        viewport.scrollTop = getMaxScrollTop(viewport);
        viewport.dispatchEvent(new Event("scroll"));
      });
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it("keeps following after a non-activating key on a collapsed trigger", async () => {
      const viewport = await renderPinned();

      act(() => {
        addTrigger({ "aria-expanded": "false" }).dispatchEvent(
          new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
        );
      });
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    const renderWithoutRunStartScroll = async () => {
      let runtime: ReturnType<typeof useLocalRuntime> | null = null;
      const Harness: FC = () => {
        runtime = useLocalRuntime(adapter, { initialMessages: messages });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitiveRoot>
              <ThreadPrimitiveViewport
                data-testid="viewport"
                scrollToBottomOnRunStart={false}
              >
                <ThreadPrimitiveMessages components={{ Message }} />
                <AtBottom />
              </ThreadPrimitiveViewport>
            </ThreadPrimitiveRoot>
          </AssistantRuntimeProvider>
        );
      };
      render(<Harness />);
      const viewport = getViewport();
      await waitFor(() => {
        expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
      });
      const startRun = () =>
        act(async () => {
          runtime!.thread.append({
            role: "user",
            content: [{ type: "text", text: "next" }],
          });
        });
      return { viewport, startRun };
    };

    it("clears the pause when a run starts, even when run start does not scroll", async () => {
      const { viewport, startRun } = await renderWithoutRunStartScroll();

      click(addTrigger({ "aria-expanded": "false" }));
      await startRun();
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it("follows again after a run starts even when the expansion moved the reader off the bottom", async () => {
      const { viewport, startRun } = await renderWithoutRunStartScroll();

      click(addTrigger({ "aria-expanded": "false" }));
      growContent();
      expect(viewport.scrollTop).toBeLessThan(getMaxScrollTop(viewport));
      await startRun();
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });

    it("keeps the reader's place after a run starts when they scrolled up during the pause", async () => {
      const { viewport, startRun } = await renderWithoutRunStartScroll();

      click(addTrigger({ "aria-expanded": "false" }));
      act(() => {
        viewport.dispatchEvent(new WheelEvent("wheel"));
        viewport.scrollTop = getMaxScrollTop(viewport) - 50;
        viewport.dispatchEvent(new Event("scroll"));
      });
      const scrollTop = viewport.scrollTop;
      await startRun();
      growContent();

      expect(viewport.scrollTop).toBe(scrollTop);
    });

    it("clears the pause on a thread switch, even when the switch does not scroll", async () => {
      const SwitchingThread = () => {
        const [thread, setThread] = useState({ id: "a", messages });
        const runtime = useExternalStoreRuntime<ThreadMessageLike>({
          messages: thread.messages,
          convertMessage: (message) => message,
          onNew: async () => {},
          adapters: {
            threadList: {
              threadId: thread.id,
              threads: [
                { id: "a", status: "regular" },
                { id: "b", status: "regular" },
              ],
            },
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread autoScroll scrollToBottomOnThreadSwitch={false} />
            <button
              type="button"
              data-testid="switch"
              onClick={() =>
                setThread({
                  id: "b",
                  messages: messages.map((message, index) => ({
                    ...message,
                    content: [{ type: "text", text: `Reply ${index + 1}` }],
                  })),
                })
              }
            />
          </AssistantRuntimeProvider>
        );
      };
      render(<SwitchingThread />);
      const viewport = getViewport();
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(
          messages.length,
        ),
      );
      act(() => {
        viewport.scrollTop = getMaxScrollTop(viewport);
        fireEvent.scroll(viewport);
      });

      click(addTrigger({ "aria-expanded": "false" }));
      await act(async () => {
        fireEvent.click(screen.getByTestId("switch"));
      });
      growContent();

      expect(viewport.scrollTop).toBe(getMaxScrollTop(viewport));
    });
  });

  it.each([
    { label: "pointerdown", make: () => new Event("pointerdown") },
    { label: "wheel", make: () => new WheelEvent("wheel") },
    { label: "touchstart", make: () => new Event("touchstart") },
    {
      label: "Enter keydown",
      make: () => new KeyboardEvent("keydown", { key: "Enter" }),
    },
    {
      label: "Space keydown",
      make: () => new KeyboardEvent("keydown", { key: " " }),
    },
    ...["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].map(
      (key) => ({
        label: `${key} keydown`,
        make: () => new KeyboardEvent("keydown", { key }),
      }),
    ),
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
    { label: "wheel", make: () => new WheelEvent("wheel") },
    { label: "touchstart", make: () => new Event("touchstart") },
    {
      label: "Enter keydown",
      make: () => new KeyboardEvent("keydown", { key: "Enter" }),
    },
    {
      label: "Space keydown",
      make: () => new KeyboardEvent("keydown", { key: " " }),
    },
    {
      label: "ArrowDown keydown",
      make: () => new KeyboardEvent("keydown", { key: "ArrowDown" }),
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

  it.each(["Shift", "Control", "Meta", "Tab", "Escape", "a"])(
    "keeps pending bottom-scroll intent through a %s press",
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

      // neither an activation key nor consumed by a text field
      act(() => {
        getViewport().dispatchEvent(new KeyboardEvent("keydown", { key }));
      });

      forceShortViewportMeasurement = false;
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
    },
  );

  it.each([" ", "ArrowDown"])(
    "keeps pending bottom-scroll intent through a %s press in the composer",
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

      act(() => {
        screen
          .getByTestId("composer")
          .dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });

      forceShortViewportMeasurement = false;
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(getMaxScrollTop(getViewport()));
    },
  );

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

  describe("earlier messages", () => {
    const pagedMessages: ThreadMessageLike[] = messages.map(
      (message, index) => ({
        ...message,
        id: `message-${index}`,
      }),
    );

    type PagedThreadProps = {
      follow?: boolean;
      running?: boolean;
      /** Runs in the same update that prepends the page. */
      onPrepend?: () => void;
    };

    const PagedThread = ({
      follow = false,
      running = false,
      onPrepend,
    }: PagedThreadProps) => {
      const [loaded, setLoaded] = useState(pagedMessages.slice(4));
      const runtime = useExternalStoreRuntime<ThreadMessageLike>({
        messages: loaded,
        convertMessage: (message) => message,
        onNew: async () => {},
        isRunning: running,
        hasEarlier: loaded.length < pagedMessages.length,
        onLoadEarlier: async () => {
          onPrepend?.();
          setLoaded(pagedMessages);
        },
      });

      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {follow ? <BottomAnchorThread /> : <Thread />}
          <ThreadPrimitiveLoadEarlier data-testid="load-earlier" />
        </AssistantRuntimeProvider>
      );
    };

    const renderAt = async (
      scrollTop: number,
      { follow = false, onPrepend }: PagedThreadProps = {},
    ) => {
      render(<PagedThread follow={follow} {...(onPrepend && { onPrepend })} />);
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(4),
      );
      act(() => {
        getViewport().scrollTop = scrollTop;
        fireEvent.scroll(getViewport());
      });
    };

    const loadEarlier = async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId("load-earlier"));
      });
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(8),
      );
      act(notifyResizeObservers);
    };

    it("keeps the rows a reader scrolled to in place when an earlier page is prepended", async () => {
      await renderAt(0);

      await loadEarlier();

      expect(getViewport().scrollTop).toBe(4 * 80);
      expect(
        (screen.getByTestId("load-earlier") as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it.each([false, true])(
      "keeps a reader at the bottom at the bottom (auto-follow %s)",
      async (follow) => {
        await renderAt(4 * 80 - 100, { follow });

        await loadEarlier();

        expect(getViewport().scrollTop).toBe(8 * 80 - 100);
      },
    );

    it("does not count growth below the reader in the same update as part of the page", async () => {
      await renderAt(100, {
        onPrepend: () => {
          viewportMeasurementOffset = 40;
        },
      });

      await loadEarlier();

      expect(getViewport().scrollTop).toBe(4 * 80 + 100);
    });

    it("holds the rows in place while the page above settles, until the reader's next gesture", async () => {
      await renderAt(0);
      await loadEarlier();
      expect(getViewport().scrollTop).toBe(4 * 80);

      messageHeights.set("message-3", 120);
      act(notifyResizeObservers);
      expect(getViewport().scrollTop).toBe(4 * 80 + 40);

      fireEvent.wheel(getViewport());
      messageHeights.set("message-2", 120);
      act(notifyResizeObservers);
      expect(getViewport().scrollTop).toBe(4 * 80 + 40);
    });

    it("lets go of the held rows when a run starts, so the new turn can take the viewport", async () => {
      const { rerender } = render(<PagedThread />);
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(4),
      );
      act(() => {
        getViewport().scrollTop = 0;
        fireEvent.scroll(getViewport());
      });
      await loadEarlier();

      await act(async () => {
        rerender(<PagedThread running />);
      });
      messageHeights.set("message-3", 120);
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(4 * 80);
    });

    it("lets go of the held rows once something else scrolls the viewport", async () => {
      await renderAt(0);
      await loadEarlier();

      act(() => {
        getViewport().scrollTo({ top: 100 });
      });
      messageHeights.set("message-3", 120);
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(100);
    });

    it("holds the row the reader sees, not the old first message, while content between them settles", async () => {
      await renderAt(100);
      await loadEarlier();
      expect(getViewport().scrollTop).toBe(4 * 80 + 100);

      messageHeights.set("message-4", 120);
      act(notifyResizeObservers);
      expect(getViewport().scrollTop).toBe(4 * 80 + 100 + 40);
    });

    it("does not treat a thread switch as a page, even when the new thread repeats the old first message", async () => {
      const SwitchingThread = () => {
        const [thread, setThread] = useState({
          id: "a",
          messages: pagedMessages.slice(4),
        });
        const runtime = useExternalStoreRuntime<ThreadMessageLike>({
          messages: thread.messages,
          convertMessage: (message) => message,
          onNew: async () => {},
          adapters: {
            threadList: {
              threadId: thread.id,
              threads: [
                { id: "a", status: "regular" },
                { id: "b", status: "regular" },
              ],
            },
          },
        });

        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread scrollToBottomOnThreadSwitch={false} />
            <button
              type="button"
              data-testid="switch"
              onClick={() =>
                setThread({ id: "b", messages: pagedMessages.slice(3) })
              }
            />
          </AssistantRuntimeProvider>
        );
      };

      render(<SwitchingThread />);
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(4),
      );
      act(() => {
        getViewport().scrollTop = 100;
        fireEvent.scroll(getViewport());
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("switch"));
      });
      await waitFor(() =>
        expect(screen.getAllByTestId("thread-message")).toHaveLength(5),
      );
      act(notifyResizeObservers);

      expect(getViewport().scrollTop).toBe(100);
    });
  });
});
