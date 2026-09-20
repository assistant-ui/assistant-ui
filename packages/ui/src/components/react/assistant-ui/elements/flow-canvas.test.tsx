import { render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { FlowCanvas } from "./flow-canvas";

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }) as DOMRect;

const setRect = (bounds: DOMRect) => (element: HTMLDivElement | null) => {
  if (element) element.getBoundingClientRect = () => bounds;
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("FlowCanvas", () => {
  it("connects nodes whose ids contain CSS selector syntax", async () => {
    const from = 'source"]';
    const to = "target:#node";
    const { container } = render(
      <FlowCanvas edges={[{ from, to }]}>
        <div data-flow-id={from}>Source</div>
        <div data-flow-id={to}>Target</div>
      </FlowCanvas>,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-slot="flow-canvas-edge"]'),
      ).toHaveLength(1);
    });
  });

  it("uses the first node when an id is duplicated", async () => {
    const { container } = render(
      <FlowCanvas edges={[{ from: "source", to: "target" }]}>
        <div ref={setRect(rect(10, 10, 20, 20))} data-flow-id="source">
          First source
        </div>
        <div ref={setRect(rect(200, 200, 20, 20))} data-flow-id="source">
          Duplicate source
        </div>
        <div ref={setRect(rect(100, 100, 20, 20))} data-flow-id="target">
          Target
        </div>
      </FlowCanvas>,
    );

    await waitFor(() => {
      expect(
        container
          .querySelector('[data-slot="flow-canvas-edge"] path')
          ?.getAttribute("d"),
      ).toBe("M 20.5 30.5 V 65.5 H 110.5 V 94");
    });
  });
});
