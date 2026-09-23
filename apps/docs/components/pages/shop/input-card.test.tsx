// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { InputCard } from "./input-card";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);

describe("InputCard", () => {
  it("starts text answers with the agent's default", async () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    const checkout: CheckoutContextValue = {
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
    };
    const input: Checkout.Input = {
      id: "project",
      kind: "text",
      phase: "planning",
      prompt: "Which project?",
      default: "apps/web",
      optional: false,
      status: "open",
      createdAt: 1,
    };

    render(
      <WizardHost>
        <InputCard input={input} checkout={checkout} />
      </WizardHost>,
    );

    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Which project?",
      }).value,
    ).toBe("apps/web");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({
        inputId: "project",
        answer: "apps/web",
      }),
    );
  });
});

describe("InputCard secret guard", () => {
  const checkoutWith = (commands: Record<string, unknown>) =>
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
      commands: commands as unknown as CheckoutContextValue["commands"],
    }) satisfies CheckoutContextValue;
  const input: Checkout.Input = {
    id: "key",
    kind: "text",
    phase: "installing",
    prompt: "Paste your OpenAI API key.",
    optional: false,
    status: "open",
    createdAt: 1,
  };

  it("refuses a key with a message to the agent and dismisses the question", async () => {
    const message = vi.fn().mockResolvedValue(undefined);
    const dismiss = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <InputCard
          input={input}
          checkout={checkoutWith({
            "checkout/message": message,
            "checkout/dismiss": dismiss,
          })}
        />
      </WizardHost>,
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ask the safe way" }));

    await waitFor(() =>
      expect(dismiss).toHaveBeenCalledWith({ inputId: "key" }),
    );
    expect(message).toHaveBeenCalledWith({
      text: expect.stringContaining("--preset llm-provider"),
    });
    expect(message.mock.invocationCallOrder[0]).toBeLessThan(
      dismiss.mock.invocationCallOrder[0]!,
    );
  });

  it("lets the user type when the question is not a secret after all", () => {
    render(
      <WizardHost>
        <InputCard input={input} checkout={checkoutWith({})} />
      </WizardHost>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "It is not a secret, let me type it",
      }),
    );

    expect(
      screen.getByRole("textbox", { name: "Paste your OpenAI API key." }),
    ).toBeDefined();
  });
});

describe("InputCard without a prompt", () => {
  it("still gives the user a line to answer under", () => {
    render(
      <WizardHost>
        <InputCard
          input={{
            id: "blank",
            kind: "text",
            phase: "planning",
            prompt: "   ",
            optional: false,
            status: "open",
            createdAt: 1,
          }}
          checkout={
            {
              commands: {},
            } as unknown as CheckoutContextValue
          }
        />
      </WizardHost>,
    );
    expect(
      screen.getByRole("textbox", { name: "Your agent needs an answer." }),
    ).toBeDefined();
  });
});
