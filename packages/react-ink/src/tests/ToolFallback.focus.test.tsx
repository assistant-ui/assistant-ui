import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ToolFallback } from "../primitives/toolCall/ToolFallback";

const observedButtons = vi.hoisted(() => [] as [string, boolean][]);
const focusStates = vi.hoisted(() => [true, false]);

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: focusStates.shift() ?? false }),
    useInput: () => {},
    Text: (props: ComponentProps<typeof actual.Text>) => {
      const label =
        typeof props.children === "string" ? props.children : undefined;
      if (label === "Allow" || label === "Deny") {
        observedButtons.push([label, props.inverse === true]);
      }
      return actual.Text(props);
    },
  };
});

afterEach(() => {
  cleanup();
  observedButtons.length = 0;
  focusStates.splice(0, focusStates.length, true, false);
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

    expect(observedButtons).toEqual([
      ["Allow", true],
      ["Deny", false],
    ]);
  });
});
