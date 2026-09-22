import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ToolFallback } from "../primitives/toolCall/ToolFallback";

type PressableState = { isFocused: boolean; disabled: boolean };
type PressableProps = {
  children: ReactNode | ((state: PressableState) => ReactNode);
};

const observedInverse = vi.hoisted(() => [] as boolean[]);

vi.mock("../primitives/internal/Pressable", () => ({
  Pressable: ({ children }: PressableProps) => {
    const isFocused = observedInverse.length === 0;
    const rendered =
      typeof children === "function"
        ? children({ isFocused, disabled: false })
        : children;
    if (
      rendered &&
      typeof rendered === "object" &&
      "props" in rendered &&
      rendered.props &&
      typeof rendered.props === "object" &&
      "inverse" in rendered.props
    ) {
      observedInverse.push(rendered.props.inverse === true);
    }
    return rendered;
  },
}));

afterEach(() => {
  cleanup();
  observedInverse.length = 0;
});

describe("ToolFallback approval focus", () => {
  it("renders focus styling for the selected decision", () => {
    render(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
        approval={{ id: "approval-1", display: "decision" }}
        respondToApproval={async () => {}}
      />,
    );

    expect(observedInverse).toEqual([true, false]);
  });
});
