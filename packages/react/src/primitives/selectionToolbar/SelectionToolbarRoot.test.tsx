/** @vitest-environment jsdom */
import type { MouseEvent, ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as StoreModule from "@assistant-ui/store";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { SelectionToolbarPrimitiveRoot } from "./SelectionToolbarRoot";

const h = vi.hoisted(() => ({
  aui: {
    thread: {
      source: null,
      getState: () => ({ speech: undefined }),
      stopSpeaking: vi.fn(),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof StoreModule>()),
  useAui: () => h.aui,
}));

let selectionMessage: HTMLDivElement;

beforeEach(() => {
  selectionMessage = document.createElement("div");
  selectionMessage.dataset.messageId = "m1";
  selectionMessage.textContent = "selected text";
  document.body.append(selectionMessage);
  const selectedNode = selectionMessage.firstChild;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    anchorNode: selectedNode,
    focusNode: selectedNode,
    rangeCount: 1,
    toString: () => "selected text",
    getRangeAt: () => ({
      commonAncestorContainer: selectedNode,
      getBoundingClientRect: () =>
        ({ top: 100, left: 50, width: 20 }) as DOMRect,
    }),
  } as unknown as Selection);
});

afterEach(() => {
  selectionMessage.remove();
  vi.restoreAllMocks();
});

const setupToolbar = (
  onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void,
) => {
  render(
    <SelectionToolbarPrimitiveRoot
      data-testid="toolbar"
      onMouseDown={onMouseDown}
    />,
  );
  fireEvent.mouseUp(document);
  const toolbar = document.querySelector('[data-testid="toolbar"]');
  expect(toolbar).not.toBeNull();
  return toolbar as HTMLElement;
};

describe("SelectionToolbarPrimitiveRoot onMouseDown composition", () => {
  it("runs the consumer handler on an un-prevented event before preventing default", () => {
    let observedDefaultPrevented: boolean | undefined;
    const onMouseDown = vi.fn((event: MouseEvent<HTMLDivElement>) => {
      observedDefaultPrevented = event.defaultPrevented;
    });
    const toolbar = setupToolbar(onMouseDown);

    const notPrevented = fireEvent.mouseDown(toolbar);

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(observedDefaultPrevented).toBe(false);
    expect(notPrevented).toBe(false);
  });

  it("keeps the event prevented when the consumer prevents default", () => {
    const onMouseDown = vi.fn((event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    const toolbar = setupToolbar(onMouseDown);

    const notPrevented = fireEvent.mouseDown(toolbar);

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });
});

describe("SelectionToolbarPrimitiveRoot selection changes", () => {
  it("opens from a selectionchange event without a mouse or key event", () => {
    render(<SelectionToolbarPrimitiveRoot data-testid="toolbar" />);

    fireEvent(document, new Event("selectionchange"));

    expect(document.querySelector('[data-testid="toolbar"]')).not.toBeNull();
  });

  it("closes an open toolbar when the selection collapses", () => {
    render(<SelectionToolbarPrimitiveRoot data-testid="toolbar" />);
    fireEvent(document, new Event("selectionchange"));
    expect(document.querySelector('[data-testid="toolbar"]')).not.toBeNull();

    vi.mocked(window.getSelection).mockReturnValueOnce({
      isCollapsed: true,
    } as Selection);
    fireEvent(document, new Event("selectionchange"));

    expect(document.querySelector('[data-testid="toolbar"]')).toBeNull();
  });

  it("opens only inside the thread that owns the selection", () => {
    const { getByTestId } = render(
      <>
        <ThreadPrimitiveRoot>
          <div data-message-id="m1">
            <span data-testid="first-message">first</span>
          </div>
          <SelectionToolbarPrimitiveRoot data-testid="first-toolbar" />
        </ThreadPrimitiveRoot>
        <ThreadPrimitiveRoot>
          <div data-message-id="m1">
            <span data-testid="second-message">second</span>
          </div>
          <SelectionToolbarPrimitiveRoot data-testid="second-toolbar" />
        </ThreadPrimitiveRoot>
      </>,
    );
    const selectedNode = getByTestId("first-message").firstChild;
    vi.mocked(window.getSelection).mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      rangeCount: 1,
      toString: () => "first",
      getRangeAt: () => ({
        commonAncestorContainer: selectedNode,
        getBoundingClientRect: () =>
          ({ top: 100, left: 50, width: 20 }) as DOMRect,
      }),
    } as unknown as Selection);

    fireEvent(document, new Event("selectionchange"));

    expect(
      document.querySelector('[data-testid="first-toolbar"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-testid="second-toolbar"]')).toBeNull();

    const secondSelectedNode = getByTestId("second-message").firstChild;
    vi.mocked(window.getSelection).mockReturnValue({
      isCollapsed: false,
      anchorNode: secondSelectedNode,
      focusNode: secondSelectedNode,
      rangeCount: 1,
      toString: () => "second",
      getRangeAt: () => ({
        commonAncestorContainer: secondSelectedNode,
        getBoundingClientRect: () =>
          ({ top: 100, left: 50, width: 20 }) as DOMRect,
      }),
    } as unknown as Selection);

    fireEvent(document, new Event("selectionchange"));

    expect(document.querySelector('[data-testid="first-toolbar"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="second-toolbar"]'),
    ).not.toBeNull();
  });

  it("warns when a custom thread root does not forward its ref", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const RefDroppingRoot = ({ children }: { children?: ReactNode }) => (
      <div>{children}</div>
    );
    const { getByTestId } = render(
      <ThreadPrimitiveRoot render={<RefDroppingRoot />}>
        <div data-message-id="m1">
          <span data-testid="message">text</span>
        </div>
        <SelectionToolbarPrimitiveRoot data-testid="toolbar" />
      </ThreadPrimitiveRoot>,
    );
    const selectedNode = getByTestId("message").firstChild;
    vi.mocked(window.getSelection).mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      rangeCount: 1,
      toString: () => "text",
      getRangeAt: () => ({
        commonAncestorContainer: selectedNode,
        getBoundingClientRect: () =>
          ({ top: 100, left: 50, width: 20 }) as DOMRect,
      }),
    } as unknown as Selection);

    fireEvent(document, new Event("selectionchange"));

    expect(document.querySelector('[data-testid="toolbar"]')).not.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[SelectionToolbarPrimitive.Root] ThreadPrimitive.Root did not provide a DOM element, so the selection cannot be scoped to its thread. Ensure a custom root child forwards its ref.",
    );
  });
});

