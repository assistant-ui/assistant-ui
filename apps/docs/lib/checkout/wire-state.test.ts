import { describe, expect, it } from "vitest";
import { initialCheckoutState, type Checkout } from "./protocol";
import { IncompatibleCheckoutError, parseCheckoutState } from "./wire-state";

const input: Checkout.Input = {
  phase: "planning",
  id: "q1",
  kind: "choice",
  prompt: "Which framework?",
  options: [
    {
      id: "ai-sdk",
      label: "AI SDK",
      variants: [{ id: "typescript", label: "TypeScript" }],
    },
  ],
  help: { summary: "Pick one", href: "https://example.com" },
  optional: false,
  status: "open",
  createdAt: 1,
};

const full = (): Checkout.State => ({
  ...initialCheckoutState(),
  status: "installing",
  createdAt: 1,
  agent: {
    lastSeenAt: 2,
    connected: true,
    cwd: "/app",
    kind: "claude",
    introducedAt: 1,
  },
  products: [{ slug: "cloud", name: "Assistant Cloud", guide: "https://x" }],
  plans: [
    { revision: 1, markdown: "# Plan", status: "approved", submittedAt: 3 },
  ],
  steps: [{ id: "s1", title: "Install", status: "active", createdAt: 4 }],
  inputs: [input],
  log: [{ phase: "planning", id: "l1", role: "agent", at: 5, text: "hi" }],
});

describe("checkout wire state", () => {
  it("passes a snapshot of the current version through unchanged", () => {
    const empty = initialCheckoutState();
    expect(parseCheckoutState(empty)).toBe(empty);
    const state = full();
    expect(parseCheckoutState(state)).toBe(state);
  });

  it("treats a missing snapshot as still loading", () => {
    expect(parseCheckoutState(undefined)).toBeUndefined();
  });

  it.each([
    ["another version", { ...full(), version: 1 }],
    ["a list that is not a list", { ...full(), inputs: null }],
    ["a list entry that is not an object", { ...full(), steps: ["s1"] }],
    ["an unknown status", { ...full(), status: "paid" }],
    ["a checkout id that is not a string", { ...full(), id: 3 }],
    ["a missing agent", { ...full(), agent: null }],
    [
      "options that are not a list",
      { ...full(), inputs: [{ ...input, options: "ai-sdk" }] },
    ],
    [
      "an option without a label",
      { ...full(), inputs: [{ ...input, options: [{ id: "x" }] }] },
    ],
    [
      "a step without a title",
      { ...full(), steps: [{ id: "s1", status: "active", createdAt: 4 }] },
    ],
    [
      "a plan whose markdown is not text",
      { ...full(), plans: [{ ...full().plans[0], markdown: 7 }] },
    ],
    [
      "a log entry from an unknown role",
      { ...full(), log: [{ ...full().log[0], role: "system" }] },
    ],
    ["a non object", "state"],
  ])("rejects %s", (_, value) => {
    expect(() => parseCheckoutState(value)).toThrow(IncompatibleCheckoutError);
  });
});
