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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupConversation } from "./setup-conversation";
import {
  initialCheckoutState,
  currentPlan,
  openInputs,
  stepProgress,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

const input = (id: string, prompt: string): Checkout.Input => ({
  id,
  prompt,
  kind: "text",
  phase: "planning",
  optional: false,
  status: "open",
  createdAt: Number(id.slice(1)),
});
const context = (state: Checkout.State) => ({
  state,
  session: {
    id: "test",
    products: ["assistant-ui"],
    startedAt: 1,
  },
  url: "http://localhost/test",
  degraded: false,
  agentPresent: false,
  openInputs: openInputs(state),
  plan: currentPlan(state),
  planPending: false,
  progress: stepProgress(state),
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {
    "checkout/message": vi.fn().mockResolvedValue(undefined),
    "checkout/answer": vi.fn().mockResolvedValue(undefined),
    "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  } as unknown as CheckoutContextValue["commands"],
});
const stateWithQuestions = () => ({
  ...initialCheckoutState(),
  createdAt: 1,
  inputs: [input("q1", "Which project?"), input("q2", "Which route?")],
});

const resizeCallbacks: ResizeObserverCallback[] = [];
const intersectionCallbacks: IntersectionObserverCallback[] = [];
beforeEach(() => {
  resizeCallbacks.length = 0;
  intersectionCallbacks.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SetupConversation", () => {
  it("shows both speakers in one ungrouped conversation", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      createdAt: 1,
      status: "installing",
      agent: { ...initialCheckoutState().agent, lastSeenAt: 1 },
      plans: [
        {
          revision: 1,
          markdown: "Install chat",
          status: "approved",
          submittedAt: 2,
          decidedAt: 3,
        },
      ],
      log: [
        {
          id: "l1",
          phase: "installing",
          role: "agent",
          at: 4,
          text: "Adding your route",
        },
        {
          id: "l2",
          phase: "installing",
          role: "user",
          at: 5,
          text: "Use /chat",
        },
      ],
    };
    render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(within(log).getByText("Adding your route")).toBeDefined();
    expect(within(log).getByText("Use /chat")).toBeDefined();
    expect(within(log).getByText("I approved the plan.")).toBeDefined();
    expect(within(log).queryByRole("region")).toBeNull();
    expect(within(log).queryByRole("button", { expanded: true })).toBeNull();
    expect(screen.queryByText("You", { exact: true })).toBeNull();
    expect(screen.queryByText("Acknowledged", { exact: true })).toBeNull();
    expect(
      screen.queryByText("Sent · awaiting agent", { exact: true }),
    ).toBeNull();
  });

  it("keeps the latest messages visible when the composer resizes without interrupting reading older messages", () => {
    render(
      <SetupConversation
        agentName="Test agent"
        checkout={context(stateWithQuestions())}
      />,
    );
    const viewport = screen.getByRole("log").parentElement!;
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1200,
      configurable: true,
    });
    Object.defineProperty(viewport, "clientHeight", {
      value: 400,
      configurable: true,
    });
    viewport.scrollTop = 800;
    fireEvent.scroll(viewport);
    Object.defineProperty(viewport, "clientHeight", { value: 250 });
    act(() =>
      resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)),
    );
    expect(viewport.scrollTop).toBe(1200);

    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    act(() =>
      resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)),
    );
    expect(viewport.scrollTop).toBe(100);
  });
  it("shows the current work and stops the loader when the setup finishes", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      createdAt: 1,
      status: "planning",
    };
    const connected = (value: Checkout.State) => ({
      ...context(value),
      agentPresent: true,
    });
    const { rerender } = render(
      <SetupConversation agentName="Test agent" checkout={connected(state)} />,
    );
    expect(screen.getByRole("status").textContent).toBe("Planning…");
    expect(screen.queryByText(/Ask a question or leave a note/)).toBeNull();

    const installing: Checkout.State = {
      ...state,
      status: "installing",
      steps: [
        { id: "s1", title: "Install packages", status: "active", createdAt: 2 },
      ],
    };
    rerender(
      <SetupConversation
        agentName="Test agent"
        checkout={connected(installing)}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Install packages…");

    rerender(
      <SetupConversation
        agentName="Test agent"
        checkout={connected({
          ...installing,
          status: "done",
          log: [
            {
              id: "l1",
              at: 3,
              role: "agent",
              phase: "installing",
              text: "Completed: Install packages\n\nPackages installed.",
            },
          ],
        })}
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(
      within(screen.getByRole("log")).getByText(/Completed: Install packages/),
    ).toBeDefined();
  });

  it("only shows work while connected and not waiting on a required decision", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      status: "planning",
      createdAt: 1,
    };
    const checkout = { ...context(state), agentPresent: true };
    const { rerender } = render(
      <SetupConversation agentName="Test agent" checkout={checkout} />,
    );
    for (const override of [
      { agentPresent: false },
      { degraded: true },
      { planPending: true },
      { openInputs: [input("q1", "Which project?")] },
      { state: { ...state, status: "cancelled" as const } },
      {
        state: {
          ...state,
          status: "installing" as const,
          steps: [
            {
              id: "s1",
              title: "Install",
              status: "blocked" as const,
              createdAt: 2,
            },
          ],
        },
      },
    ]) {
      rerender(
        <SetupConversation
          agentName="Test agent"
          checkout={{ ...checkout, ...override }}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    }
    rerender(
      <SetupConversation
        agentName="Test agent"
        checkout={{
          ...checkout,
          openInputs: [{ ...input("q1", "Any preferences?"), optional: true }],
        }}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Planning…");
    rerender(
      <SetupConversation
        agentName="Test agent"
        checkout={{
          ...checkout,
          plan: {
            revision: 1,
            markdown: "Plan",
            status: "changes-requested",
            submittedAt: 2,
          },
        }}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Revising plan…");
  });

  it("allows steering before an agent connects", async () => {
    const checkout = context({ ...initialCheckoutState(), createdAt: 1 });
    render(<SetupConversation agentName="Test agent" checkout={checkout} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Message your agent" }),
      { target: { value: "Use our existing backend." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(checkout.commands["checkout/message"]).toHaveBeenCalledWith({
        text: "Use our existing backend.",
      }),
    );
  });

  it("keeps questions inline and preserves drafts while the user steers", async () => {
    const checkout = context(stateWithQuestions());
    render(<SetupConversation agentName="Test agent" checkout={checkout} />);
    const composer = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Message your agent",
    });
    expect(screen.queryByRole("button", { name: "Back to chat" })).toBeNull();
    expect(
      within(screen.getByRole("log")).getByRole("textbox", {
        name: "Which project?",
      }),
    ).toBeDefined();
    fireEvent.change(screen.getByRole("textbox", { name: "Which project?" }), {
      target: { value: "apps/web" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Which route?" }), {
      target: { value: "/chat" },
    });
    fireEvent.change(composer, { target: { value: "Also use pnpm" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(checkout.commands["checkout/message"]).toHaveBeenCalledWith({
        text: "Also use pnpm",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous question" }));
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Which project?" })
        .value,
    ).toBe("apps/web");
    fireEvent.click(
      within(
        screen
          .getByRole("textbox", { name: "Which project?" })
          .closest("form")!,
      ).getByRole("button", { name: "Send" }),
    );
    await waitFor(() =>
      expect(checkout.commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "q1",
        answer: "apps/web",
      }),
    );
  });

  it("keeps a steering draft focused when a question arrives", () => {
    const state = { ...initialCheckoutState(), createdAt: 1 };
    const { rerender } = render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );
    const composer = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Message your agent",
    });
    fireEvent.change(composer, {
      target: { value: "Keep our existing theme" },
    });
    rerender(
      <SetupConversation
        agentName="Test agent"
        checkout={context(stateWithQuestions())}
      />,
    );
    expect(document.activeElement).toBe(composer);
    expect(composer.value).toBe("Keep our existing theme");
  });

  it("links to offscreen questions", () => {
    const state: Checkout.State = {
      ...stateWithQuestions(),
      status: "installing",
      agent: { ...initialCheckoutState().agent, lastSeenAt: 1 },
      plans: [
        {
          revision: 1,
          markdown: "Install",
          status: "approved",
          submittedAt: 3,
        },
      ],
    };
    const { container } = render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );
    const question = container.querySelector<HTMLElement>(
      '[data-question-id="q1"]',
    )!;
    question.scrollIntoView = vi.fn();
    expect(
      screen.queryByRole("button", { name: /need[s]? your input/ }),
    ).toBeNull();
    act(() =>
      intersectionCallbacks.forEach((callback) =>
        callback(
          [
            {
              target: question,
              isIntersecting: false,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        ),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2 questions need your input" }),
    );
    expect(question.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Which project?" }),
    );
    act(() =>
      intersectionCallbacks.forEach((callback) =>
        callback(
          [
            {
              target: question,
              isIntersecting: true,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        ),
      ),
    );
    expect(
      screen.queryByRole("button", { name: /need[s]? your input/ }),
    ).toBeNull();
  });

  it("configures the model inline, starting with the provider", () => {
    const state: Checkout.State = {
      ...stateWithQuestions(),
      inputs: [
        {
          ...input("q1", "Which model?"),
          kind: "model",
          options: [{ id: "openai", label: "OpenAI" }],
        },
      ],
    };
    render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );
    const log = screen.getByRole("log");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(log).getByRole("radio", { name: "OpenAI" })).toBeDefined();
    expect(within(log).queryByLabelText("API key")).toBeNull();
    fireEvent.click(within(log).getByRole("button", { name: "Continue" }));
    expect(within(log).getByLabelText("API key")).toBeDefined();
  });

  it("collapses answered questions and shows linked read-only replies", () => {
    const state = stateWithQuestions();
    const { rerender, container } = render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );
    const answered: Checkout.State = {
      ...state,
      inputs: state.inputs.map((q) =>
        q.id === "q1"
          ? { ...q, status: "answered", answer: "apps/web", answeredAt: 3 }
          : q,
      ),
    };
    rerender(
      <SetupConversation agentName="Test agent" checkout={context(answered)} />,
    );
    expect(screen.getByRole("textbox", { name: "Which route?" })).toBeDefined();
    const reply = container.querySelector<HTMLElement>(
      '[data-answer-id="q1"]',
    )!;
    expect(within(reply).getByText("Which project?")).toBeDefined();
    expect(within(reply).getByText("apps/web")).toBeDefined();
    expect(within(reply).queryByRole("textbox")).toBeNull();
    reply.scrollIntoView = vi.fn();
    fireEvent.click(
      screen.getByRole("button", { name: "View answer to: Which project?" }),
    );
    expect(reply.scrollIntoView).toHaveBeenCalled();
    expect(reply.dataset.highlighted).toBe("true");
    expect(screen.getByRole("textbox", { name: "Which route?" })).toBeDefined();
  });

  it("shows unanswered questions as closed when setup ends", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      createdAt: 1,
      status: "cancelled",
      inputs: [input("q1", "Which project?")],
    };

    render(
      <SetupConversation agentName="Test agent" checkout={context(state)} />,
    );

    expect(
      screen.queryByRole("textbox", { name: "Which project?" }),
    ).toBeNull();
    expect(
      screen.getByText("Question closed without an answer."),
    ).toBeDefined();
  });

  it("keeps a failed message draft available for retry", async () => {
    const checkout = context({ ...initialCheckoutState(), createdAt: 1 });
    vi.mocked(checkout.commands["checkout/message"]).mockRejectedValueOnce(
      new Error("offline"),
    );
    render(<SetupConversation agentName="Test agent" checkout={checkout} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Message your agent" }),
      { target: { value: "Keep my theme" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(
      (
        screen.getByRole("textbox", {
          name: "Message your agent",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Keep my theme");
  });
});
