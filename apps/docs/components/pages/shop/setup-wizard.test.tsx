// @vitest-environment jsdom

import {
  act,
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

const { push, finishCheckout, abandonCheckout, acceptSetupLicense } =
  vi.hoisted(() => ({
    push: vi.fn(),
    finishCheckout: vi.fn(),
    abandonCheckout: vi.fn(),
    acceptSetupLicense: vi.fn(),
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

vi.mock("../../../lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/checkout/session-store")
  >()),
  acceptSetupLicense,
}));

const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

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
  session: Partial<CheckoutContextValue["session"]> = {
    licenseAccepted: true,
  },
): CheckoutContextValue => ({
  state,
  session: {
    id: "test",
    products: ["assistant-ui"],
    startedAt: 1,
    fromCart,
    ...session,
  },
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
  it("offers a Back control that keeps the setup running in the mobile header", () => {
    render(<SetupWizard checkout={context(initialCheckoutState())} />);
    const back = screen.getByRole("button", {
      name: "Back, setup keeps running",
    });
    expect(back.closest("header")?.className).toContain("sm:hidden");
  });

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

  it("holds the setup on the license until the terms are accepted from the footer", () => {
    render(
      <SetupWizard
        checkout={context(
          { ...initialCheckoutState(), status: "planning" },
          true,
          false,
          { introSeen: true },
        )}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "License agreement",
    );
    const next = footer().getByRole("button", { name: "Next" });
    expect(next).toHaveProperty("disabled", true);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "I accept the terms of the license agreement",
      }),
    );
    expect(next).toHaveProperty("disabled", false);
    fireEvent.click(next);
    expect(acceptSetupLicense).toHaveBeenCalledTimes(1);
  });

  it("keeps the frame at one fixed size on every page", () => {
    const frame = () =>
      document.querySelector('section[aria-labelledby="setup-wizard-title"]')!
        .className;
    render(<SetupWizard checkout={context(initialCheckoutState(), false)} />);
    const intro = frame();
    expect(intro).toContain("max-w-[52rem]");
    expect(intro).toContain("max-h-full");
    expect(intro).toContain("sm:aspect-[16/10]");
    expect(intro).toContain("sm:min-h-[min(38rem,100%)]");
    cleanup();
    render(
      <SetupWizard
        checkout={context(
          { ...initialCheckoutState(), status: "planning" },
          true,
          false,
          { introSeen: true },
        )}
      />,
    );
    expect(frame()).toBe(intro);
    const license = document.querySelector('[aria-label="License agreement"]')!;
    expect(license.className).toContain("h-40");
    expect(license.className).not.toContain("flex-1");
    cleanup();
    render(
      <SetupWizard
        checkout={context(
          connected({
            status: "installing",
            steps: [
              {
                id: "s1",
                title: "Add the route",
                status: "active",
                createdAt: 4,
              },
            ],
          }),
        )}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Installing",
    );
    expect(frame()).toBe(intro);
  });

  it("pins the title and progress bar above the scrolling step list and keeps the step in progress in view", () => {
    const steps = (activeId: string): Checkout.Step[] =>
      ["s1", "s2", "s3"].map((id, index) => ({
        id,
        title: `Step ${index + 1}`,
        status: id < activeId ? "done" : id === activeId ? "active" : "pending",
        createdAt: index,
      }));
    const installing = (activeId: string) =>
      context(connected({ status: "installing", steps: steps(activeId) }));
    const scrolled = () =>
      scrollIntoView.mock.contexts.map(
        (element) =>
          within(element as HTMLElement).getByText(/^Step \d$/).textContent,
      );
    const { rerender } = render(<SetupWizard checkout={installing("s1")} />);
    const list = screen.getByRole("list", { name: "Installation steps" });
    const scroller = list.closest(".overflow-y-auto")!;
    expect(scroller.contains(screen.getByRole("heading", { level: 1 }))).toBe(
      false,
    );
    expect(scroller.contains(screen.getByRole("progressbar"))).toBe(false);
    expect(scroller.className).toContain(
      "[mask-image:linear-gradient(to_bottom,transparent,black_1.5rem,black_calc(100%_-_4rem),transparent)]",
    );
    expect(list.className).toContain("py-[50cqh]");
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center" });
    expect(scrolled()).toEqual(["Step 1"]);
    expect(
      within(list).getByRole("listitem", { current: "step" }).textContent,
    ).toContain("Step 1");

    rerender(<SetupWizard checkout={installing("s1")} />);
    expect(scrolled()).toEqual(["Step 1"]);

    rerender(<SetupWizard checkout={installing("s3")} />);
    expect(scrolled()).toEqual(["Step 1", "Step 3"]);
    expect(
      within(list).getByRole("listitem", { current: "step" }).textContent,
    ).toContain("Step 3");
  });

  it("shows the list being planned and written until a step starts, then the progress", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const titles = () =>
      within(screen.getByRole("list", { name: "Installation steps" }))
        .getAllByRole("listitem")
        .map((item) => item.querySelector("p")!.textContent);
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    expect(titles()).toEqual(["Planning the steps…"]);
    expect(
      screen.getByRole("progressbar", { name: "Planning the steps" }),
    ).toBeTruthy();
    expect(screen.queryByText(/steps done/)).toBeNull();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "pending"), step("s2", "pending")])}
      />,
    );
    expect(titles()).toEqual(["Step 1", "Step 2", "Writing the next step…"]);
    expect(
      screen.getByRole("progressbar", { name: "Planning the steps" }),
    ).toBeTruthy();
    expect(screen.queryByText(/steps done/)).toBeNull();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "active"), step("s2", "pending")])}
      />,
    );
    expect(titles()).toEqual(["Step 1", "Step 2"]);
    expect(
      screen
        .getByRole("progressbar", { name: "Step 1" })
        .getAttribute("aria-valuenow"),
    ).toBe("0");
    expect(screen.getByText("0 of 2 steps done")).toBeTruthy();
  });

  it("animates the steps in as they are written and fades the drafting row out once the first one starts", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const row = (title: string) => screen.getByText(title).closest("li")!;
    const fade = (title: string) => row(title).firstElementChild!.className;
    vi.useFakeTimers();
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    const planning = row("Planning the steps…");
    expect(planning.className).toContain("motion-safe:animate-unfold");
    expect(fade("Planning the steps…")).toContain("motion-safe:fade-in");
    expect(planning.querySelector("svg")!.getAttribute("class")).toContain(
      "motion-safe:animate-[spin_3s_linear_infinite]",
    );
    expect(within(planning).getByText("being written")).toBeTruthy();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "pending"), step("s2", "pending")])}
      />,
    );
    expect(row("Step 1").className).toContain("motion-safe:animate-unfold");
    expect(fade("Step 1")).toContain("motion-safe:slide-in-from-bottom-2");
    expect(fade("Writing the next step…")).toContain("motion-safe:fade-in");

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "active"), step("s2", "pending")])}
      />,
    );
    const drafting = row("Writing the next step…");
    expect(drafting.getAttribute("aria-hidden")).toBe("true");
    expect(drafting.className).toContain("motion-safe:animate-fold");
    expect(drafting.className).not.toContain("motion-safe:animate-unfold");
    expect(fade("Writing the next step…")).toContain("motion-safe:fade-out");
    expect(fade("Writing the next step…")).not.toContain("motion-safe:fade-in");
    expect(screen.getByText("0 of 2 steps done").className).toContain(
      "motion-safe:fade-in",
    );
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText("Writing the next step…")).toBeNull();
    vi.useRealTimers();
  });

  it("fills the install bar with time within the current step and snaps to the step count when one completes", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const value = () =>
      Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
    vi.useFakeTimers();
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    expect(value()).toBe(0);
    act(() => vi.advanceTimersByTime(10_000));
    const planned = value();
    expect(planned).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(10_000));
    expect(value()).toBeGreaterThan(planned);
    expect(value()).toBeLessThan(100);

    const running = (first: Checkout.StepStatus, second: Checkout.StepStatus) =>
      installing([step("s1", "done"), step("s2", first), step("s3", second)]);
    rerender(<SetupWizard checkout={running("active", "pending")} />);
    expect(value()).toBe(33);
    act(() => vi.advanceTimersByTime(10_000));
    const partial = value();
    expect(partial).toBeGreaterThan(33);
    expect(partial).toBeLessThan(67);
    act(() => vi.advanceTimersByTime(60_000));
    expect(value()).toBeGreaterThan(partial);
    expect(value()).toBeLessThan(67);

    rerender(<SetupWizard checkout={running("done", "active")} />);
    expect(value()).toBe(67);
    act(() => vi.advanceTimersByTime(5_000));
    expect(value()).toBeGreaterThan(67);
    vi.useRealTimers();
  });

  it("tells what the agent is doing in the footer's corner once it has connected", () => {
    const indicator = () => screen.getByTestId("agent-indicator").title;
    const { rerender } = render(
      <SetupWizard checkout={context(initialCheckoutState(), false)} />,
    );
    expect(screen.queryByTestId("agent-indicator")).toBeNull();
    rerender(
      <SetupWizard
        checkout={context({
          ...initialCheckoutState(),
          status: "installing",
          agent: {
            ...initialCheckoutState().agent,
            kind: "claude-code",
            lastSeenAt: 1,
          },
        })}
      />,
    );
    expect(indicator()).toBe("Claude Code is working");
    rerender(
      <SetupWizard
        checkout={context({
          ...initialCheckoutState(),
          status: "planning",
          agent: {
            ...initialCheckoutState().agent,
            kind: "claude-code",
            lastSeenAt: 1,
          },
          inputs: [
            {
              id: "q1",
              prompt: "Which framework?",
              kind: "text",
              phase: "planning",
              optional: false,
              status: "open",
              createdAt: 1,
            },
          ],
        })}
      />,
    );
    expect(indicator()).toBe("Claude Code needs you");
  });

  it("covers the wizard with an undismissable dialog until the agent reconnects", async () => {
    const { rerender } = render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Claude Code disconnected",
    });
    expect(dialog.textContent).toContain("run the command again");
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    expect(screen.getByRole("dialog")).toBe(dialog);
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true)}
      />,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
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
      "Which route?",
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
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Test key" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Which model?",
    );
    expect(screen.queryByRole("button", { name: "Test key" })).toBeNull();
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
          markdown:
            "## What I found\n\n- **App:** Next.js\n\n## Steps\n\n1. Install chat",
          status: "proposed",
          submittedAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Review the plan",
    );
    expect(
      screen
        .getByRole("button", { name: /^Steps/ })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("Install chat")).toBeDefined();
    expect(screen.queryByText("Next.js")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /What I found/ }));
    expect(screen.getByText("Next.js")).toBeDefined();
    expect(screen.queryByText("Install chat")).toBeNull();
    const note = screen.getByPlaceholderText(
      "Add a note, or leave it empty to install as proposed.",
    );
    fireEvent.change(note, { target: { value: "Use Anthropic." } });
    expect(footer().getByRole("button", { name: "Send" })).toBeDefined();
    fireEvent.change(note, { target: { value: "" } });
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
    expect(heading()).toBe("License agreement");
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Welcome to the setup wizard for assistant-ui");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
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
    expect(heading()).toBe("Which port?");
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
    expect(heading()).toBe("Which port?");
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Your answer");
    expect(screen.getByText("Which framework?")).toBeDefined();
    expect(screen.getByText("Vercel AI SDK · TypeScript")).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByText("/srv/app")).toBeDefined();
    expect(screen.getByText("Note: the monorepo root")).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Claude Code is connected");
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(heading()).toBe("Which port?");
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

