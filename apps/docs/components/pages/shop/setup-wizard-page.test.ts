import { describe, expect, it } from "vitest";
import { livePage, pageTrail } from "./setup-wizard-page";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";

const session = { id: "test", products: ["assistant-ui"], startedAt: 1 };
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
    session,
    phase: "connected",
    openInputs: [],
    planPending: false,
    ...extra,
  });

describe("livePage", () => {
  it("opens with the introduction until it was seen, then asks to connect", () => {
    expect(page({}, { phase: "unconnected" })).toEqual({ id: "welcome" });
    expect(
      page(
        {},
        { phase: "unconnected", session: { ...session, introSeen: true } },
      ),
    ).toEqual({ id: "connect" });
    expect(page({}, { phase: "waiting" })).toEqual({ id: "connect" });
    expect(page({ status: "waiting" })).toEqual({ id: "connect" });
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

  it("offers to finish once the agent proposes it, even after the user wrote back", () => {
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
  it("lets the user step back only through pages the setup has passed", () => {
    const state = { ...initialCheckoutState(), createdAt: 1 };
    expect(pageTrail(state, { id: "connect" })).toEqual(["welcome", "connect"]);
    expect(pageTrail(state, { id: "working" })).toEqual([
      "welcome",
      "connect",
      "working",
    ]);
    const planned = { ...state, plans: [plan("approved")] };
    expect(pageTrail(planned, { id: "plan" })).toEqual([
      "welcome",
      "connect",
      "plan",
    ]);
    const installing: Checkout.State = { ...planned, status: "installing" };
    expect(pageTrail(installing, { id: "install" })).toEqual([
      "welcome",
      "connect",
      "plan",
      "install",
    ]);
    expect(pageTrail(installing, { id: "finish" })).toEqual([
      "welcome",
      "connect",
      "plan",
      "install",
      "finish",
    ]);
  });
});
