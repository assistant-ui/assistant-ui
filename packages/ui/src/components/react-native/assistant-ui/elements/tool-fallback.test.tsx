import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePartProps } from "@assistant-ui/react-native";
import { ToolFallback } from "./tool-fallback";

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
    WrenchIcon: icon("WrenchIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const pendingApproval = { id: "req_1" };

const renderTool = (
  props: Partial<ToolCallMessagePartProps> = {},
): ToolCallMessagePartProps =>
  ({
    type: "tool-call",
    toolCallId: "call-1",
    toolName: "search",
    args: {},
    argsText: "{}",
    status: { type: "complete", reason: "stop" },
    addResult: vi.fn(),
    resume: vi.fn(),
    respondToApproval: vi.fn(),
    ...props,
  }) as ToolCallMessagePartProps;

describe("ToolFallback", () => {
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

  const mount = async (props: Partial<ToolCallMessagePartProps> = {}) => {
    await act(async () => {
      root.render(<ToolFallback {...renderTool(props)} />);
    });
  };

  it("labels a completed tool as used", async () => {
    await mount();
    expect(container.textContent).toContain("Used search");
    expect(container.querySelector('[aria-label="Allow"]')).toBeNull();
    expect(container.querySelector('[aria-label="Deny"]')).toBeNull();
  });

  it("labels a running tool as running", async () => {
    await mount({ status: { type: "running" } });
    expect(container.textContent).toContain("Running search…");
    expect(container.querySelector('[aria-label="Allow"]')).toBeNull();
  });

  it("does not treat a pending approval as used", async () => {
    await mount({
      status: { type: "requires-action", reason: "tool-calls" },
      approval: pendingApproval,
    });
    expect(container.textContent).toContain("Waiting for search");
    expect(container.textContent).not.toContain("Used search");
  });

  it("lets the user allow or deny a pending approval", async () => {
    const respondToApproval = vi.fn(async () => {});
    await mount({
      status: { type: "requires-action", reason: "tool-calls" },
      approval: pendingApproval,
      respondToApproval,
    });

    const allow = container.querySelector('[aria-label="Allow"]');
    const deny = container.querySelector('[aria-label="Deny"]');
    expect(allow).not.toBeNull();
    expect(deny).not.toBeNull();

    await act(async () => {
      click(allow!);
    });
    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
  });

  it("hides the controls after a resolved approval", async () => {
    await mount({
      status: { type: "complete", reason: "stop" },
      approval: { id: "req_1", approved: true },
    });
    expect(container.textContent).toContain("Used search");
    expect(container.querySelector('[aria-label="Allow"]')).toBeNull();
  });

  it("reopens the controls when the approval response is refused", async () => {
    const respondToApproval = vi.fn(async () => {
      throw new Error("gate expired");
    });
    await mount({
      status: { type: "requires-action", reason: "tool-calls" },
      approval: pendingApproval,
      respondToApproval,
    });

    const allow = container.querySelector(
      '[aria-label="Allow"]',
    ) as HTMLButtonElement;
    await act(async () => {
      click(allow);
    });
    await act(async () => {});
    expect(allow.disabled).toBe(false);
  });
});
