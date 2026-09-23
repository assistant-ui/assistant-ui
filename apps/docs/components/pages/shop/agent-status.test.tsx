// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentStatus,
  agentPhase,
  agentPrompt,
  useAgentIdentity,
} from "./agent-status";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

afterEach(cleanup);

const { useShippingMethod } = vi.hoisted(() => ({
  useShippingMethod: vi.fn(),
}));
vi.mock("@/lib/catalog/shipping-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/catalog/shipping-store")
  >()),
  useShippingMethod,
}));
beforeEach(() => {
  useShippingMethod.mockReturnValue({ id: "codex", name: "Codex", detail: "" });
});

const context = (
  state: Checkout.State,
  agentPresent = false,
): CheckoutContextValue => ({
  state,
  session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
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

describe("agent connection", () => {
  it.each([null, "unknown"])(
    "uses the selected agent for both name and mark when kind is %s",
    (kind) => {
      const state = initialCheckoutState();
      state.agent.kind = kind;
      const { result } = renderHook(() => useAgentIdentity(context(state)));
      expect(result.current).toEqual({ kind: "codex", name: "Codex" });
      const { container } = render(
        <AgentStatus checkout={context(state)} compact />,
      );
      expect(screen.getByText("Codex")).toBeDefined();
      expect(container.querySelector('[style*="openai.svg"]')).not.toBeNull();
      expect(container.querySelector(".lucide-bot")).toBeNull();
    },
  );

  it.each([
    ["claude", "Claude Code"],
    ["cursor", "Cursor"],
    ["gemini", "Gemini CLI"],
  ])("prefers the connected %s agent over the selection", (kind, name) => {
    const state = initialCheckoutState();
    state.agent.kind = kind!;
    const { result } = renderHook(() => useAgentIdentity(context(state)));
    expect(result.current).toEqual({ kind, name });
  });

  it("keeps the sidebar summary compact while retaining full connection help", () => {
    const checkout = context(initialCheckoutState());
    const { rerender } = render(<AgentStatus checkout={checkout} compact />);

    expect(screen.getByRole("status").textContent).toBe("Not connected yet");
    expect(screen.queryByRole("button", { name: "Copy prompt" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Coding agent" })).toBeNull();
    expect(screen.queryByText(/^Install assistant-ui\./)).toBeNull();

    rerender(<AgentStatus checkout={checkout} />);
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeDefined();
    expect(screen.getByText(/^Install assistant-ui\./)).toBeDefined();
  });

  it("retains reconnect instructions in the full connection view", () => {
    const state = initialCheckoutState();
    state.agent.lastSeenAt = 1;
    const checkout = context(state);
    const { rerender } = render(<AgentStatus checkout={checkout} compact />);

    expect(screen.getByRole("status").textContent).toContain("Gone quiet");
    expect(
      screen.queryByRole("button", { name: "Show the prompt" }),
    ).toBeNull();

    rerender(<AgentStatus checkout={checkout} />);
    fireEvent.click(screen.getByRole("button", { name: "Show the prompt" }));
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeDefined();
  });

  it("waits automatically and advances on the agent's first ping and connection", () => {
    const state = initialCheckoutState();
    const { rerender } = render(
      <AgentStatus checkout={context(state)} inline />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Waiting for connection…",
    );
    const detected = { ...state, agent: { ...state.agent, introducedAt: 1 } };
    rerender(<AgentStatus checkout={context(detected)} inline />);
    expect(screen.getByRole("status").textContent).toBe(
      "Agent detected. Connecting…",
    );
    expect(agentPhase(context(detected))).toBe("waiting");
    expect(
      agentPhase(
        context(
          {
            ...detected,
            agent: { ...detected.agent, lastSeenAt: 2, connected: true },
          },
          true,
        ),
      ),
    ).toBe("connected");
  });
});

describe("installation prompt", () => {
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

  it("uses the selected products before the server snapshot arrives", () => {
    render(<AgentStatus checkout={context(initialCheckoutState())} inline />);
    expect(screen.getByText(/^Install assistant-ui\./)).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeDefined();
    expect(screen.queryByText(/leading !/)).toBeNull();
  });
});

describe("begin plan", () => {
  const connected = () => {
    const state = initialCheckoutState();
    state.agent = { ...state.agent, lastSeenAt: 2, connected: true };
    return context(state, true);
  };

  it("starts only on click and removes the action after planning begins", async () => {
    const checkout = connected();
    let resolve!: () => void;
    const begin = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    checkout.commands = {
      "checkout/begin-plan": begin,
    } as unknown as CheckoutContextValue["commands"];
    const { rerender } = render(<AgentStatus checkout={checkout} inline />);
    expect(begin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Begin plan" }));
    expect(begin).toHaveBeenCalledOnce();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Starting…" })
        .disabled,
    ).toBe(true);
    resolve();
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: "Begin plan" })
          .disabled,
      ).toBe(false),
    );
    rerender(
      <AgentStatus
        checkout={{
          ...checkout,
          state: { ...checkout.state!, status: "planning" },
        }}
        inline
      />,
    );
    expect(screen.queryByRole("button", { name: "Begin plan" })).toBeNull();
  });

  it("keeps the action available for retry when starting fails", async () => {
    const checkout = connected();
    const begin = vi.fn().mockRejectedValue(new Error("offline"));
    checkout.commands = {
      "checkout/begin-plan": begin,
    } as unknown as CheckoutContextValue["commands"];
    render(<AgentStatus checkout={checkout} inline />);
    fireEvent.click(screen.getByRole("button", { name: "Begin plan" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Please try again",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Begin plan" })
        .disabled,
    ).toBe(false);
  });
});
