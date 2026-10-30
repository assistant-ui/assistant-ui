// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { initialCheckoutState, type Checkout } from "@/lib/checkout/protocol";
import { AgentMarks, AgentStatus } from "./agent-status";

afterEach(cleanup);

const checkout = (
  agent: Partial<Checkout.State["agent"]> = {},
): CheckoutContextValue => {
  const state = initialCheckoutState();
  return {
    state: { ...state, agent: { ...state.agent, ...agent } },
    session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
    url: "http://localhost/test",
    agentPresent: false,
    degraded: false,
    openInputs: [],
    plan: undefined,
    planPending: false,
    progress: { done: 0, total: 0 },
    attentionKey: "",
    connection: {} as CheckoutContextValue["connection"],
    commands: {} as CheckoutContextValue["commands"],
  };
};

const toggle = () =>
  screen.getByRole("button", { name: "What it shares and how to stop" });

describe("the command explanation on the connect page", () => {
  it("says what setup-agent is next to the prompt", () => {
    render(<AgentStatus checkout={checkout()} inline />);
    const section = screen.getByRole("region", { name: "Connect agent" });
    expect(section.textContent).toContain("npx setup-agent");
    expect(section.textContent).toContain(
      "is a CLI from npm that relays messages between your agent and this page.",
    );
    expect(section.textContent).toContain(
      "Your agent does the reading and editing",
    );
  });

  it("keeps the detail closed until asked, then says what is shared and how to stop", () => {
    render(<AgentStatus checkout={checkout()} inline />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(toggle());
    const dialog = within(screen.getByRole("dialog"));
    for (const term of [
      "On your machine",
      "What this page sees",
      "What this page sends",
      "Who can use the link",
      "How to stop",
    ]) {
      expect(dialog.getByText(term)).toBeDefined();
    }
    expect(dialog.getByText(/Your project's folder path/)).toBeDefined();
    expect(dialog.getByText(/Anyone with the link/)).toBeDefined();
    expect(dialog.getByText("setup-agent stream")).toBeDefined();
  });

  it("is gone once the agent has connected", () => {
    render(
      <AgentStatus
        checkout={{
          ...checkout({ lastSeenAt: 1, connected: true }),
          agentPresent: true,
        }}
        inline
      />,
    );
    expect(screen.queryByText(/relays messages/)).toBeNull();
  });
});

describe("AgentMarks", () => {
  it("names every supported agent in visible text", () => {
    render(<AgentMarks />);
    const list = screen.getByRole("list", { name: "Supported coding agents" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Claude Code", "Codex", "Cursor", "Gemini CLI", "OpenCode"]);
    expect(list.hasAttribute("tabindex")).toBe(false);
  });
});
