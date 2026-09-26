// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { ChoiceInputCard } from "./choice-input-card";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);

const checkoutWith = (
  answer: CheckoutContextValue["commands"]["checkout/answer"],
) =>
  ({
    state: undefined,
    session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
    url: "https://checkout.test/session",
    agentPresent: true,
    degraded: false,
    openInputs: [],
    plan: undefined,
    planPending: false,
    progress: { done: 0, total: 0 },
    attentionKey: "",
    connection: {} as CheckoutContextValue["connection"],
    commands: {
      "checkout/answer": answer,
    } as unknown as CheckoutContextValue["commands"],
  }) satisfies CheckoutContextValue;

const input = (overrides: Partial<Checkout.Input>): Checkout.Input => ({
  id: "q1",
  kind: "choice",
  phase: "planning",
  prompt: "Which integrations?",
  options: [
    { id: "slack", label: "Slack", icon: "message" },
    { id: "email", label: "Email", icon: "mail" },
  ],
  optional: false,
  status: "open",
  createdAt: 1,
  ...overrides,
});

const next = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Next" });

describe("ChoiceInputCard", () => {
  it("offers radios that answer one option id", () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <ChoiceInputCard input={input({})} checkout={checkoutWith(answer)} />
      </WizardHost>,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.click(screen.getByRole("radio", { name: "Slack" }));
    fireEvent.click(next());
    expect(answer).toHaveBeenCalledWith({ inputId: "q1", answer: "slack" });
  });

  it("offers checkboxes that answer every checked option in order", () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <ChoiceInputCard
          input={input({ multiple: true })}
          checkout={checkoutWith(answer)}
        />
      </WizardHost>,
    );
    expect(screen.queryByRole("radio")).toBeNull();
    expect(
      screen.getByRole("group", { name: "Which integrations?" }),
    ).toBeTruthy();
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Email" }));
    expect(next().disabled).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Slack" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Email" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Email" }));
    fireEvent.click(next());
    expect(answer).toHaveBeenCalledWith({
      inputId: "q1",
      answer: '["slack","email"]',
    });
  });

  it("adds the user's own text as an entry and waits for it", () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <ChoiceInputCard
          input={input({ multiple: true })}
          checkout={checkoutWith(answer)}
        />
      </WizardHost>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Slack" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Something else/ }));
    expect(next().disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Your own answer" }), {
      target: { value: " Discord " },
    });
    fireEvent.click(next());
    expect(answer).toHaveBeenCalledWith({
      inputId: "q1",
      answer: '["slack","Discord"]',
    });
  });

  it("starts with the default checked", () => {
    render(
      <WizardHost>
        <ChoiceInputCard
          input={input({ multiple: true, default: "email" })}
          checkout={checkoutWith(vi.fn())}
        />
      </WizardHost>,
    );
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Email" }).checked,
    ).toBe(true);
    expect(next().disabled).toBe(false);
  });
});
