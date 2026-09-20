import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowCanvas } from "./flow-canvas";

type Rect = Pick<
  DOMRect,
  "left" | "right" | "top" | "bottom" | "width" | "height"
>;

const resizeObservers: TestResizeObserver[] = [];

class TestResizeObserver {
  readonly observed = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  observe = (target: Element) => {
    this.observed.add(target);
  };

  unobserve = (target: Element) => {
    this.observed.delete(target);
  };

  disconnect = () => {
    this.observed.clear();
  };

  trigger(target: Element) {
    if (!this.observed.has(target)) return;
    this.callback([{ target } as ResizeObserverEntry], this as ResizeObserver);
  }
}

describe("FlowCanvas layout", () => {
  let sourceRect: Rect;
  let targetRect: Rect;

  beforeEach(() => {
    resizeObservers.length = 0;
    vi.stubGlobal(
      "ResizeObserver",
      TestResizeObserver as unknown as typeof ResizeObserver,
    );
    sourceRect = {
      left: 10,
      right: 30,
      top: 10,
      bottom: 30,
      width: 20,
      height: 20,
    };
    targetRect = {
      left: 10,
      right: 30,
      top: 50,
      bottom: 70,
      width: 20,
      height: 20,
    };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const id = this.getAttribute("data-flow-id");
        if (id === "source") return sourceRect as DOMRect;
        if (id === "target") return targetRect as DOMRect;
        return {
          left: 0,
          right: 200,
          top: 0,
          bottom: 200,
          width: 200,
          height: 200,
        } as DOMRect;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("remeasures edges when a flow node resizes", async () => {
    const { container } = render(
      <FlowCanvas edges={[{ from: "source", to: "target" }]}>
        <div data-flow-id="source">Source</div>
        <div data-flow-id="target">Target</div>
      </FlowCanvas>,
    );
    const source = container.querySelector('[data-flow-id="source"]')!;
    const edgePath = () =>
      container
        .querySelector('[data-slot="flow-canvas-edge"] path')
        ?.getAttribute("d");

    await waitFor(() => expect(edgePath()).toBeTruthy());
    const initialPath = edgePath();
    const observer = resizeObservers[0]!;
    expect(observer.observed.has(source)).toBe(true);

    sourceRect = { ...sourceRect, bottom: 60, height: 50 };
    targetRect = { ...targetRect, top: 80, bottom: 100 };
    act(() => observer.trigger(source));

    await waitFor(() => expect(edgePath()).not.toBe(initialPath));
  });
});
