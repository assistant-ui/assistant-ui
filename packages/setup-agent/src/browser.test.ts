import { describe, expect, it } from "vitest";
import {
  BROWSER_CLOSE_GRACE_MS,
  BROWSER_REOPEN_GUARD_MS,
  createBrowserGate,
} from "./browser";
import { BROWSER_PRESENCE_MS, initialCheckoutState } from "./protocol";
import type { Checkout } from "./protocol";

const PAGE = "https://setup.test/#link=abc&setup=s1";

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
    url: (current) => (current.id === null ? undefined : PAGE),
    now: () => clock,
    ...(options.canOpen !== undefined && { canOpen: options.canOpen }),
  });
  const ask = (prompt: string) => {
    state.inputs.push({
      id: `q${state.inputs.length + 1}`,
      phase: "planning",
      kind: "text",
      prompt,
      optional: false,
      status: "open",
      createdAt: clock,
    });
  };
  const answerAll = () => {
    for (const input of state.inputs) input.status = "answered";
  };
  const heartbeat = () => {
    state.browser = { lastSeenAt: clock, connected: true };
  };
  const bye = () => {
    state.browser!.connected = false;
  };
  const advance = (ms: number) => {
    clock += ms;
  };
  const update = () => gate.update(structuredClone(state));
  return { state, gate, ask, answerAll, heartbeat, bye, advance, update };
};

describe("createBrowserGate", () => {
  it("opens nothing while the setup needs nothing from the user", () => {
    const t = fixture();
    expect(t.update()).toEqual([]);
    t.advance(60_000);
    expect(t.update()).toEqual([]);
    expect(t.gate.openedAt).toBeUndefined();
  });

  it("opens the page once, for the first question, with one tab for every waiting question", () => {
    const t = fixture();
    t.ask("Which project?");
    t.ask("Which model?");
    const actions = t.update();
    expect(actions).toEqual([
      expect.objectContaining({ type: "open", url: PAGE }),
    ]);
    expect(actions[0]!.need.id).toBe("q1");
    expect(t.update()).toEqual([]);
  });

  it("opens nothing while a joined tab is present", () => {
    const t = fixture();
    t.heartbeat();
    t.update();
    t.ask("Which project?");
    expect(t.update()).toEqual([]);
    expect(t.gate.openedAt).toBeUndefined();
  });

  it("never opens a second tab within 30 seconds; it tells the agent to ask instead", () => {
    const t = fixture();
    t.ask("Which project?");
    expect(t.update()[0]!.type).toBe("open");
    t.advance(12_000);
    t.ask("Which model?");
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        reason: "recently-opened",
        openedAgoMs: 12_000,
      }),
    ]);
  });

  it("guards within 30 seconds even when the opened tab joined and closed", () => {
    const t = fixture();
    t.ask("Which project?");
    t.update();
    t.advance(2_000);
    t.heartbeat();
    t.update();
    t.answerAll();
    t.bye();
    t.update();
    t.advance(BROWSER_CLOSE_GRACE_MS + 1_000);
    t.update();
    t.ask("Which model?");
    const [action] = t.update();
    expect(action).toMatchObject({ type: "ask", reason: "recently-opened" });
  });

  it("reopens for the next question once a joined tab was closed and 30 seconds passed", () => {
    const t = fixture();
    t.ask("Which project?");
    t.update();
    t.advance(3_000);
    t.heartbeat();
    t.update();
    t.answerAll();
    t.update();
    // The user closes the tab: no goodbye, the heartbeats just stop.
    t.advance(BROWSER_REOPEN_GUARD_MS);
    expect(t.update()).toEqual([]);
    t.ask("Which model?");
    const actions = t.update();
    expect(actions).toEqual([
      expect.objectContaining({ type: "open", url: PAGE }),
    ]);
    expect(t.gate.openedAt).toBe(1_000_000 + 3_000 + BROWSER_REOPEN_GUARD_MS);
  });

  it("does not reopen a tab that never joined; the user may still be on the connect page", () => {
    const t = fixture();
    t.ask("Which project?");
    t.update();
    t.advance(95_000);
    t.ask("Which model?");
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        reason: "recently-opened",
        openedAgoMs: 95_000,
      }),
    ]);
  });

  it("tells the agent when the user closed the tab with a question waiting, then reopens for the next one", () => {
    const t = fixture();
    t.ask("Which project?");
    t.update();
    t.advance(1_000);
    t.heartbeat();
    t.update();
    t.bye();
    t.advance(1_000);
    // One missed beat is not a close.
    expect(t.update()).toEqual([]);
    t.advance(BROWSER_CLOSE_GRACE_MS);
    expect(t.update()).toEqual([
      expect.objectContaining({ type: "ask", reason: "browser-closed" }),
    ]);
    expect(t.update()).toEqual([]);
    t.advance(BROWSER_REOPEN_GUARD_MS);
    t.ask("Which model?");
    expect(t.update()).toEqual([expect.objectContaining({ type: "open" })]);
  });

  it("counts a tab gone once its heartbeats are older than the presence window", () => {
    const t = fixture();
    t.heartbeat();
    t.update();
    t.advance(BROWSER_PRESENCE_MS - 1);
    t.ask("Still there?");
    expect(t.update()).toEqual([]);
    t.answerAll();
    t.advance(BROWSER_CLOSE_GRACE_MS + 2);
    t.update();
    t.ask("Now?");
    // A tab was present before setup opened any, so this opens.
    expect(t.update()).toEqual([expect.objectContaining({ type: "open" })]);
  });

  it("asks the agent for every question under --no-open", () => {
    const t = fixture({ canOpen: false });
    t.ask("Which project?");
    t.ask("Which model?");
    expect(t.update()).toEqual([
      expect.objectContaining({ type: "ask", reason: "no-browser" }),
      expect.objectContaining({ type: "ask", reason: "no-browser" }),
    ]);
  });

  it("on a host without browser presence, opens once and then lets the agent ask", () => {
    const t = fixture({ tracked: false });
    t.ask("Which project?");
    expect(t.update()[0]!.type).toBe("open");
    t.advance(120_000);
    t.ask("Which model?");
    expect(t.update()).toEqual([
      expect.objectContaining({ type: "ask", reason: "recently-opened" }),
    ]);
  });

  it("treats a proposed plan and a proposal to close as needs", () => {
    const t = fixture();
    t.state.plans.push({
      revision: 1,
      markdown: "## Steps",
      status: "proposed",
      submittedAt: 1,
    });
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "open",
        need: expect.objectContaining({ id: "plan" }),
      }),
    ]);
    t.state.plans[0]!.status = "approved";
    t.state.status = "installing";
    t.state.completion = { proposedAt: 5 };
    t.advance(1_000);
    expect(t.update()).toEqual([
      expect.objectContaining({
        type: "ask",
        need: expect.objectContaining({ id: "finish" }),
      }),
    ]);
  });
});
