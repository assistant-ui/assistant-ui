import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ReadonlyThreadProvider,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ announce: vi.fn() }));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();

  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      announceForAccessibility: h.announce,
    },
  };
});

vi.mock("uniwind", async (importOriginal) => ({
  ...(await importOriginal<typeof import("uniwind")>()),
  withUniwind: (Component: unknown) => Component,
}));

import { ToolFallback, ToolFallbackApproval } from "./tool-fallback";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const pendingApproval = { id: "req_1" };

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

const show = async (element: ReactElement) => {
  await act(async () => root.render(element));
};

const renderTool = (props: Partial<ToolCallMessagePartProps> = {}) =>
  show(
    <ToolFallback
      {...({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: '{"query":"docs"}',
        status: { type: "requires-action", reason: "interrupt" },
        addResult: vi.fn(),
        resume: vi.fn(),
        respondToApproval: vi.fn(async () => {}),
        ...props,
      } as ToolCallMessagePartProps)}
    />,
  );

const button = (name: string) =>
  container.querySelector<HTMLElement>(`[role="button"][aria-label="${name}"]`);

const buttonNames = () =>
  [...container.querySelectorAll('[role="button"]')].map((element) =>
    element.getAttribute("aria-label"),
  );

const isDisabled = (name: string) =>
  button(name)?.getAttribute("aria-disabled") === "true";

const press = async (name: string) => {
  const target = button(name);
  if (!target) throw new Error(`no ${name} button`);
  await act(async () => target.click());
};

const type = async (name: string, value: string) => {
  const input = container.querySelector<HTMLTextAreaElement>(
    `textarea[aria-label="${name}"]`,
  );
  if (!input) throw new Error(`no ${name} field`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve)));

describe("ToolFallback", () => {
  it.each([
    [{ type: "running" }, "Running search…"],
    [{ type: "complete" }, "Used search"],
    [{ type: "requires-action", reason: "tool-calls" }, "Waiting on search"],
    [{ type: "incomplete", reason: "cancelled" }, "Cancelled search"],
    [{ type: "incomplete", reason: "error" }, "Failed search"],
    [{ type: "incomplete", reason: "length" }, "Failed search"],
  ] as const)("labels the %o outcome", async (status, label) => {
    await renderTool({ status });

    expect(container.textContent).toContain(label);
  });

  it("renders the reason an incomplete call carries", async () => {
    await renderTool({
      status: { type: "incomplete", reason: "cancelled", error: "stopped" },
    });
    expect(container.textContent).toBe(
      "Cancelled searchCancelled reason:stopped",
    );

    await renderTool({
      status: {
        type: "incomplete",
        reason: "error",
        error: new Error("tool failed"),
      },
    });
    expect(container.textContent).toBe("Failed searchError:Error: tool failed");
  });

  it("renders no reason for an empty error", async () => {
    await renderTool({
      status: { type: "incomplete", reason: "error", error: "" },
    });

    expect(container.textContent).toBe("Failed search");
  });

  it("shows the arguments while a decision is pending and drops them once it resolves", async () => {
    await renderTool({ approval: pendingApproval });
    expect(container.textContent).toContain('{"query":"docs"}');
    expect(buttonNames()).toEqual(["Allow", "Deny"]);

    await renderTool({ approval: { ...pendingApproval, approved: true } });
    expect(container.textContent).toBe("Waiting on search");

    await renderTool({
      approval: { ...pendingApproval, resolution: "expired" },
    });
    expect(buttonNames()).toEqual([]);
  });

  it("does not offer a fabricated result for an unprojected interrupt", async () => {
    await renderTool();

    expect(buttonNames()).toEqual([]);
  });

  it("shows the prompt without controls when the thread cannot answer", async () => {
    await show(
      <ReadonlyThreadProvider messages={[]}>
        <ToolFallback
          {...({
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
            argsText: '{"query":"docs"}',
            status: { type: "requires-action", reason: "interrupt" },
            approval: {
              id: "approval-1",
              prompt: "Deploy to production?",
              options: [
                { id: "once", kind: "allow-once" },
                { id: "reject", kind: "reject-once" },
              ],
            },
            addResult: vi.fn(),
            resume: vi.fn(),
            respondToApproval: vi.fn(async () => {}),
          } as ToolCallMessagePartProps)}
        />
      </ReadonlyThreadProvider>,
    );

    expect(container.textContent).toContain("Deploy to production?");
    expect(buttonNames()).toEqual([]);
  });

  it("renders no approval view for an interrupt without a prompt when the thread cannot answer", async () => {
    await show(
      <ReadonlyThreadProvider messages={[]}>
        <ToolFallback
          {...({
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
            argsText: '{"query":"docs"}',
            status: { type: "requires-action", reason: "interrupt" },
            interrupt: { type: "human", payload: {} },
            addResult: vi.fn(),
            resume: vi.fn(),
            respondToApproval: vi.fn(async () => {}),
          } as ToolCallMessagePartProps)}
        />
      </ReadonlyThreadProvider>,
    );

    expect(container.querySelector(".aui-tool-fallback-approval")).toBeNull();
    expect(buttonNames()).toEqual([]);
  });

  it("responds to a projected approval", async () => {
    const respondToApproval = vi.fn(async () => {});
    await renderTool({ approval: pendingApproval, respondToApproval });

    await press("Allow");

    expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
  });

  it("resumes a part-level interrupt", async () => {
    const resume = vi.fn();
    await renderTool({ interrupt: { type: "human", payload: {} }, resume });

    await press("Deny");

    expect(resume).toHaveBeenCalledWith({ approved: false });
  });

  it("keeps the addResult fallback for tool-call actions", async () => {
    const addResult = vi.fn();
    await renderTool({
      status: { type: "requires-action", reason: "tool-calls" },
      addResult,
    });

    await press("Allow");

    expect(addResult).toHaveBeenCalledWith("Approved by user");
  });
});

