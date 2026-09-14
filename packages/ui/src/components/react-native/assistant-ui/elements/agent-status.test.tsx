import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentStatus } from "./agent-status";

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
    CheckIcon: icon("CheckIcon"),
    PauseIcon: icon("PauseIcon"),
    RotateCcwIcon: icon("RotateCcwIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("AgentStatus", () => {
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

  it("announces the label with its state and shows elapsed time while working", async () => {
    await act(async () => {
      root.render(
        <AgentStatus state="working" label="Reading files" elapsed="0:42" />,
      );
    });

    const pill = container.querySelector(
      '[aria-label="Reading files, working"]',
    );
    expect(pill).not.toBeNull();
    expect(pill?.getAttribute("aria-live")).toBe("polite");
    expect(pill?.textContent).toContain("0:42");
    expect(pill?.querySelector('[data-testid="PauseIcon"]')).not.toBeNull();
    expect(pill?.querySelector('[data-testid="CheckIcon"]')).toBeNull();
  });

  it("drops the timer and swaps to the done affordances", async () => {
    await act(async () => {
      root.render(<AgentStatus state="done" label="Finished" elapsed="1:05" />);
    });

    const pill = container.querySelector('[aria-label="Finished, done"]');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).not.toContain("1:05");
    expect(pill?.querySelector('[data-testid="CheckIcon"]')).not.toBeNull();
    expect(pill?.querySelector('[data-testid="RotateCcwIcon"]')).not.toBeNull();
  });
});
