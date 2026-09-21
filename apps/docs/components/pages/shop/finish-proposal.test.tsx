// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinishProposal } from "./finish-proposal";
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

const setup = (state: Checkout.State) => {
  const finish = vi.fn().mockResolvedValue(undefined);
  const onClosed = vi.fn();
  render(
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
    />,
  );
  return { finish, onClosed };
};

describe("FinishProposal", () => {
  it("closes in one click when the user has not followed up", async () => {
    const { finish, onClosed } = setup(proposed());
    expect(screen.getByText("Test agent finished")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close setup" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Close setup" }));
    expect(finish).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("You sent a message after");
    fireEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (button) => button.textContent === "Close setup",
      )!,
    );
    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("does not ask when the message came before the proposal", async () => {
    const { finish } = setup(
      proposed([
        {
          id: "l1",
          role: "user",
          phase: "installing",
          at: 9,
          text: "Use pnpm",
        },
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close setup" }));
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
  });
});
