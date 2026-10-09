import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("IconButton", () => {
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

  it("labels the pressable and forwards presses", async () => {
    const onPress = vi.fn();
    await act(async () => {
      root.render(<IconButton label="Copy" onPress={onPress} />);
    });

    const button = container.querySelector('[aria-label="Copy"]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute("role")).toBe("button");

    await act(async () => {
      click(button as Element);
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
