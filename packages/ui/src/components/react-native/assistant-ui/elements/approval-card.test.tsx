import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalCard, type ApprovalState } from "./approval-card";

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
    TerminalIcon: icon("TerminalIcon"),
    XIcon: icon("XIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ApprovalCard", () => {
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

  const render = async (
    state: ApprovalState,
    handlers: Partial<{
      onAllowOnce: () => void;
      onAlwaysAllow: () => void;
      onDeny: () => void;
    }> = {},
  ) => {
    await act(async () => {
      root.render(
        <ApprovalCard
          state={state}
          command="rm -rf node_modules"
          title="Run shell command"
          subtitle="in ~/project"
          {...handlers}
        />,
      );
    });
  };

  it("offers the three decisions while a request is pending", async () => {
    const onAllowOnce = vi.fn();
    const onAlwaysAllow = vi.fn();
    const onDeny = vi.fn();
    await render("request", { onAllowOnce, onAlwaysAllow, onDeny });

    expect(container.textContent).toContain("Run shell command");
    expect(container.textContent).toContain("in ~/project");
    expect(container.textContent).toContain("rm -rf node_modules");

    for (const [label, handler] of [
      ["Allow once", onAllowOnce],
      ["Always allow", onAlwaysAllow],
      ["Deny", onDeny],
    ] as const) {
      await act(async () => {
        click(container.querySelector(`[aria-label="${label}"]`) as Element);
      });
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it.each([
    ["running", "Approved, running", null],
    ["denied", "Denied", "XIcon"],
    ["done", "Finished with exit 0", "CheckIcon"],
  ] as const)("reports the %s state", async (state, text, icon) => {
    await render(state);

    const status = container.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toContain(text);
    expect(container.querySelector('[aria-label="Allow once"]')).toBeNull();
    if (icon) {
      expect(status?.querySelector(`[data-testid="${icon}"]`)).not.toBeNull();
    }
  });
});
