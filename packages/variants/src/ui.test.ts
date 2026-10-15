import { afterEach, describe, expect, it, vi } from "vitest";
import { copyButton, copyWithFeedback, icon } from "./ui";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("icon", () => {
  it("builds SVG children without an HTML sink", () => {
    const svg = icon("copy");
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(Array.from(svg.children, (child) => child.tagName)).toEqual([
      "rect",
      "path",
    ]);
    expect(svg.children[0]!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.children[0]!.getAttribute("rx")).toBe("1.5");
  });
});

describe("copyWithFeedback", () => {
  it("keeps the copied state for the full period after a second copy", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: async () => {} },
    });
    const button = copyButton({});
    const live = document.createElement("div");
    await copyWithFeedback(button, "a", live);
    vi.advanceTimersByTime(1000);
    await copyWithFeedback(button, "b", live);
    vi.advanceTimersByTime(1000);
    expect(button.hasAttribute("data-copied")).toBe(true);
    vi.advanceTimersByTime(600);
    expect(button.hasAttribute("data-copied")).toBe(false);
  });
});
