import { describe, expect, it } from "vitest";
import { livePage, pageKey, pageTrail } from "./setup-wizard-page";
import { initialCheckoutState, type Checkout } from "@/lib/checkout/protocol";

const input = (id: string, stepId?: string): Checkout.Input => ({
  id,
  prompt: id,
  kind: "text",
  phase: "planning",
  optional: false,
  status: "open",
  createdAt: 1,
  ...(stepId !== undefined && { stepId }),
});
const plan = (status: Checkout.PlanStatus): Checkout.Plan => ({
  revision: 1,
  markdown: "Install chat",
  status,
  submittedAt: 2,
});
const page = (
  overrides: Partial<Checkout.State>,
  extra: Partial<Parameters<typeof livePage>[0]> = {},
) =>
  livePage({
    state: { ...initialCheckoutState(), createdAt: 1, ...overrides },
    phase: "connected",
    openInputs: [],
    planPending: false,
    ...extra,
  });

describe("livePage", () => {
  it("waits for the agent until it runs, unless its first question came first", () => {
    const question = input("q1");
    expect(page({}, { phase: "unconnected" })).toEqual({ id: "connect" });
    expect(page({ status: "waiting" })).toEqual({ id: "connect" });
    // Until the agent runs, the page waits for it rather than claim it is exploring.
    expect(page({ status: "planning" }, { phase: "waiting" })).toEqual({
      id: "connect",
    });
    expect(page({ status: "planning" })).toEqual({ id: "working" });
    expect(
      page(
        { status: "planning" },
        { phase: "unconnected", openInputs: [question] },
      ),
    ).toEqual({ id: "question", input: question, total: 1 });
    expect(
      pageTrail(undefined, { id: "question", input: question, total: 1 }).map(
        pageKey,
      ),
    ).toEqual(["question:q1"]);
  });

  it("shows the agent's first open question before anything else it wants", () => {
    const questions = [input("q1"), input("q2")];
    expect(
      page(
        { status: "planning", plans: [plan("proposed")] },
        { openInputs: questions, planPending: true },
      ),
    ).toEqual({ id: "question", input: questions[0], total: 2 });
  });

  it("moves through plan review, exploring and installing as the status changes", () => {
    expect(
      page(
        { status: "planning", plans: [plan("proposed")] },
        { planPending: true },
      ),
    ).toEqual({ id: "plan" });
    expect(page({ status: "planning" })).toEqual({ id: "working" });
    expect(page({ status: "installing", plans: [plan("approved")] })).toEqual({
      id: "install",
    });
  });

  it("offers to finish once the agent proposes it, and shows the work again once a step reopens", () => {
    const completion = { proposedAt: 5 };
    expect(page({ status: "installing", completion })).toEqual({
      id: "finish",
    });
    expect(
      page({
        status: "installing",
        completion,
        log: [
          { id: "l1", role: "user", phase: "installing", at: 6, text: "More" },
        ],
      }),
    ).toEqual({ id: "finish" });
    expect(
      page({
        status: "installing",
        completion,
        steps: [
          { id: "s1", title: "Dark mode", status: "active", createdAt: 7 },
        ],
      }),
    ).toEqual({ id: "install" });
    const question = input("q1");
    expect(
      page({ status: "installing", completion }, { openInputs: [question] }),
    ).toEqual({ id: "question", input: question, total: 1 });
    expect(
      page(
        { status: "installing", completion, plans: [plan("proposed")] },
        { planPending: true },
      ),
    ).toEqual({ id: "plan" });
  });

  it("closes on done or cancelled whatever else is pending", () => {
    expect(
      page(
        { status: "done", inputs: [input("q1")] },
        { phase: "finished", openInputs: [input("q1")] },
      ),
    ).toEqual({ id: "closed" });
    expect(page({ status: "cancelled" }, { phase: "stopped" })).toEqual({
      id: "closed",
    });
  });
});

describe("pageTrail", () => {
  const ids = (trail: ReturnType<typeof pageTrail>) => trail.map(pageKey);

  it("lets the user step back only through pages the setup has passed", () => {
    const state = { ...initialCheckoutState(), createdAt: 1 };
    expect(ids(pageTrail(state, { id: "connect" }))).toEqual(["connect"]);
    expect(ids(pageTrail(state, { id: "working" }))).toEqual(["working"]);
    const planned = { ...state, plans: [plan("approved")] };
    expect(ids(pageTrail(planned, { id: "plan" }))).toEqual(["plan"]);
    const installing: Checkout.State = { ...planned, status: "installing" };
    expect(ids(pageTrail(installing, { id: "install" }))).toEqual([
      "plan",
      "install",
    ]);
    expect(ids(pageTrail(installing, { id: "finish" }))).toEqual([
      "plan",
      "install",
      "finish",
    ]);
  });

  it("keeps every answer the user gave, in the order they gave them, before the page it led to", () => {
    const answered = (
      id: string,
      phase: Checkout.Status,
      answeredAt: number,
      status: Checkout.InputStatus = "answered",
    ): Checkout.Input => ({
      ...input(id),
      phase,
      status,
      answeredAt,
      ...(status === "answered" && { answer: "yes" }),
    });
    const state: Checkout.State = {
      ...initialCheckoutState(),
      createdAt: 1,
      status: "installing",
      plans: [plan("approved")],
      inputs: [
        answered("q2", "planning", 4),
        answered("q1", "planning", 3, "dismissed"),
        { ...input("q3"), phase: "installing" },
        answered("q4", "installing", 9),
      ],
    };
    const live = { id: "question", input: state.inputs[2]!, total: 1 } as const;
    expect(ids(pageTrail(state, live))).toEqual([
      "answer:q1",
      "answer:q2",
      "plan",
      "answer:q4",
      "install",
      "question:q3",
    ]);
  });

  it("leaves no page behind for a product the agent proposed and the browser added", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      createdAt: 1,
      status: "planning",
      inputs: [
        {
          ...input("p1"),
          kind: "product",
          product: "assistant-ui",
          status: "answered",
          answer: "assistant-ui",
          answeredAt: 2,
        },
      ],
    };
    expect(ids(pageTrail(state, { id: "working" }))).toEqual(["working"]);
  });
});
