import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContextDisplay as ContextDisplayBase } from "./context-display";
import { ContextDisplay as ContextDisplayRadix } from "./context-display.radix";

afterEach(() => {
  cleanup();
});

const flavors = [
  ["base", ContextDisplayBase],
  ["radix", ContextDisplayRadix],
] as const;

describe.each(flavors)("ContextDisplay (%s)", (_flavor, ContextDisplay) => {
  it("renders nothing until usage exists", () => {
    const { container } = render(
      <ContextDisplay.Root modelContextWindow={128_000} usage={undefined}>
        <ContextDisplay.Trigger aria-label="Context usage">
          figure
        </ContextDisplay.Trigger>
        <ContextDisplay.Content />
      </ContextDisplay.Root>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders the trigger once usage reports tokens", () => {
    render(
      <ContextDisplay.Root
        modelContextWindow={128_000}
        usage={{ totalTokens: 2_200 }}
      >
        <ContextDisplay.Trigger aria-label="Context usage">
          figure
        </ContextDisplay.Trigger>
        <ContextDisplay.Content />
      </ContextDisplay.Root>,
    );

    expect(screen.getByRole("button", { name: "Context usage" })).toBeTruthy();
  });

  it("renders a preset only once usage exists", () => {
    const { container, rerender } = render(
      <ContextDisplay.Text modelContextWindow={128_000} usage={undefined} />,
    );

    expect(container.innerHTML).toBe("");

    rerender(
      <ContextDisplay.Text
        modelContextWindow={128_000}
        usage={{ totalTokens: 2_200 }}
      />,
    );

    expect(screen.getByText(/2\.2k/)).toBeTruthy();
  });
});
