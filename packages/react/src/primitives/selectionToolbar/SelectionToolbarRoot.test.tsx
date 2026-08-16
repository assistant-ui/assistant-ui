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
