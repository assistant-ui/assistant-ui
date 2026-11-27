// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

/** The module keeps per-tab state (the in-memory record, whether storage writes work, the pending events), so each test loads its own copy, like a fresh tab. */
const freshTab = async () => {
  vi.resetModules();
  return import("./analytics");
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  delete window.posthog;
});

describe("firstForSetup", () => {
  it("is true once per setup and key, also after a reload that shares the browser's storage", async () => {
    const tab = await freshTab();
    expect(tab.firstForSetup("setupA", "agent_connected")).toBe(true);
    expect(tab.firstForSetup("setupA", "agent_connected")).toBe(false);
    const reloaded = await freshTab();
    expect(reloaded.firstForSetup("setupA", "agent_connected")).toBe(false);
    expect(reloaded.firstForSetup("setupA", "install_finished")).toBe(true);
  });

  it("keeps each setup's record when another setup reports in between", async () => {
    const tab = await freshTab();
    tab.firstForSetup("setupA", "agent_connected");
    expect(tab.firstForSetup("setupB", "agent_connected")).toBe(true);
    const reloaded = await freshTab();
    expect(reloaded.firstForSetup("setupA", "agent_connected")).toBe(false);
    expect(reloaded.firstForSetup("setupB", "agent_connected")).toBe(false);
  });

  it("takes a setup id that names an object property as any other", async () => {
    const { firstForSetup } = await freshTab();
    expect(firstForSetup("constructor", "closed")).toBe(true);
    expect(firstForSetup("constructor", "closed")).toBe(false);
    expect(firstForSetup("toString", "closed")).toBe(true);
  });

  it("remembers the last ten setups and lets older ones drop off", async () => {
    const { firstForSetup } = await freshTab();
    for (let n = 0; n < 11; n++) firstForSetup(`setup${n}`, "closed");
    expect(
      Object.keys(JSON.parse(localStorage.getItem("aui-setup-reported")!)),
    ).toEqual(Array.from({ length: 10 }, (_, n) => `setup${n + 1}`));
    expect(firstForSetup("setup1", "closed")).toBe(false);
  });

  it("still reports each milestone once in this tab when storage is blocked", async () => {
    const { firstForSetup } = await freshTab();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(firstForSetup("setupC", "closed")).toBe(true);
    expect(firstForSetup("setupC", "closed")).toBe(false);
  });

  it("still reports each milestone once in this tab when only writes fail", async () => {
    const { firstForSetup } = await freshTab();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(firstForSetup("setupF", "closed")).toBe(true);
    expect(firstForSetup("setupF", "closed")).toBe(false);
  });

  it("replaces a stored record it cannot read", async () => {
    const { firstForSetup } = await freshTab();
    localStorage.setItem("aui-setup-reported", "{not json");
    expect(firstForSetup("setupD", "closed")).toBe(true);
    expect(JSON.parse(localStorage.getItem("aui-setup-reported")!)).toEqual({
      setupD: ["closed"],
    });
    expect(firstForSetup("setupD", "closed")).toBe(false);
  });
});

describe("trackedAgentKind", () => {
  it("keeps the kinds the page names and reports any other as other", async () => {
    const { trackedAgentKind } = await freshTab();
    expect(trackedAgentKind("codex")).toBe("codex");
    expect(trackedAgentKind("an-agent-from-tomorrow")).toBe("other");
    expect(trackedAgentKind(null)).toBeUndefined();
  });
});

describe("analytics.setup.error", () => {
  it("reports an error without a setup every time, and one with a setup once per reason and step", async () => {
    const { analytics } = await freshTab();
    const capture = vi.fn();
    window.posthog = { capture };
    analytics.setup.error({ reason: "session_unreadable" });
    analytics.setup.error({ reason: "session_unreadable" });
    analytics.setup.error({
      reason: "agent_disconnected",
      step: "install",
      setup: "setupE",
      agentKind: "cursor",
    });
    analytics.setup.error({
      reason: "agent_disconnected",
      step: "install",
      setup: "setupE",
      agentKind: "cursor",
    });
    analytics.setup.error({
      reason: "agent_disconnected",
      step: "question",
      setup: "setupE",
    });
    expect(capture.mock.calls).toEqual([
      ["setup_error", { reason: "session_unreadable" }],
      ["setup_error", { reason: "session_unreadable" }],
      [
        "setup_error",
        { reason: "agent_disconnected", step: "install", agent_kind: "cursor" },
      ],
      ["setup_error", { reason: "agent_disconnected", step: "question" }],
    ]);
  });
});

describe("events before PostHog loads", () => {
  it("holds them until PostHog runs, then sends them in order", async () => {
    const { analytics, flushPendingEvents } = await freshTab();
    analytics.setup.linkShown("setupG");
    analytics.setup.linkConfirmed();
    const capture = vi.fn();
    window.posthog = { capture };
    expect(capture).not.toHaveBeenCalled();
    flushPendingEvents();
    analytics.setup.cancelled();
    expect(capture.mock.calls).toEqual([
      ["setup_link_shown", undefined],
      ["setup_link_confirmed", undefined],
      ["setup_cancelled", undefined],
    ]);
  });
});

describe("claims across tabs", () => {
  it("claims each milestone under one lock shared by this origin's tabs", async () => {
    // A lock manager like the browser's: one holder at a time, the rest queue.
    const requested: string[] = [];
    let tail = Promise.resolve();
    vi.stubGlobal("navigator", {
      ...navigator,
      locks: {
        request: (name: string, callback: () => void) => {
          requested.push(name);
          tail = tail.then(callback);
          return tail;
        },
      },
    });
    const capture = vi.fn();
    window.posthog = { capture };
    const first = await freshTab();
    const second = await freshTab();
    first.analytics.setup.installFinished("setupH", {
      agentKind: "claude",
      steps: 1,
      preview: false,
    });
    second.analytics.setup.installFinished("setupH", {
      agentKind: "claude",
      steps: 1,
      preview: false,
    });
    await tail;
    expect(requested).toEqual(["aui-setup-reported", "aui-setup-reported"]);
    expect(
      capture.mock.calls.filter(
        ([event]) => event === "setup_install_finished",
      ),
    ).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("still reports when the page may not take the lock", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      locks: { request: () => Promise.reject(new Error("SecurityError")) },
    });
    const capture = vi.fn();
    window.posthog = { capture };
    const { analytics } = await freshTab();
    analytics.setup.closed("setupI");
    await vi.waitFor(() =>
      expect(capture).toHaveBeenCalledWith("setup_closed", undefined),
    );
    vi.unstubAllGlobals();
  });
});
