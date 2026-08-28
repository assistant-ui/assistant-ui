import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";

import { ToolFallback, ToolFallbackApproval } from "./tool-fallback.aui";

const stubs = vi.hoisted(() => ({
  useScrollLock: () => () => {},
  useToolCallElapsed: () => undefined,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useScrollLock: stubs.useScrollLock,
  useToolCallElapsed: stubs.useToolCallElapsed,
}));

const pendingApproval = { id: "req_1" };

// React reports an error thrown by an event handler through `reportError`,
// which jsdom surfaces as a window error event rather than to the caller.
const captureWindowErrors = () => {
  const errors: ErrorEvent[] = [];
  const listener = (event: ErrorEvent) => {
    errors.push(event);
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener("error", listener, true);
  return {
    errors,
    restore: () => window.removeEventListener("error", listener, true),
  };
};

const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

afterEach(cleanup);

const renderTool = (props: Partial<ToolCallMessagePartProps> = {}) => {
  const part = {
    type: "tool-call",
    toolCallId: "call-1",
    toolName: "test-tool",
    args: {},
    argsText: "{}",
    status: { type: "requires-action", reason: "interrupt" },
    ...props,
  } as ToolCallMessagePartProps;

  return render(<ToolFallback {...part} />);
};

describe("ToolFallback", () => {
  it("does not offer a fabricated result for an unprojected interrupt", () => {
    renderTool({ addResult: vi.fn() });

    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deny" })).toBeNull();
  });

  it("responds to a projected approval", () => {
    const respondToApproval = vi.fn();
    renderTool({ approval: { id: "approval-1" }, respondToApproval });

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
  });

  it("resumes a part-level interrupt", () => {
    const resume = vi.fn();
    renderTool({ interrupt: { type: "human", payload: {} }, resume });

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(resume).toHaveBeenCalledWith({ approved: true });
  });

  it("keeps the addResult fallback for tool-call actions", () => {
    const addResult = vi.fn();
    renderTool({
      status: {
        type: "requires-action",
        reason: "tool-calls",
      },
      addResult,
    });

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(addResult).toHaveBeenCalledWith("Approved by user");
  });

  it("renders custom-kind options declared by the request", () => {
    const respondToApproval = vi.fn();
    renderTool({
      approval: {
        id: "approval-1",
        options: [
          { id: "red", kind: "_red", label: "Red" },
          { id: "blue", kind: "_blue", label: "Blue" },
        ],
      },
      respondToApproval,
    });

    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    fireEvent.click(screen.getByRole("button", { name: "Red" }));

    expect(respondToApproval).toHaveBeenCalledExactlyOnceWith({
      optionId: "blue",
      approved: true,
    });
  });

  it("runs the confirmation step for a custom-kind option", () => {
    const respondToApproval = vi.fn();
    renderTool({
      approval: {
        id: "approval-1",
        options: [{ id: "red", kind: "_red", label: "Red", confirm: true }],
      },
      respondToApproval,
    });

    fireEvent.click(screen.getByRole("button", { name: "Red" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(respondToApproval).toHaveBeenCalledWith({
      optionId: "red",
      approved: true,
    });
  });

  it("keeps a refusal path when every declared option is a custom kind", () => {
    const respondToApproval = vi.fn();
    renderTool({
      approval: {
        id: "approval-1",
        options: [{ id: "red", kind: "_red", label: "Red" }],
      },
      respondToApproval,
    });

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(respondToApproval).toHaveBeenCalledWith({ approved: false });
  });

  it("keeps known-kind resolution when custom options are declared alongside", () => {
    const respondToApproval = vi.fn();
    renderTool({
      approval: {
        id: "approval-1",
        options: [
          { id: "allow", kind: "allow-once" },
          { id: "reject", kind: "reject-once" },
          { id: "red", kind: "_red", label: "Red" },
        ],
      },
      respondToApproval,
    });

    expect(screen.getByRole("button", { name: "Allow" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Red" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Deny" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(respondToApproval).toHaveBeenCalledWith({ optionId: "allow" });
  });

  it("falls back to the option id when a custom option has no label", () => {
    renderTool({
      approval: {
        id: "approval-1",
        options: [{ id: "escalate", kind: "_escalate" }],
      },
      respondToApproval: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "escalate" })).toBeTruthy();
  });

  it("does not fabricate a result from the exported Approval seam", () => {
    const addResult = vi.fn();
    render(
      <ToolFallback.Approval
        status={{ type: "requires-action", reason: "interrupt" }}
        addResult={addResult}
      />,
    );

    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(addResult).not.toHaveBeenCalled();
  });
});

describe("ToolFallbackApproval", () => {
  it("keeps the controls actionable when the runtime refuses the response", () => {
    let refuses = true;
    const respondToApproval = vi.fn(() => {
      if (refuses) throw new Error("response cannot be mapped");
    });
    const { errors, restore } = captureWindowErrors();

    try {
      render(
        <ToolFallbackApproval
          approval={pendingApproval}
          respondToApproval={respondToApproval}
        />,
      );

      fireEvent.click(button("Allow"));

      expect(errors.map((event) => event.error?.message)).toEqual([
        "response cannot be mapped",
      ]);
      expect(respondToApproval).toHaveBeenLastCalledWith({ approved: true });
      expect(button("Allow").disabled).toBe(false);
      expect(button("Deny").disabled).toBe(false);

      refuses = false;
      fireEvent.click(button("Deny"));

      expect(respondToApproval).toHaveBeenLastCalledWith({ approved: false });
      expect(button("Allow").disabled).toBe(true);
      expect(button("Deny").disabled).toBe(true);
    } finally {
      restore();
    }
  });
});
