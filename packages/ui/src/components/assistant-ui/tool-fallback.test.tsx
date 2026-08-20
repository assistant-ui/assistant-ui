import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";

import { ToolFallback } from "./tool-fallback";

const stubs = vi.hoisted(() => ({
  useScrollLock: () => () => {},
  useToolCallElapsed: () => undefined,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useScrollLock: stubs.useScrollLock,
  useToolCallElapsed: stubs.useToolCallElapsed,
}));

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
