import { describe, expect, it } from "vitest";
import { livePage, pageKey, pageTrail } from "./setup-wizard-page";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";

const session = { id: "test", products: ["assistant-ui"], startedAt: 1 };
const accepted = { ...session, introSeen: true, licenseAccepted: true };
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
    session: accepted,
    phase: "connected",
    openInputs: [],
    planPending: false,
    ...extra,
  });

describe("livePage", () => {
  it("opens with the introduction until it was seen, then the license until accepted, then asks to connect", () => {
    const read = { ...session, introSeen: true };
    expect(page({}, { phase: "unconnected", session })).toEqual({
      id: "welcome",
    });
    expect(page({}, { phase: "unconnected", session: read })).toEqual({
      id: "license",
    });
    expect(page({}, { phase: "unconnected" })).toEqual({ id: "connect" });
    expect(page({}, { phase: "waiting", session })).toEqual({ id: "welcome" });
    expect(page({}, { phase: "waiting" })).toEqual({ id: "connect" });
    expect(page({ status: "waiting" }, { session: read })).toEqual({
      id: "license",
    });
    expect(page({ status: "waiting" })).toEqual({ id: "connect" });
    expect(page({ status: "planning" })).toEqual({ id: "working" });
  });

  it("holds every later page behind the license until it is accepted", () => {
    const read = { ...session, introSeen: true };
    expect(page({ status: "planning" }, { session: read })).toEqual({
      id: "license",
    });
    expect(
      page(
        { status: "planning", plans: [plan("proposed")] },
        { session: read, openInputs: [input("q1")], planPending: true },
      ),
    ).toEqual({ id: "license" });
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
    expect(ids(pageTrail(state, { id: "connect" }))).toEqual([
      "welcome",
      "license",
      "connect",
    ]);
    expect(ids(pageTrail(state, { id: "working" }))).toEqual([
      "welcome",
      "license",
      "connect",
      "working",
    ]);
    const planned = { ...state, plans: [plan("approved")] };
    expect(ids(pageTrail(planned, { id: "plan" }))).toEqual([
      "welcome",
      "license",
      "connect",
      "plan",
    ]);
    const installing: Checkout.State = { ...planned, status: "installing" };
    expect(ids(pageTrail(installing, { id: "install" }))).toEqual([
      "welcome",
      "license",
      "connect",
      "plan",
      "install",
    ]);
    expect(ids(pageTrail(installing, { id: "finish" }))).toEqual([
      "welcome",
      "license",
      "connect",
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
      "welcome",
      "license",
      "connect",
      "answer:q1",
      "answer:q2",
      "plan",
      "answer:q4",
      "install",
      "question:q3",
    ]);
  });
});