describe("SetupWizard messages", () => {
  const openMessages = () =>
    fireEvent.click(screen.getByRole("button", { name: /^Messages\./ }));

  it("opens the exchange from the footer avatar, without the lines the session writes for closed steps", async () => {
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
    expect(screen.queryByRole("log")).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: "Message your agent" }),
    ).toBeNull();
    openMessages();
    const log = await screen.findByRole("log");
    expect(log.textContent).toContain("You: Use pnpm");
    expect(log.textContent).toContain("Claude Code: Switching to pnpm.");
    expect(log.textContent).not.toContain("Completed: Add the route");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Message your agent" }),
      ),
    );
  });

  it("counts the agent's replies that arrived while the messages were closed", async () => {
    const entry = (id: string, at: number, text: string) =>
      ({ id, role: "agent", phase: "installing", at, text }) as const;
    const { rerender } = render(
      <SetupWizard
        checkout={context(
          connected({ status: "installing", log: [entry("l1", 5, "Hi")] }),
        )}
      />,
    );
    const name = () => screen.getByTestId("agent-indicator").textContent;
    expect(name()).toBe("Messages. Claude Code is working.");
    rerender(
      <SetupWizard
        checkout={context(
          connected({
            status: "installing",
            log: [entry("l1", 5, "Hi"), entry("l2", 6, "Switching to pnpm.")],
          }),
        )}
      />,
    );
    expect(name()).toBe("1Messages. Claude Code is working. 1 unread.");
    openMessages();
    await screen.findByRole("log");
    expect(name()).toBe("Messages. Claude Code is working.");
  });

  it("badges a reply to the user, and a line posted while nothing else waits, but not chatter beside an open input", async () => {
    const entry = (
      id: string,
      role: "agent" | "user",
      at: number,
      text: string,
    ) => ({ id, role, phase: "installing", at, text }) as const;
    const input: Checkout.Input = {
      id: "i1",
      phase: "installing",
      kind: "text",
      prompt: "Which port?",
      optional: false,
      status: "open",
      createdAt: 6,
    };
    const first = entry("l1", "agent", 5, "Hi");
    const view = (log: Checkout.LogEntry[], inputs: Checkout.Input[] = []) => (
      <SetupWizard
        checkout={context(connected({ status: "installing", log, inputs }))}
      />
    );
    const { rerender } = render(view([first]));
    const name = () => screen.getByTestId("agent-indicator").textContent;
    rerender(
      view([first, entry("l2", "agent", 7, "Checking ports.")], [input]),
    );
    expect(name()).toBe("Messages. Claude Code needs you.");
    rerender(
      view(
        [
          first,
          entry("l2", "agent", 7, "Checking ports."),
          entry("l3", "user", 8, "Use 4000"),
          entry("l4", "agent", 9, "Switching to 4000."),
        ],
        [input],
      ),
    );
    expect(name()).toBe("1Messages. Claude Code needs you. 1 unread.");
    openMessages();
    await screen.findByRole("log");
    expect(name()).toBe("Messages. Claude Code needs you.");
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    rerender(
      view(
        [
          first,
          entry("l2", "agent", 7, "Checking ports."),
          entry("l3", "user", 8, "Use 4000"),
          entry("l4", "agent", 9, "Switching to 4000."),
          entry("l5", "agent", 11, "Done with the port."),
        ],
        [{ ...input, status: "answered", answer: "4000", answeredAt: 10 }],
      ),
    );
    await waitFor(() =>
      expect(name()).toBe("1Messages. Claude Code is working. 1 unread."),
    );
  });

  it("fills the exploring bar with time and holds it while the agent is away", () => {
    const bar = () =>
      screen.getByRole("progressbar", { name: "Exploring", hidden: true });
    vi.useFakeTimers();
    const { rerender } = render(
      <SetupWizard checkout={context(connected({ status: "planning" }))} />,
    );
    const start = Number(bar().getAttribute("aria-valuenow"));
    act(() => vi.advanceTimersByTime(5_000));
    const filled = Number(bar().getAttribute("aria-valuenow"));
    expect(filled).toBeGreaterThan(start);
    expect(filled).toBeLessThan(90);
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    act(() => vi.advanceTimersByTime(5_000));
    expect(Number(bar().getAttribute("aria-valuenow"))).toBe(filled);
    expect(bar().getAttribute("aria-valuetext")).toBe("Waiting for the agent");
    vi.useRealTimers();
  });
});