describe("SelectionToolbarPrimitiveRoot frame cleanup", () => {
  // Defer the frame instead of running it inline, so the window between the
  // selection event and the frame is observable.
  const deferFrames = () => {
    const frames: FrameRequestCallback[] = [];
    let nextHandle = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return nextHandle++;
    });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
    return { frames, cancelAnimationFrame };
  };

  it("cancels a queued selection frame when the toolbar unmounts", () => {
    const { frames, cancelAnimationFrame } = deferFrames();
    const { unmount } = render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseUp(document);
    expect(frames).toHaveLength(1);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it("cancels the previous frame when another selection event arrives", () => {
    const { frames, cancelAnimationFrame } = deferFrames();
    const { unmount } = render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseUp(document);
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(2);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrame).toHaveBeenLastCalledWith(2);
  });

  it("waits until mouseup to measure a drag selection", () => {
    const { frames } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseDown(document);
    fireEvent(document, new Event("selectionchange"));
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(0);

    fireEvent.mouseUp(document);
    expect(frames).toHaveLength(1);
  });

  it("recovers when a drag ends without mouseup", () => {
    const { frames } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseDown(document);
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(0);

    fireEvent(document, new Event("dragend"));
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(2);
  });

  it("recovers when the window blurs during a drag", () => {
    const { frames } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseDown(document);
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(0);

    fireEvent.blur(window);
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(1);
  });

  it("recovers when a context menu consumes the mouseup of a press", () => {
    const { frames } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent.mouseDown(document, { button: 2 });
    fireEvent.contextMenu(document);
    fireEvent(document, new Event("selectionchange"));
    expect(frames).toHaveLength(1);
  });

  it("cancels a queued selection frame when the page scrolls", () => {
    const { frames, cancelAnimationFrame } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent(document, new Event("selectionchange"));
    fireEvent.scroll(document);

    expect(frames).toHaveLength(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it("cancels a queued frame when the selection collapses", () => {
    const { frames, cancelAnimationFrame } = deferFrames();
    render(<SelectionToolbarPrimitiveRoot />);

    fireEvent(document, new Event("selectionchange"));
    vi.mocked(window.getSelection).mockReturnValueOnce({
      isCollapsed: true,
    } as Selection);
    fireEvent(document, new Event("selectionchange"));

    expect(frames).toHaveLength(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
