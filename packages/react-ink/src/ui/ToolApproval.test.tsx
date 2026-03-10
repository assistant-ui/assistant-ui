import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ToolResponse } from "assistant-stream";
import { ToolApproval } from "./ToolApproval";

const defaultProps = {
  toolName: "read_file",
  argsText: '{"path":"/src/index.ts"}',
  addResult: vi.fn(),
  resume: vi.fn(),
};

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ToolApproval", () => {
  it("renders approval UI with keybindings", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    const frame = inst.lastFrame() ?? "";

    expect(frame).toContain("[Y]");
    expect(frame).toContain("Allow");
    expect(frame).toContain("[N]");
    expect(frame).toContain("Deny");
    expect(frame).toContain("[E]");
    expect(frame).toContain("Edit");
    expect(frame).toContain("[A]");
    expect(frame).toContain("Always allow");
    expect(frame).toContain("[S]");
  });

  it("y key calls addResult when no interrupt (human-tool-names flow)", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("y");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultProps.addResult).toHaveBeenCalledWith("Approved by user");
    expect(defaultProps.resume).not.toHaveBeenCalled();
  });

  it("y key calls resume when interrupt is present", async () => {
    const inst = await renderFrame(
      <ToolApproval
        {...defaultProps}
        interrupt={{ type: "human", payload: { message: "Allow?" } }}
      />,
    );
    inst.stdin.write("y");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultProps.resume).toHaveBeenCalledWith({ approved: true });
    expect(defaultProps.addResult).not.toHaveBeenCalled();
  });

  it("n key calls addResult with error", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("n");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultProps.addResult).toHaveBeenCalledWith(
      new ToolResponse({ result: "User denied tool execution", isError: true }),
    );
    expect(defaultProps.resume).not.toHaveBeenCalled();
  });

  it("a key sets tool trust and approves", async () => {
    const onTrustChange = vi.fn();
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} onTrustChange={onTrustChange} />,
    );
    inst.stdin.write("a");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTrustChange).toHaveBeenCalledWith("read_file", "tool");
    expect(defaultProps.addResult).toHaveBeenCalledWith("Approved by user");
  });

  it("s key sets session trust and approves", async () => {
    const onTrustChange = vi.fn();
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} onTrustChange={onTrustChange} />,
    );
    inst.stdin.write("s");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTrustChange).toHaveBeenCalledWith("read_file", "session");
    expect(defaultProps.addResult).toHaveBeenCalledWith("Approved by user");
  });

  it("e key enters edit mode", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("e");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const frame = inst.lastFrame() ?? "";
    expect(frame).toContain("Edit args");
    expect(frame).toContain("Enter to submit");
    expect(frame).toContain("Esc to cancel");
  });

  it("hides edit option when allowEdit=false", async () => {
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} allowEdit={false} />,
    );
    const frame = inst.lastFrame() ?? "";

    expect(frame).toContain("[Y]");
    expect(frame).toContain("[N]");
    expect(frame).not.toContain("[E]");
  });

  it("hides trust options when showTrustOptions=false", async () => {
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} showTrustOptions={false} />,
    );
    const frame = inst.lastFrame() ?? "";

    expect(frame).toContain("[Y]");
    expect(frame).not.toContain("[A]");
    expect(frame).not.toContain("[S]");
  });

  it("renders null after approval (resolved state)", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("y");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const frame = inst.lastFrame() ?? "";
    expect(frame).not.toContain("[Y]");
    expect(frame).not.toContain("Allow");
  });

  it("ignores key presses after resolving", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("y");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Try pressing n after already approved
    inst.stdin.write("n");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // addResult called once for approval, not again for rejection
    expect(defaultProps.addResult).toHaveBeenCalledTimes(1);
  });

  it("renders custom labels", async () => {
    const inst = await renderFrame(
      <ToolApproval
        {...defaultProps}
        labels={{ approve: "Yes", reject: "No", edit: "Modify" }}
      />,
    );
    const frame = inst.lastFrame() ?? "";

    expect(frame).toContain("Yes");
    expect(frame).toContain("No");
    expect(frame).toContain("Modify");
  });

  it("shows countdown when autoRejectTimeout is set", async () => {
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} autoRejectTimeout={30} />,
    );
    const frame = inst.lastFrame() ?? "";

    expect(frame).toContain("Auto-deny in 30s");
  });

  it("hides edit when argsText is empty", async () => {
    const inst = await renderFrame(
      <ToolApproval {...defaultProps} argsText="" />,
    );
    const frame = inst.lastFrame() ?? "";

    expect(frame).not.toContain("[E]");
  });

  it("handles case-insensitive keys", async () => {
    const inst = await renderFrame(<ToolApproval {...defaultProps} />);
    inst.stdin.write("Y");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultProps.addResult).toHaveBeenCalledWith("Approved by user");
  });
});
