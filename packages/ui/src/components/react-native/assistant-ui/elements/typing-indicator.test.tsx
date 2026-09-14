import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TypingIndicator } from "./typing-indicator";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("TypingIndicator", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("wraps the dots in a bubble and labels them", async () => {
    await act(async () => {
      root.render(<TypingIndicator testID="bubble" />);
    });

    const bubble = container.querySelector('[data-testid="bubble"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.getAttribute("aria-label")).toBeNull();
    expect(
      bubble?.querySelector('[aria-label="Assistant is typing"]'),
    ).not.toBeNull();
  });

  it("spreads props onto the dots row in the bare variant", async () => {
    await act(async () => {
      root.render(
        <TypingIndicator
          variant="bare"
          accessibilityLabel="Assistant is working"
          accessibilityLiveRegion="polite"
        />,
      );
    });

    const row = container.querySelector('[aria-label="Assistant is working"]');
    expect(row).not.toBeNull();
    expect(row?.getAttribute("aria-live")).toBe("polite");
    expect(
      container.querySelector('[aria-label="Assistant is typing"]'),
    ).toBeNull();
  });
});
