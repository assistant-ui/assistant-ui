import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoppedRun } from "./stopped-run";

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon = (name: string) => () =>
    React.createElement(View, { testID: name });

  return {
    ArrowRightIcon: icon("ArrowRightIcon"),
    SquareIcon: icon("SquareIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("StoppedRun", () => {
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

  it("keeps the partial answer and offers continue or discard", async () => {
    const onContinue = vi.fn();
    const onDiscard = vi.fn();
    await act(async () => {
      root.render(
        <StoppedRun
          words={["The", "answer", "so", "far"]}
          reason="stopped by you"
          onContinue={onContinue}
          onDiscard={onDiscard}
        />,
      );
    });

    expect(container.textContent).toContain("The answer so far");
    expect(container.textContent).toContain("stopped by you");

    await act(async () => {
      click(container.querySelector('[aria-label="Continue"]') as Element);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      click(container.querySelector('[aria-label="Discard"]') as Element);
    });
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
