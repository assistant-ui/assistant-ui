import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TypingIndicator } from "./typing-indicator";

const h = vi.hoisted(() => ({
  reduceMotion: false,
  loop: vi.fn(),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  h.loop.mockImplementation(actual.Animated.loop);

  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: () => Promise.resolve(h.reduceMotion),
      addEventListener: () => ({ remove: () => {} }),
    },
    Animated: { ...actual.Animated, loop: h.loop },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("TypingIndicator", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.reduceMotion = false;
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
    expect(bubble?.getAttribute("aria-label")).toBe("Assistant is typing");
    expect(bubble?.getAttribute("aria-live")).toBe("polite");
  });

  it("lets the bubble be relabeled like the bare variant", async () => {
    await act(async () => {
      root.render(<TypingIndicator accessibilityLabel="Thinking" />);
    });

    expect(container.querySelector('[aria-label="Thinking"]')).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Assistant is typing"]'),
    ).toBeNull();
  });

  it("animates the dots once the motion setting is known", async () => {
    await act(async () => {
      root.render(<TypingIndicator />);
    });

    expect(h.loop).toHaveBeenCalledTimes(3);
  });

  it("keeps the dots still under reduce motion", async () => {
    h.reduceMotion = true;

    await act(async () => {
      root.render(<TypingIndicator />);
    });

    expect(h.loop).not.toHaveBeenCalled();
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
