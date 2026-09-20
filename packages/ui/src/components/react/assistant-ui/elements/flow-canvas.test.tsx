import { render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { FlowCanvas } from "./flow-canvas";

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
});
