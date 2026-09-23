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
import { WizardHost } from "./test/wizard-host";
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

const setup = (state: Checkout.State, summary = false) => {
  const finish = vi.fn().mockResolvedValue(undefined);
  const onClosed = vi.fn();
  render(
    <WizardHost>
      <FinishProposal
        agentName="Test agent"
        onClosed={onClosed}
        summary={summary}
        checkout={
          {
            state,
            degraded: false,
            commands: { "checkout/finish": finish },
          } as unknown as CheckoutContextValue
        }
      />
    </WizardHost>,
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

  it("lists the session's steps behind a disclosure", () => {
    const step = (
      id: string,
      title: string,
      status: Checkout.StepStatus,
      note?: string,
    ): Checkout.Step => ({
      id,
      title,
      status,
      createdAt: 1,
      ...(note !== undefined && { note }),
    });
    setup(
      {
        ...proposed(),
        steps: [
          step("s1", "Install @assistant-ui/react", "done"),
          step("s2", "Wire Assistant Cloud", "skipped", "No cloud project yet"),
        ],
      },
      true,
    );
    expect(screen.queryByText("Install @assistant-ui/react")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "See what was added in this session.",
      }),
    );
    expect(screen.getByText("Install @assistant-ui/react")).toBeDefined();
    expect(screen.getByText("Wire Assistant Cloud")).toBeDefined();
    expect(screen.getByText("No cloud project yet")).toBeDefined();
  });

  it("keeps the step list off the banner above the install steps", () => {
    setup({
      ...proposed(),
      steps: [
        { id: "s1", title: "Add the route", status: "active", createdAt: 1 },
      ],
    });
    expect(
      screen.queryByRole("button", { name: /See what was added/ }),
    ).toBeNull();
  });
});
