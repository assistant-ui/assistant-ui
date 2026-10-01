import { createRef } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Composer, ComposerMenu } from "./composer";

const COMPOSER_WIDTH = 260;
const MENU_WIDTH = 288;

let composerWidth = COMPOSER_WIDTH;
const resizeCallbacks: ResizeObserverCallback[] = [];

const rect = (left: number, width: number) =>
  ({
    left,
    right: left + width,
    width,
    top: 0,
    bottom: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

beforeEach(() => {
  composerWidth = COMPOSER_WIDTH;
  resizeCallbacks.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.dataset["slot"] === "composer") return rect(0, composerWidth);
      return rect(Number(this.dataset["left"] ?? 0), 32);
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.parentElement;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(0);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
    MENU_WIDTH,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ComposerMenu", () => {
  it("caps its width at the composer's when anchored to the composer", () => {
    render(
      <Composer>
        <ComposerMenu open data-testid="menu" />
      </Composer>,
    );

    const menu = screen.getByTestId("menu");
    expect(menu.style.maxWidth).toBe(`${COMPOSER_WIDTH}px`);
    expect(menu.style.translate).toBe("0px 0");
  });

  it("shifts back inside the composer when its anchor sits away from the edge", () => {
    render(
      <Composer>
        <div className="relative" data-left="48">
          <ComposerMenu open data-testid="menu" />
        </div>
      </Composer>,
    );

    const menu = screen.getByTestId("menu");
    expect(menu.style.maxWidth).toBe(`${COMPOSER_WIDTH}px`);
    expect(menu.style.translate).toBe("-48px 0");
  });

  it("re-fits an open menu when the composer resizes", () => {
    render(
      <Composer>
        <ComposerMenu open data-testid="menu" />
      </Composer>,
    );
    expect(screen.getByTestId("menu").style.maxWidth).toBe(
      `${COMPOSER_WIDTH}px`,
    );

    composerWidth = 200;
    act(() => {
      for (const callback of resizeCallbacks) {
        callback([], {} as ResizeObserver);
      }
    });

    expect(screen.getByTestId("menu").style.maxWidth).toBe("200px");
  });

  it("re-measures when its alignment changes", () => {
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("end-0") ? -100 : 0;
      },
    );
    const { rerender } = render(
      <Composer>
        <ComposerMenu open data-testid="menu" />
      </Composer>,
    );
    expect(screen.getByTestId("menu").style.translate).toBe("0px 0");

    rerender(
      <Composer>
        <ComposerMenu open align="end" data-testid="menu" />
      </Composer>,
    );
    expect(screen.getByTestId("menu").style.translate).toBe("100px 0");
  });

  it("runs the cleanup a callback ref returns", () => {
    const cleanupRef = vi.fn();
    const ref = vi.fn((_node: HTMLDivElement | null) => cleanupRef);
    const { unmount } = render(
      <Composer>
        <ComposerMenu open ref={ref} />
      </Composer>,
    );

    unmount();
    expect(cleanupRef).toHaveBeenCalledOnce();
    expect(ref).not.toHaveBeenCalledWith(null);
  });

  it("forwards its ref and keeps a caller style", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Composer>
        <ComposerMenu
          open={false}
          ref={ref}
          style={{ maxWidth: 200 }}
          data-testid="menu"
        />
      </Composer>,
    );

    const menu = screen.getByTestId("menu");
    expect(ref.current).toBe(menu);
    expect(menu.style.maxWidth).toBe("200px");
  });
});
