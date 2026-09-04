import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContextDisplay as ContextDisplayBase } from "./context-display";
import { ContextDisplay as ContextDisplayRadix } from "./context-display.radix";

beforeAll(() => {
  // The Radix positioner measures its anchor on open, which jsdom cannot do.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

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

  // Focus opens the tooltip in both flavors, which is the only way to reach
  // Content: Root mounts the tooltip itself and passes no open state through.
  const openPopover = async (usage: Record<string, number>) => {
    render(
      <ContextDisplay.Root modelContextWindow={128_000} usage={usage}>
        <ContextDisplay.Trigger aria-label="Context usage">
          figure
        </ContextDisplay.Trigger>
        <ContextDisplay.Content />
      </ContextDisplay.Root>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Context usage" }));
    await waitFor(() => expect(screen.getByText(/% full/)).toBeTruthy());
  };

  it("heads the popover with the share of the window in use", async () => {
    await openPopover({ totalTokens: 92_200, inputTokens: 71_300 });

    expect(screen.getByText("72% full").className).toContain("text-amber-500");
    expect(screen.getByText("92.2k / 128k")).toBeTruthy();
  });

  it("lists each reported category without giving it a share of the bar", async () => {
    await openPopover({
      totalTokens: 92_200,
      inputTokens: 71_300,
      cachedInputTokens: 41_200,
      outputTokens: 20_900,
    });

    for (const label of ["Input", "Cached input", "Output"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // Reasoning went unreported, so it is absent rather than shown as zero.
    expect(screen.queryByText("Reasoning")).toBeNull();
    expect(screen.getByText("41.2k")).toBeTruthy();
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
