import { describe, expect, it } from "vitest";
import {
  BROWSER_CLOSE_GRACE_MS,
  BROWSER_REOPEN_GUARD_MS,
  createBrowserGate,
} from "./browser";
import { initialCheckoutState } from "./protocol";
import type { Checkout } from "./protocol";

const PAGE = "https://setup.test/#link=abc&setup=s1";
const open = { type: "open", url: PAGE };

/** A gate on a fake clock, with a setup the test asks questions on and a tab it opens and closes. */
const fixture = (options: { canOpen?: boolean; tracked?: boolean } = {}) => {
  let clock = 1_000_000;
  const state: Checkout.State = {
    ...initialCheckoutState(),
    id: "s1",
    createdAt: 1,
    status: "planning",
  };
  if (options.tracked === false) delete state.browser;
  const gate = createBrowserGate({
    url: () => PAGE,
    now: () => clock,
    ...(options.canOpen !== undefined && { canOpen: options.canOpen }),
  });
  return {
    state,
    advance: (ms: number) => (clock += ms),
    update: () => gate.update(structuredClone(state)),
    ask: (prompt = "Which project?") =>
      state.inputs.push({
        id: `q${state.inputs.length + 1}`,
        phase: "planning",
        kind: "text",
        prompt,
        optional: false,
        status: "open",
        createdAt: clock,
      }),
    answerAll: () =>
      state.inputs.forEach((input) => (input.status = "answered")),
    heartbeat: () => (state.browser = { lastSeenAt: clock, connected: true }),
    bye: () => (state.browser!.connected = false),
  };
};

describe("createBrowserGate", () => {
  it("opens nothing until the setup needs the user, then one tab for everything waiting", () => {
    const t = fixture();
    expect(t.update()).toEqual([]);
    t.advance(60_000);
    expect(t.update()).toEqual([]);
    t.ask();
    t.ask();
    expect(t.update()).toEqual([
      expect.objectContaining({
        ...open,
        need: expect.objectContaining({ id: "q1" }),
      }),
    ]);
    expect(t.update()).toEqual([]);
  });

  it("opens nothing while a joined tab is present", () => {
    const t = fixture();
    t.heartbeat();
    t.update();
    t.ask();
    expect(t.update()).toEqual([]);
  });

  it("never opens a second tab within 30 seconds, nor reopens one that never joined", () => {
    const t = fixture();
    t.ask();
    t.update();
    t.advance(12_000);
    t.ask();
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        reason: "recently-opened",
        openedAgoMs: 12_000,
      }),
    ]);
    // 30s on, the tab never joined: what waits is handed to the agent once.
    t.advance(18_000);
    expect(t.update().map((action) => action.need.id)).toEqual(["q1", "q2"]);
    expect(t.update()).toEqual([]);
    // It is still not a close, so a later need is not a reason to reopen.
    t.advance(65_000);
    t.ask();
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        reason: "recently-opened",
        openedAgoMs: 95_000,
      }),
    ]);
  });

  it("reports a known-closed tab as closed inside the window, then reopens for the next need", () => {
    const t = fixture();
    t.ask();
    t.update();
    t.advance(2_000);
    t.heartbeat();
    t.update();
    t.answerAll();
    t.bye();
    t.update();
    t.advance(BROWSER_CLOSE_GRACE_MS);
    expect(t.update()).toEqual([]);
    t.ask();
    expect(t.update()).toEqual([
      expect.objectContaining({ type: "ask", reason: "browser-closed" }),
    ]);
    t.answerAll();
    t.advance(BROWSER_REOPEN_GUARD_MS);
    t.ask();
    expect(t.update()).toEqual([expect.objectContaining(open)]);
  });

  it("counts a tab that stopped beating as closed, and tells the agent once when a question was waiting", () => {
    const t = fixture();
    t.ask();
    t.update();
    t.advance(1_000);
    t.heartbeat();
    t.update();
    // No goodbye: the beats just stop. One missed beat is not a close.
    t.advance(20_000 + 1_000);
    expect(t.update()).toEqual([]);
    t.advance(BROWSER_CLOSE_GRACE_MS);
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        reason: "browser-closed",
        need: expect.objectContaining({ id: "q1" }),
      }),
    ]);
    expect(t.update()).toEqual([]);
    t.advance(BROWSER_REOPEN_GUARD_MS);
    t.ask();
    expect(t.update()).toEqual([expect.objectContaining(open)]);
  });

  it("asks the agent for every question under --no-open", () => {
    const t = fixture({ canOpen: false });
    t.ask();
    t.ask();
    expect(
      t.update().map((action) => action.type === "ask" && action.reason),
    ).toEqual(["no-browser", "no-browser"]);
  });

  it("on a host without browser presence, opens once and then lets the agent ask", () => {
    const t = fixture({ tracked: false });
    t.ask();
    expect(t.update()).toEqual([expect.objectContaining(open)]);
    t.advance(120_000);
    t.ask();
    expect(
      t.update().map((action) => action.type === "ask" && action.reason),
    ).toEqual(["recently-opened", "recently-opened"]);
  });

  it("treats a proposed plan and a proposal to close as needs", () => {
    const t = fixture();
    t.state.plans.push({
      revision: 1,
      markdown: "x",
      status: "proposed",
      submittedAt: 1,
    });
    expect(t.update()).toEqual([
      expect.objectContaining({
        need: expect.objectContaining({ id: "plan" }),
      }),
    ]);
    t.state.plans[0]!.status = "approved";
    t.state.status = "installing";
    t.state.completion = { proposedAt: 5 };
    expect(t.update()).toEqual([
      expect.objectContaining({
        need: expect.objectContaining({ id: "finish" }),
      }),
    ]);
  });
});
