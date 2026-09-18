/** @vitest-environment jsdom */
import type { MouseEvent } from "react";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as GetSelectionMessageIdModule from "../../utils/getSelectionMessageId";
import { SelectionToolbarPrimitiveRoot } from "./SelectionToolbarRoot";

vi.mock("../../utils/getSelectionMessageId", async (importOriginal) => ({
  ...(await importOriginal<typeof GetSelectionMessageIdModule>()),
  getSelectionMessageId: () => "m1",
}));

const fakeSelection = {
  isCollapsed: false,
  toString: () => "selected text",
  getRangeAt: () => ({
    getBoundingClientRect: () => ({ top: 100, left: 50, width: 20 }) as DOMRect,
  }),
} as unknown as Selection;

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  vi.spyOn(window, "getSelection").mockReturnValue(fakeSelection);
});

afterEach(() => {
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
    fireEvent.keyUp(document);
    expect(frames).toHaveLength(2);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrame).toHaveBeenLastCalledWith(2);
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
