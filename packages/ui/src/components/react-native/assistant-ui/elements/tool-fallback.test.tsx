import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const domProps = ({
    accessibilityLabel,
    accessibilityRole,
    children,
    className,
    disabled,
    onPress,
    style: _style,
    ...props
  }: any) => ({
    ...props,
    "aria-label": accessibilityLabel,
    className,
    disabled,
    onClick: onPress,
    role: accessibilityRole,
  });
  const View = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Pressable = (props: any) =>
    React.createElement("button", domProps(props), props.children);
  const Text = (props: any) =>
    React.createElement("span", domProps(props), props.children);

  return { ...actual, Pressable, Text, View };
});

vi.mock("uniwind", async (importOriginal) => ({
  ...(await importOriginal<typeof import("uniwind")>()),
  withUniwind: (Component: unknown) => Component,
}));

vi.mock("lucide-react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react-native")>();
  const React = await import("react");
  const icon = (name: string) => () =>
    React.createElement("svg", { "data-testid": name });

  return {
    ...actual,
    TerminalIcon: icon("TerminalIcon"),
    WrenchIcon: icon("WrenchIcon"),
  };
});

vi.mock("./surfaces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./surfaces")>()),
  useAnnounce: () => {},
}));

import type { ToolCallMessagePartProps } from "@assistant-ui/react-native";
import { ToolFallback } from "./tool-fallback";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolFallback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = async (props: Partial<ToolCallMessagePartProps> = {}) => {
    const part = {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "search",
      args: {},
      argsText: "{}",
      status: { type: "complete" },
      addResult: vi.fn(),
      resume: vi.fn(),
      respondToApproval: vi.fn(async () => {}),
      ...props,
    } as ToolCallMessagePartProps;

    await act(async () => root.render(<ToolFallback {...part} />));
    return part;
  };

  it.each([
    [{ type: "running" }, "Running search…"],
    [{ type: "complete" }, "Used search"],
    [{ type: "incomplete", reason: "cancelled" }, "Cancelled search"],
    [{ type: "incomplete", reason: "error", error: "boom" }, "Failed search"],
  ] as const)("renders the %s outcome", async (status, label) => {
    await render({ status });

    expect(container.textContent).toContain(label);
  });

  it("renders an incomplete reason", async () => {
    await render({
      status: { type: "incomplete", reason: "cancelled", error: "stopped" },
    });

    expect(container.textContent).toContain("Cancelled reason:");
    expect(container.textContent).toContain("stopped");
  });

  it("resumes an interrupt through the approval card", async () => {
    const resume = vi.fn();
    await render({
      status: { type: "requires-action", reason: "interrupt" },
      interrupt: { type: "human", payload: {} },
      resume,
    });

    const allow = container.querySelector(
      '[aria-label="Allow once"]',
    ) as HTMLElement;
    const deny = container.querySelector('[aria-label="Deny"]') as HTMLElement;

    await act(async () => allow.click());
    await act(async () => deny.click());

    expect(resume).toHaveBeenNthCalledWith(1, { approved: true });
    expect(resume).toHaveBeenNthCalledWith(2, { approved: false });
  });

  it("routes approval decisions and declared always-allow options", async () => {
    const respondToApproval = vi.fn(async () => {});
    await render({
      status: { type: "requires-action", reason: "interrupt" },
      approval: {
        id: "approval-1",
        options: [
          { id: "once", kind: "allow-once" },
          { id: "always", kind: "allow-always" },
          { id: "deny", kind: "reject-once" },
        ],
      },
      respondToApproval,
    });

    await act(async () =>
      (
        container.querySelector('[aria-label="Always allow"]') as HTMLElement
      ).click(),
    );
    await act(async () =>
      (container.querySelector('[aria-label="Deny"]') as HTMLElement).click(),
    );

    expect(respondToApproval).toHaveBeenNthCalledWith(1, {
      optionId: "always",
    });
    expect(respondToApproval).toHaveBeenNthCalledWith(2, { optionId: "deny" });
  });

  it("uses a boolean approval response when no options are declared", async () => {
    const respondToApproval = vi.fn(async () => {});
    await render({
      status: { type: "requires-action", reason: "interrupt" },
      approval: { id: "approval-1" },
      respondToApproval,
    });

    await act(async () =>
      (
        container.querySelector('[aria-label="Allow once"]') as HTMLElement
      ).click(),
    );

    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
  });

  it("uses addResult for a tool-call action without an approval or interrupt", async () => {
    const addResult = vi.fn();
    await render({
      status: { type: "requires-action", reason: "tool-calls" },
      addResult,
    });

    await act(async () =>
      (
        container.querySelector('[aria-label="Allow once"]') as HTMLElement
      ).click(),
    );

    expect(addResult).toHaveBeenCalledWith("Approved by user");
  });
});
