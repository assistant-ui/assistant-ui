// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AgentStatus, agentPhase, agentPrompt } from "./agent-status";
import { initialCheckoutState, type Checkout } from "@/lib/checkout/protocol";
import type { CheckoutContextValue } from "@/components/checkout-provider";

afterEach(cleanup);

const context = (
  state: Checkout.State,
  agentPresent = false,
): CheckoutContextValue => ({
  state,
  session: {
    id: "test",
    products: ["assistant-ui"],
    startedAt: 1,
    link: "testLink1234",
  },
  url: "http://localhost/test",
  agentPresent,
  degraded: false,
  openInputs: [],
  plan: undefined,
  planPending: false,
  progress: { done: 0, total: 0 },
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {} as CheckoutContextValue["commands"],
});

describe("agent phase", () => {
  it("advances on the agent's first ping and connection", () => {
    const state = initialCheckoutState();
    expect(agentPhase(context(state))).toBe("unconnected");
    const detected = { ...state, agent: { ...state.agent, introducedAt: 1 } };
    expect(agentPhase(context(detected))).toBe("waiting");
    const seen = {
      ...detected,
      agent: { ...detected.agent, lastSeenAt: 2, connected: true },
    };
    expect(agentPhase(context(seen, true))).toBe("connected");
    expect(agentPhase(context(seen, false))).toBe("quiet");
  });
});

describe("reconnect prompt", () => {
  it.each([
    [["assistant-ui"], "assistant-ui"],
    [["assistant-ui", "Assistant Cloud"], "assistant-ui and Assistant Cloud"],
    [
      ["assistant-ui", "Assistant Cloud", "DevTools"],
      "assistant-ui, Assistant Cloud, and DevTools",
    ],
  ])("names %j naturally", (products, list) => {
    expect(
      agentPrompt("https://example.test/session", products as string[]),
    ).toBe(
      `Install ${list}.\nRun \`npx setup-agent https://example.test/session\` to fetch installation steps.`,
    );
  });

  it("offers the prompt that brings back an agent that went quiet", () => {
    const state = initialCheckoutState();
    state.agent = { ...state.agent, lastSeenAt: 2, connected: false };
    render(<AgentStatus checkout={context(state)} inline />);
    expect(screen.getByText(/picks up where it left off/)).toBeDefined();
    expect(screen.getByText(/^Install assistant-ui\./)).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeDefined();
  });

  it("shows nothing to paste while the agent is connected", () => {
    const state = initialCheckoutState();
    state.agent = { ...state.agent, lastSeenAt: 2, connected: true };
    render(<AgentStatus checkout={context(state, true)} />);
    expect(screen.queryByRole("button", { name: "Copy prompt" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Connected");
  });
});
