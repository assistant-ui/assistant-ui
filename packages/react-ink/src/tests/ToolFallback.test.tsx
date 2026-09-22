import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ToolFallback } from "../primitives/toolCall/ToolFallback";

type InputHandler = (input: string, key: { return?: boolean }) => void;
const inputHandlers = vi.hoisted(() => [] as InputHandler[]);

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler, options?: { isActive?: boolean }) => {
      if (options?.isActive !== false) inputHandlers.push(handler);
    },
  };
});

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
  inputHandlers.length = 0;
});

describe("ToolFallback", () => {
  it("truncates expanded error output with maxResultLines", async () => {
    const frame = await renderFrame(
      <ToolFallback
        expanded
        maxResultLines={2}
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        result={"line 1\nline 2\nline 3\nline 4"}
        isError
        status={{ type: "incomplete", reason: "error", error: "boom" }}
      />,
    );

    expect(frame).toContain("Error:");
    expect(frame).toContain("line 1");
    expect(frame).toContain("line 2");
    expect(frame).toContain("... (2 more lines)");
    expect(frame).not.toContain("line 3");
    expect(frame).not.toContain("line 4");
  });

  it("offers Allow and Deny when respondToApproval is provided", async () => {
    const frame = await renderFrame(
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

    expect(frame).toContain("Allow");
    expect(frame).toContain("Deny");
    expect(frame).not.toContain("Waiting for approval");
  });

  it("sends the selected decision to the approval handler", async () => {
    const respondToApproval = vi.fn().mockResolvedValue(undefined);
    render(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
        approval={{ id: "approval-1", display: "decision" }}
        respondToApproval={respondToApproval}
      />,
    );

    inputHandlers[0]?.("", { return: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });

    cleanup();
    inputHandlers.length = 0;
    render(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
        approval={{ id: "approval-1", display: "decision" }}
        respondToApproval={respondToApproval}
      />,
    );

    inputHandlers[1]?.("", { return: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(respondToApproval).toHaveBeenNthCalledWith(2, { approved: false });
  });

  it("does not fabricate Allow/Deny for a select approval request", async () => {
    const frame = await renderFrame(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
        approval={{
          id: "approval-1",
          display: "select",
          options: [{ id: "once", kind: "allow-once", label: "Once" }],
        }}
        respondToApproval={async () => {}}
      />,
    );

    expect(frame).toContain("Waiting for approval");
    expect(frame).not.toContain("Allow");
    expect(frame).not.toContain("Deny");
  });

  it("waits when a decision response is not available", async () => {
    const frame = await renderFrame(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
      />,
    );

    expect(frame).toContain("Waiting for approval");
    expect(frame).not.toContain("Allow");
    expect(frame).not.toContain("Deny");
  });

  it("reports a rejected approval response without leaving an unhandled rejection", async () => {
    const error = new Error("approval failed");
    const respondToApproval = vi.fn().mockRejectedValue(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="search"
        args={{}}
        argsText="{}"
        status={{ type: "requires-action", reason: "interrupt" }}
        approval={{ id: "approval-1", display: "decision" }}
        respondToApproval={respondToApproval}
      />,
    );

    inputHandlers[0]?.("", { return: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to respond to tool approval",
      error,
    );
    errorSpy.mockRestore();
  });

  it("shows the error icon for a completed tool call that errored", async () => {
    const frame = await renderFrame(
      <ToolFallback
        type="tool-call"
        toolCallId="tool-call-1"
        toolName="run_tests"
        args={{}}
        argsText="{}"
        result="FAIL: 1 test failed"
        isError
        status={{ type: "complete" }}
      />,
    );

    expect(frame).toContain("x");
    expect(frame).toContain("run_tests");
    expect(frame).toContain("Error:");
    expect(frame).not.toContain("+");
  });
});
