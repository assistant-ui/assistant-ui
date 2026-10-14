// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "../../shared/checkout-provider";
import type { Checkout } from "../../../lib/checkout/protocol";
import { EntryPointInputCard } from "./entry-point-input-card";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);
const options: Checkout.ChoiceOption[] = [
  {
    id: "ticket",
    label: "Beside the ticket",
    description: "Draft replies while reading the selected support ticket.",
    entryPoint: {
      formFactor: "sidebar",
      placement: "Ticket detail",
      trigger: "Draft reply in the ticket toolbar",
      recommended: true,
    },
  },
  {
    id: "inbox",
    label: "Beside the inbox",
    description: "Review several tickets from the inbox list.",
    entryPoint: {
      formFactor: "sidebar",
      placement: "Inbox list",
      trigger: "Assist in the inbox toolbar",
    },
  },
];
const input: Checkout.Input = {
  id: "q1",
  kind: "entry-point",
  phase: "planning",
  prompt: "Where should support assistants draft replies?",
  optional: false,
  status: "open",
  createdAt: 1,
  options,
};
const checkout = (answer = vi.fn().mockResolvedValue(undefined)) =>
  ({
    commands: { "checkout/answer": answer },
  }) as unknown as CheckoutContextValue;
const next = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Next" });

describe("EntryPointInputCard", () => {
  it("shows contextual placement and access with a recommendation, and sends one stable id", () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <EntryPointInputCard input={input} checkout={checkout(answer)} />
      </WizardHost>,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText("Sidebar · Recommended")).toBeDefined();
    expect(screen.getByText(/Ticket detail · Draft reply/)).toBeDefined();
    const radio = screen.getByRole("radio", { name: "Beside the ticket" });
    const described = radio
      .getAttribute("aria-describedby")!
      .split(" ")
      .map((id) => document.getElementById(id)!.textContent)
      .join(" ");
    expect(described).toContain(
      "Draft replies while reading the selected support ticket.",
    );
    expect(described).toContain("Sidebar · Recommended");
    expect(described).toContain(
      "Ticket detail · Draft reply in the ticket toolbar",
    );
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Beside the inbox" }));
    fireEvent.click(next());
    expect(answer).toHaveBeenCalledWith({ inputId: "q1", answer: "inbox" });
  });

  it("restores a persisted selection and its note when mounted again", () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardHost>
        <EntryPointInputCard
          input={{
            ...input,
            answer: "ticket",
            note: "Keep the ticket visible",
          }}
          checkout={checkout(answer)}
        />
      </WizardHost>,
    );
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: "Beside the ticket" })
        .checked,
    ).toBe(true);
    fireEvent.click(next());
    expect(answer).toHaveBeenCalledWith({
      inputId: "q1",
      answer: "ticket",
      note: "Keep the ticket visible",
    });
  });

  it("uses an explicit default, while a recommendation alone does not preselect", () => {
    render(
      <WizardHost>
        <EntryPointInputCard
          input={{ ...input, default: "inbox" }}
          checkout={checkout()}
        />
      </WizardHost>,
    );
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: "Beside the inbox" })
        .checked,
    ).toBe(true);
    expect(next().disabled).toBe(false);
  });
});
