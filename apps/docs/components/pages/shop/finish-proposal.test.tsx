// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinishProposal } from "./finish-proposal";
import { WizardProvider, type WizardNextBinding } from "./wizard-actions";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

afterEach(cleanup);

const proposed = (log: Checkout.LogEntry[] = []): Checkout.State => ({
  ...initialCheckoutState(),
  status: "installing",
  createdAt: 1,
  completion: { proposedAt: 10 },
  log,
});

function Host({ children }: { children: ReactNode }) {
  const [next, setNext] = useState<WizardNextBinding>();
  return (
    <WizardProvider value={{ formId: "wizard-form", setNext }}>
      {children}
      {next ? (
        <footer>
          <button type="button" disabled={next.disabled} onClick={next.run}>
            {next.label}
          </button>
        </footer>
      ) : null}
    </WizardProvider>
  );
}

const setup = (state: Checkout.State) => {
  const finish = vi.fn().mockResolvedValue(undefined);
  const onClosed = vi.fn();
  render(
    <Host>
      <FinishProposal
        agentName="Test agent"
        onClosed={onClosed}
        checkout={
          {
            state,
            degraded: false,
            commands: { "checkout/finish": finish },
          } as unknown as CheckoutContextValue
        }
      />
    </Host>,
  );
  return { finish, onClosed };
};

describe("FinishProposal", () => {
  it("closes in one click when the user has not followed up", async () => {
    const { finish, onClosed } = setup(proposed());
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(finish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before closing once the user messaged after the proposal", async () => {
    const { finish, onClosed } = setup(
      proposed([
        {
          id: "l1",
          role: "user",
          phase: "installing",
          at: 11,
          text: "Add dark mode too",
        },
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(finish).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("has not picked up your last message");
    fireEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (button) => button.textContent === "Finish anyway",
      )!,
    );
    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("does not ask when the message came before the proposal or the agent picked it up", async () => {
    const { finish } = setup(
      proposed([
        {
          id: "l1",
          role: "user",
          phase: "installing",
          at: 9,
          text: "Use pnpm",
        },
        {
          id: "l2",
          role: "user",
          phase: "installing",
          at: 11,
          acknowledgedAt: 12,
          text: "Add dark mode",
        },
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
  });

  it("links to the dev server the agent left running", () => {
    setup({
      ...proposed(),
      completion: { proposedAt: 10, preview: "http://localhost:3000/chat" },
    });
    const link = screen.getByRole("link", { name: /localhost:3000\/chat/ });
    expect(link.getAttribute("href")).toBe("http://localhost:3000/chat");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("ignores a preview that does not point at this machine", () => {
    setup({
      ...proposed(),
      completion: { proposedAt: 10, preview: "https://example.com" },
    });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Finish" })).toBeDefined();
  });
});
