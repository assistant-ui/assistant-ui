import { describe, expect, it } from "vitest";
import {
  awaitingUserAt,
  initialCheckoutState,
  stepActivity,
  unreadAgentEntries,
  type Checkout,
} from "./protocol";

const entry = (
  id: string,
  role: "agent" | "user",
  at: number,
): Checkout.LogEntry => ({ id, role, phase: "installing", at, text: id });

const input = (overrides: Partial<Checkout.Input>): Checkout.Input => ({
  id: "i1",
  phase: "installing",
  kind: "text",
  prompt: "Which port?",
  optional: false,
  status: "open",
  createdAt: 6,
  ...overrides,
});

const state = (overrides: Partial<Checkout.State>): Checkout.State => ({
  ...initialCheckoutState(),
  status: "installing",
  ...overrides,
});

describe("awaitingUserAt", () => {
  it("sees an input only between its creation and its answer", () => {
    const answered = state({
      inputs: [input({ status: "answered", answer: "4000", answeredAt: 10 })],
    });
    expect(awaitingUserAt(answered, 5)).toBe(false);
    expect(awaitingUserAt(answered, 7)).toBe(true);
    expect(awaitingUserAt(answered, 10)).toBe(false);
    expect(awaitingUserAt(state({ inputs: [input({})] }), 20)).toBe(true);
    expect(
      awaitingUserAt(state({ inputs: [input({ status: "dismissed" })] }), 20),
    ).toBe(false);
  });

  it("sees a plan while it waits for a decision and a finish proposal from when it was made", () => {
    const plan: Checkout.Plan = {
      revision: 1,
      markdown: "# Plan",
      status: "approved",
      submittedAt: 3,
      decidedAt: 8,
    };
    expect(awaitingUserAt(state({ plans: [plan] }), 4)).toBe(true);
    expect(awaitingUserAt(state({ plans: [plan] }), 8)).toBe(false);
    expect(
      awaitingUserAt(state({ plans: [{ ...plan, status: "proposed" }] }), 9),
    ).toBe(false);
    const proposed = state({ completion: { proposedAt: 12 } });
    expect(awaitingUserAt(proposed, 11)).toBe(false);
    expect(awaitingUserAt(proposed, 12)).toBe(true);
  });
});

describe("unreadAgentEntries", () => {
  const entries = [
    entry("l1", "agent", 5),
    entry("l2", "agent", 7),
    entry("l3", "user", 8),
    entry("l4", "agent", 9),
    entry("l5", "agent", 11),
  ];
  const answered = state({
    inputs: [input({ status: "answered", answer: "4000", answeredAt: 10 })],
  });

  it("keeps replies to the user and lines posted while nothing waited, and drops chatter beside an input", () => {
    expect(unreadAgentEntries(answered, entries, 0).map((e) => e.id)).toEqual([
      "l1",
      "l4",
      "l5",
    ]);
  });

  it("drops everything up to readAt and everything without a state", () => {
    expect(unreadAgentEntries(answered, entries, 9).map((e) => e.id)).toEqual([
      "l5",
    ]);
    expect(unreadAgentEntries(undefined, entries, 0)).toEqual([]);
  });
});

describe("stepActivity", () => {
  it("keeps the agent's lines for one step, minus the line that closed it", () => {
    const line = (
      id: string,
      stepId: string | undefined,
      text: string,
      role: "agent" | "user" = "agent",
    ): Checkout.LogEntry => ({
      id,
      role,
      phase: "installing",
      at: Number(id.slice(1)),
      text,
      ...(stepId !== undefined && { stepId }),
    });
    const installing = state({
      steps: [
        { id: "s1", title: "Add the route", status: "done", createdAt: 1 },
        { id: "s2", title: "Wire the runtime", status: "active", createdAt: 2 },
      ],
      log: [
        line("l1", undefined, "Starting."),
        line("l2", "s1", "Created app/api/chat/route.ts"),
        line("l3", "s1", "Completed: Add the route\n\nIt streams."),
        line("l4", "s1", "Looks good", "user"),
        line("l5", "s2", "Installing @assistant-ui/react"),
      ],
    });
    expect(stepActivity(installing, "s1").map((entry) => entry.id)).toEqual([
      "l2",
    ]);
    expect(stepActivity(installing, "s2").map((entry) => entry.id)).toEqual([
      "l5",
    ]);
    expect(stepActivity(installing, "s3")).toEqual([]);
  });
});
