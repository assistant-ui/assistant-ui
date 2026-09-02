import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
  it("reports a synchronous refusal and keeps the controls actionable", async () => {
    let refuses = true;
    const respondToApproval = vi.fn((): Promise<void> => {
      if (refuses) throw new Error("response cannot be mapped");
      return Promise.resolve();
    });

    render(
      <ToolFallbackApproval
        approval={pendingApproval}
        respondToApproval={respondToApproval}
      />,
    );

    fireEvent.click(button("Allow"));

    expect(respondToApproval).toHaveBeenLastCalledWith({ approved: true });
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toBe(
      "response cannot be mapped",
    );
    expect(button("Allow").disabled).toBe(false);
    expect(button("Deny").disabled).toBe(false);

    refuses = false;
    fireEvent.click(button("Deny"));

    expect(respondToApproval).toHaveBeenLastCalledWith({ approved: false });
    expect(button("Allow").disabled).toBe(true);
    expect(button("Deny").disabled).toBe(true);
  });

  it("reports a rejection raised after the response was enqueued", async () => {
    const respondToApproval = vi.fn(
      () => new Promise<void>((_, reject) => reject(new Error("gate expired"))),
    );

    render(
      <ToolFallbackApproval
        approval={pendingApproval}
        respondToApproval={respondToApproval}
      />,
    );

    fireEvent.click(button("Allow"));
    expect(button("Allow").disabled).toBe(true);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("gate expired");
    });
    expect(button("Allow").disabled).toBe(false);
  });

  it("renders the request's prompt", () => {
    render(
      <ToolFallbackApproval
        approval={{ ...pendingApproval, prompt: "Delete the release branch?" }}
        respondToApproval={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("Delete the release branch?")).toBeTruthy();
  });

  it("answers a free-form request with text instead of a fabricated decision", () => {
    const respondToApproval = vi.fn(async () => {});

    render(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "text",
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deny" })).toBeNull();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Which environment?" }),
      {
        target: { value: "staging" },
      },
    );
    fireEvent.click(button("Send"));

    expect(respondToApproval).toHaveBeenCalledWith({ text: "staging" });
  });

  it("keeps the decision controls when a gate also takes a typed answer", () => {
    const respondToApproval = vi.fn(async () => {});

    render(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Delete the release branch?",
          display: "decision",
          allowFreeform: true,
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(button("Allow")).toBeTruthy();
    expect(button("Deny")).toBeTruthy();
    // A typed note must not be submittable on its own here: a bare answer
    // resolves as approved, which would authorize the call.
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), {
      target: { value: "not this one" },
    });
    fireEvent.click(button("Deny"));

    expect(respondToApproval).toHaveBeenCalledWith({
      approved: false,
      text: "not this one",
    });
  });

  it("never fabricates a decision for a select request that declares no options", () => {
    render(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "select",
        }}
        respondToApproval={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("Which environment?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deny" })).toBeNull();
  });

  it("does not add a refusal to a question that declares its own options", () => {
    render(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "select",
          options: [
            { id: "staging", kind: "_staging", label: "Staging" },
            { id: "prod", kind: "_prod", label: "Production" },
          ],
        }}
        respondToApproval={vi.fn(async () => {})}
      />,
    );

    expect(button("Staging")).toBeTruthy();
    expect(button("Production")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Deny" })).toBeNull();
  });
});
