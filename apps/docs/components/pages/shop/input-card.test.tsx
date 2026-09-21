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

    render(<InputCard input={input} checkout={checkout} />);

    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Which project?",
      }).value,
    ).toBe("apps/web");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({
        inputId: "project",
        answer: "apps/web",
      }),
    );
  });
});