describe("ToolFallbackApproval", () => {
  it("renders declared options with their labels, allow kinds first", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          options: [
            { id: "deny", kind: "reject-once" },
            { id: "red", kind: "_red", label: "Red" },
            {
              id: "session",
              kind: "allow-always",
              label: "Allow this session",
            },
            { id: "once", kind: "allow-once" },
          ],
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual([
      "Allow this session",
      "Allow",
      "Red",
      "Deny",
    ]);

    await press("Allow this session");

    expect(respondToApproval).toHaveBeenCalledExactlyOnceWith({
      optionId: "session",
    });
  });

  it("answers a custom-kind option as approved", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          options: [{ id: "escalate", kind: "_escalate" }],
        }}
        respondToApproval={respondToApproval}
      />,
    );

    await press("escalate");

    expect(respondToApproval).toHaveBeenCalledWith({
      optionId: "escalate",
      approved: true,
    });
  });

  it("keeps a refusal path when the declared options offer none", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          options: [
            { id: "once", kind: "allow-once" },
            { id: "always", kind: "allow-always" },
          ],
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual(["Allow", "Always allow", "Deny"]);

    await press("Deny");

    expect(respondToApproval).toHaveBeenCalledWith({ approved: false });
  });

  it("renders a declared persistent refusal instead of adding one", async () => {
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          options: [
            { id: "once", kind: "allow-once" },
            { id: "never", kind: "reject-always" },
          ],
        }}
        respondToApproval={vi.fn(async () => {})}
      />,
    );

    expect(buttonNames()).toEqual(["Allow", "Always deny"]);
  });

  it("confirms an option with its grants before it resolves", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          options: [
            { id: "once", kind: "allow-once" },
            {
              id: "always",
              kind: "allow-always",
              confirm: true,
              grants: ["npm test *"],
            },
            { id: "deny", kind: "reject-once" },
          ],
        }}
        respondToApproval={respondToApproval}
        argsText='{"command":"npm test"}'
      />,
    );

    await press("Always allow");
    expect(respondToApproval).not.toHaveBeenCalled();
    expect(container.textContent).toContain('{"command":"npm test"}');
    expect(container.textContent).toContain("Always allow?");
    expect(container.textContent).toContain("npm test *");

    await press("Back");
    expect(buttonNames()).toEqual(["Allow", "Always allow", "Deny"]);

    await press("Always allow");
    await press("Confirm");

    expect(respondToApproval).toHaveBeenCalledExactlyOnceWith({
      optionId: "always",
    });
  });

  it("answers a free-form question with text instead of a fabricated decision", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "text",
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual(["Send"]);

    await type("Which environment?", "staging");
    await press("Send");

    expect(respondToApproval).toHaveBeenCalledWith({ text: "staging" });
  });

  it("sends an empty answer to a text question as the answer it is", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{ ...pendingApproval, prompt: "Notes?", display: "text" }}
        respondToApproval={respondToApproval}
      />,
    );

    await press("Send");

    expect(respondToApproval).toHaveBeenCalledWith({ text: "" });
  });

  it("dismisses a text question that accepts it without the typed draft", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "text",
          dismissible: true,
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual(["Send", "Dismiss"]);

    await type("Which environment?", "stag");
    await press("Dismiss");

    expect(respondToApproval).toHaveBeenCalledExactlyOnceWith({
      approved: false,
    });
    expect(isDisabled("Send")).toBe(true);
  });

  it("offers only the declared answers and the dismissal on a select question", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "select",
          dismissible: true,
          options: [
            { id: "0", kind: "_0", label: "Staging" },
            { id: "1", kind: "_1", label: "Production" },
          ],
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual(["Staging", "Production", "Dismiss"]);

    await press("Production");

    expect(respondToApproval).toHaveBeenCalledWith({
      optionId: "1",
      approved: true,
    });
  });

  it("never fabricates a decision for a select question that declares no options", async () => {
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Which environment?",
          display: "select",
        }}
        respondToApproval={vi.fn(async () => {})}
      />,
    );

    expect(container.textContent).toBe("Which environment?");
    expect(buttonNames()).toEqual([]);
  });

  it("sends a typed note with a decision that accepts one", async () => {
    const respondToApproval = vi.fn(async () => {});
    await show(
      <ToolFallbackApproval
        approval={{
          ...pendingApproval,
          prompt: "Delete the release branch?",
          allowFreeform: true,
        }}
        respondToApproval={respondToApproval}
      />,
    );

    expect(buttonNames()).toEqual(["Allow", "Deny"]);

    await type("Note", "not this one");
    await press("Deny");

    expect(respondToApproval).toHaveBeenCalledWith({
      approved: false,
      text: "not this one",
    });
  });

  it("holds the controls while a response is in flight", async () => {
    const respondToApproval = vi.fn(() => new Promise<void>(() => {}));
    await show(
      <ToolFallbackApproval
        approval={pendingApproval}
        respondToApproval={respondToApproval}
      />,
    );

    await press("Allow");
    await press("Allow");
    await press("Deny");

    expect(respondToApproval).toHaveBeenCalledTimes(1);
    expect(isDisabled("Allow")).toBe(true);
    expect(isDisabled("Deny")).toBe(true);
  });

  it("reports a rejected response and reopens the controls", async () => {
    const respondToApproval = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("gate expired"))
      .mockResolvedValue();
    await show(
      <ToolFallbackApproval
        approval={pendingApproval}
        respondToApproval={respondToApproval}
      />,
    );

    await press("Allow");
    await settle();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "gate expired",
    );
    expect(h.announce).toHaveBeenCalledExactlyOnceWith("gate expired");
    expect(isDisabled("Allow")).toBe(false);

    await press("Deny");

    expect(respondToApproval).toHaveBeenLastCalledWith({ approved: false });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
