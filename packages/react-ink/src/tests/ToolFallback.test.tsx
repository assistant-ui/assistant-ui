import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ToolFallback } from "../primitives/toolCall/ToolFallback";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
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
