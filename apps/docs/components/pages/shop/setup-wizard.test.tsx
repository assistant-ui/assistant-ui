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

const { push, finishCheckout, abandonCheckout } = vi.hoisted(() => ({
  push: vi.fn(),
  finishCheckout: vi.fn(),
  abandonCheckout: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

vi.mock("../../../lib/checkout/flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/checkout/flow")>()),
  finishCheckout,
  abandonCheckout,
}));

afterEach(cleanup);

const commands = {
  "checkout/message": vi.fn().mockResolvedValue(undefined),
  "checkout/answer": vi.fn().mockResolvedValue(undefined),
  "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  "checkout/plan": vi.fn().mockResolvedValue(undefined),
  "checkout/begin-plan": vi.fn().mockResolvedValue(undefined),
  "checkout/cancel": vi.fn().mockResolvedValue(undefined),
  "checkout/finish": vi.fn().mockResolvedValue(undefined),
} as unknown as CheckoutContextValue["commands"];

const context = (
  state: Checkout.State,
  agentPresent = true,
  fromCart = false,
): CheckoutContextValue => ({
  state,
  session: { id: "test", products: ["assistant-ui"], startedAt: 1, fromCart },
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
      "Welcome to the setup wizard for assistant-ui",
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

  it("walks a model question's steps with the footer's Back and Next", async () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "model",
          prompt: "Which model?",
          kind: "model",
          phase: "planning",
          options: [{ id: "openai", label: "OpenAI" }],
          default: "openai",
          optional: false,
          status: "open",
          createdAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(footer().getByRole("button", { name: "Test key" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Claude Code has a question",
    );
    expect(footer().queryByRole("button", { name: "Test key" })).toBeNull();
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Skip, I’ll add it myself" }),
    );
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "gpt-5" },
    });
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "model",
        answer: JSON.stringify({ provider: "openai", model: "gpt-5" }),
      }),
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("cancels from the footer after confirming and returns the products to the cart", async () => {
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, true)}
      />,
    );
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(commands["checkout/cancel"]).toHaveBeenCalled());
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
    expect(finishCheckout).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/shop/cart");
  });

  it("keeps Cancel disabled while looking back at a finished setup", () => {
    const state = connected({
      status: "done",
      steps: [{ id: "s1", title: "Install", status: "done", createdAt: 4 }],
    });
    render(<SetupWizard checkout={context(state, false)} />);
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("keeps Finish on the footer while the agent works on a follow-up", () => {
    const state = connected({
      status: "installing",
      completion: { proposedAt: 5 },
      log: [
        { id: "l1", role: "user", phase: "installing", at: 6, text: "More" },
      ],
      steps: [
        { id: "s1", title: "Add the route", status: "active", createdAt: 7 },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Installing",
    );
    expect(footer().getByRole("button", { name: "Finish" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("finishes from the footer once the agent proposes it and leaves the products installed", async () => {
    const state = connected({
      status: "installing",
      completion: { proposedAt: 5 },
    });
    render(<SetupWizard checkout={context(state, true, true)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Claude Code finished",
    );
    fireEvent.click(footer().getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(commands["checkout/finish"]).toHaveBeenCalled());
    await waitFor(() => expect(finishCheckout).toHaveBeenCalled());
    expect(abandonCheckout).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/shop");
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
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Welcome to the setup wizard for assistant-ui");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
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

  it("steps back from a question to the answers already given", () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "q1",
          prompt: "Which project?",
          kind: "text",
          phase: "planning",
          optional: false,
          status: "answered",
          answer: "/srv/app",
          note: "the monorepo root",
          createdAt: 2,
          answeredAt: 3,
        },
        {
          id: "q2",
          prompt: "Which framework?",
          kind: "choice",
          phase: "planning",
          options: [
            {
              id: "ai-sdk",
              label: "Vercel AI SDK",
              variants: [{ id: "typescript", label: "TypeScript" }],
            },
          ],
          optional: false,
          status: "answered",
          answer: "ai-sdk:typescript",
          createdAt: 4,
          answeredAt: 5,
        },
        {
          id: "q3",
          prompt: "Which port?",
          kind: "text",
          phase: "planning",
          optional: true,
          status: "open",
          createdAt: 6,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
    expect(heading()).toBe("Claude Code has a question");
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Your answer");
    expect(screen.getByText("Which framework?")).toBeDefined();
    expect(screen.getByText("Vercel AI SDK · TypeScript")).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: "Message your agent" }),
    ).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByText("/srv/app")).toBeDefined();
    expect(screen.getByText("Note: the monorepo root")).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Claude Code is connected");
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
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

describe("SetupWizard conversation", () => {
  it("shows the exchange under the steps and hides the lines the session writes for closed steps", () => {
    const state = connected({
      status: "installing",
      steps: [
        { id: "s1", title: "Add the route", status: "done", createdAt: 4 },
        { id: "s2", title: "Add the thread", status: "active", createdAt: 5 },
      ],
      log: [
        {
          id: "l1",
          role: "agent",
          phase: "installing",
          stepId: "s1",
          at: 6,
          text: "Completed: Add the route\n\nRoute added",
        },
        {
          id: "l2",
          role: "user",
          phase: "installing",
          at: 7,
          text: "Use pnpm",
        },
        {
          id: "l3",
          role: "agent",
          phase: "installing",
          stepId: "s2",
          at: 8,
          text: "Switching to pnpm.",
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    const log = screen.getByRole("log");
    expect(log.textContent).toContain("You: Use pnpm");
    expect(log.textContent).toContain("Switching to pnpm.");
    expect(log.textContent).not.toContain("Completed: Add the route");
  });

  it("shows only what was said since the agent proposed to finish", () => {
    const state = connected({
      status: "installing",
      completion: { proposedAt: 10 },
      log: [
        { id: "l1", role: "agent", phase: "installing", at: 9, text: "Older" },
        { id: "l2", role: "agent", phase: "installing", at: 10, text: "Done." },
        { id: "l3", role: "user", phase: "installing", at: 11, text: "Thanks" },
      ],
    });
    render(<SetupWizard checkout={context(state, true, true)} />);
    const log = screen.getByRole("log");
    expect(log.textContent).not.toContain("Older");
    expect(log.textContent).toContain("Done.");
    expect(log.textContent).toContain("You: Thanks");
  });
});
