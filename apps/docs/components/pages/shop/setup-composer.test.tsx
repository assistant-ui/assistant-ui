// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupComposer } from "./setup-composer";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

afterEach(cleanup);

const modelInput = (
  overrides: Partial<Checkout.Input> = {},
): Checkout.Input => ({
  id: "model",
  kind: "model",
  phase: "planning",
  prompt: "Which model?",
  status: "answered",
  optional: false,
  createdAt: 1,
  answeredAt: 2,
  answer: JSON.stringify({ provider: "openai", model: "gpt-5.6-luna" }),
  options: [
    { id: "openai", label: "OpenAI", icon: "openai" },
    { id: "anthropic", label: "Anthropic", icon: "claude" },
  ],
  ...overrides,
});

const context = (inputs: Checkout.Input[] = []): CheckoutContextValue => ({
  state: {
    ...initialCheckoutState(),
    createdAt: 1,
    inputs,
    agent: { ...initialCheckoutState().agent, kind: "codex" },
  },
  session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
  url: "http://localhost/test",
  degraded: false,
  agentPresent: true,
  openInputs: [],
  plan: undefined,
  planPending: false,
  progress: { done: 0, total: 0 },
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {
    "checkout/message": vi.fn().mockResolvedValue(undefined),
  } as unknown as CheckoutContextValue["commands"],
});

describe("SetupComposer model label", () => {
  it("shows the agent until a model is selected, then updates without losing the draft", () => {
    const { rerender, container } = render(
      <SetupComposer checkout={context()} />,
    );
    expect(screen.getByText("Codex")).toBeDefined();
    const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Message your agent",
    });
    fireEvent.change(textarea, { target: { value: "Keep my existing theme" } });
    rerender(<SetupComposer checkout={context([modelInput()])} />);
    expect(screen.getByText("gpt-5.6-luna")).toBeDefined();
    expect(screen.queryByText("Codex")).toBeNull();
    expect(
      screen.getByTitle("Selected setup model: OpenAI · gpt-5.6-luna"),
    ).toBeDefined();
    expect(container.querySelector('[style*="openai.svg"]')).not.toBeNull();
    expect(textarea.value).toBe("Keep my existing theme");
    expect(document.activeElement).toBe(textarea);
    rerender(<SetupComposer checkout={context()} />);
    expect(screen.getByText("Codex")).toBeDefined();
    expect(screen.queryByText("gpt-5.6-luna")).toBeNull();
  });

  it("uses the latest answered model even when answers arrive out of order", () => {
    const latest = modelInput({
      id: "latest",
      answeredAt: 10,
      answer: JSON.stringify({ provider: "anthropic", model: "claude-test" }),
    });
    const { container } = render(
      <SetupComposer checkout={context([latest, modelInput()])} />,
    );
    expect(screen.getByText("claude-test")).toBeDefined();
    expect(
      screen.getByTitle("Selected setup model: Anthropic · claude-test"),
    ).toBeDefined();
    expect(screen.queryByText("gpt-5.6-luna")).toBeNull();
    expect(container.querySelector('[style*="openai.svg"]')).toBeNull();
    expect(
      screen.getByText("claude-test").parentElement?.querySelector("svg"),
    ).not.toBeNull();
  });

  it.each([
    { status: "open" as const },
    { status: "dismissed" as const },
    { kind: "text" as const },
    { answer: "invalid JSON" },
  ])(
    "does not replace the confirmed model with $status $kind $answer",
    (overrides) => {
      render(
        <SetupComposer
          checkout={context([
            modelInput(),
            modelInput({ id: "next", answeredAt: 20, ...overrides }),
          ])}
        />,
      );
      expect(screen.getByText("gpt-5.6-luna")).toBeDefined();
    },
  );

  it("supports custom models without provider metadata and still sends messages to the agent", async () => {
    const input = modelInput({
      answer: JSON.stringify({ provider: "custom", model: "org/custom-model" }),
    });
    delete input.options;
    const checkout = context([input]);
    render(<SetupComposer checkout={checkout} />);
    expect(screen.getByText("org/custom-model")).toBeDefined();
    expect(
      screen.getByTitle("Selected setup model: custom · org/custom-model"),
    ).toBeDefined();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Message your agent" }),
      { target: { value: "Please keep my existing backend" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(checkout.commands["checkout/message"]).toHaveBeenCalledWith({
        text: "Please keep my existing backend",
      }),
    );
  });
});
