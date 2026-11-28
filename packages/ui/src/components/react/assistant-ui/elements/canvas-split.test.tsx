import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasSplitBody, CanvasSplitLine } from "./canvas-split";

afterEach(() => {
  cleanup();
});

const body = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="canvas-split-body"]')!;

const caretOnLastLine = "*:last:after:animate-pulse";
const caretWhenEmpty = "empty:before:animate-pulse";

describe("CanvasSplitBody", () => {
  it("draws the writing caret after the last line instead of in its own row", () => {
    const { container, rerender } = render(
      <CanvasSplitBody writing>
        <CanvasSplitLine heading>Migrating to 0.14</CanvasSplitLine>
        <CanvasSplitLine>Swap the provider.</CanvasSplitLine>
      </CanvasSplitBody>,
    );

    const lines = [...body(container).children];
    expect(lines.map((line) => line.getAttribute("data-slot"))).toEqual([
      "canvas-split-line",
      "canvas-split-line",
    ]);
    expect(body(container).classList.contains(caretOnLastLine)).toBe(true);

    rerender(
      <CanvasSplitBody>
        <CanvasSplitLine heading>Migrating to 0.14</CanvasSplitLine>
        <CanvasSplitLine>Swap the provider.</CanvasSplitLine>
      </CanvasSplitBody>,
    );

    expect([...body(container).children]).toEqual(lines);
    expect(body(container).classList.contains(caretOnLastLine)).toBe(false);
  });

  it("shows the caret alone before the first line arrives", () => {
    const { container } = render(<CanvasSplitBody writing />);

    expect(body(container).matches(":empty")).toBe(true);
    expect(body(container).classList.contains(caretWhenEmpty)).toBe(true);
  });
});
