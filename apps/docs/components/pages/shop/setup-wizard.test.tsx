// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupWizard } from "./setup-wizard";
import {
  currentPlan,
  initialCheckoutState,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

const commands = {
  "checkout/message": vi.fn().mockResolvedValue(undefined),
  "checkout/answer": vi.fn().mockResolvedValue(undefined),
  "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  "checkout/plan": vi.fn().mockResolvedValue(undefined),
  "checkout/begin-plan": vi.fn().mockResolvedValue(undefined),
  "checkout/cancel": vi.fn().mockResolvedValue(undefined),
} as unknown as CheckoutContextValue["commands"];

const context = (
  state: Checkout.State,
  agentPresent = true,
): CheckoutContextValue => ({
  state,
  session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
  url: "http://localhost/test",
  degraded: false,
  agentPresent,
  openInputs: openInputs(state),
  plan: currentPlan(state),
  planPending: planNeedsReview(state),
  progress: stepProgress(state),
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands,
});

const connected = (overrides: Partial<Checkout.State>): Checkout.State => ({
  ...initialCheckoutState(),
  createdAt: 1,
  agent: {
    ...initialCheckoutState().agent,
    lastSeenAt: 1,
    connected: true,
    kind: "claude-code",
  },
  ...overrides,
});

const footer = () => within(screen.getByRole("contentinfo"));

describe("SetupWizard", () => {
  it("starts with the introduction, with Back disabled and Next continuing", () => {
    render(<SetupWizard checkout={context(initialCheckoutState(), false)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Welcome",
    );
    expect(footer().getByRole("button", { name: "Back" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("puts a question's answer on the Next button and sends it from the footer", async () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "q1",
          prompt: "Which route?",
          kind: "text",
          phase: "planning",
          optional: true,
          status: "open",
          createdAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Claude Code has a question",
    );
    const next = footer().getByRole("button", { name: "Next" });
    expect(next).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Which route?" }), {
      target: { value: "/api/chat" },
    });
    expect(next).toHaveProperty("disabled", false);
    fireEvent.click(next);
    await waitFor(() =>
      expect(commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "q1",
        answer: "/api/chat",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip this question" }));
    await waitFor(() =>
      expect(commands["checkout/dismiss"]).toHaveBeenCalledWith({
        inputId: "q1",
      }),
    );
  });

  it("installs the plan from the footer and moves change requests into the body", async () => {
    const state = connected({
      status: "planning",
      plans: [
        {
          revision: 1,
          markdown: "Install chat",
          status: "proposed",
          submittedAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Review the plan",
    );
    fireEvent.click(screen.getByRole("button", { name: "Request changes…" }));
    const send = footer().getByRole("button", { name: "Send" });
    expect(send).toHaveProperty("disabled", true);
    fireEvent.click(
      screen.getByRole("button", { name: "Keep the plan as proposed" }),
    );
    fireEvent.click(footer().getByRole("button", { name: "Install" }));
    await waitFor(() =>
      expect(commands["checkout/plan"]).toHaveBeenCalledWith({
        decision: "approve",
      }),
    );
  });

  it("steps back through earlier pages and forward again to the live one", () => {
    const state = connected({
      status: "installing",
      plans: [
        {
          revision: 1,
          markdown: "Install chat",
          status: "approved",
          submittedAt: 2,
          decidedAt: 3,
        },
      ],
      steps: [
        { id: "s1", title: "Add the route", status: "active", createdAt: 4 },
      ],
    });
    const { rerender } = render(<SetupWizard checkout={context(state)} />);
    const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
    expect(heading()).toBe("Installing");
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("The plan");
    expect(screen.getByText("Install chat")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Approve and install" }),
    ).toBeNull();

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Claude Code is connected");
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(heading()).toBe("Installing");

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("The plan");
    rerender(
      <SetupWizard
        checkout={context({
          ...state,
          inputs: [
            {
              id: "q2",
              prompt: "Which port?",
              kind: "text",
              phase: "installing",
              optional: false,
              status: "open",
              createdAt: 5,
            },
          ],
        })}
      />,
    );
    expect(heading()).toBe("Claude Code has a question");
  });

  it("ends with a Finish button once the setup is done", () => {
    render(
      <SetupWizard checkout={context(connected({ status: "done" }), false)} />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Setup complete",
    );
    expect(footer().getByRole("button", { name: "Finish" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
