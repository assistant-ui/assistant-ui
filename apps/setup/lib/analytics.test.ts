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
  it("is true once per setup and key, across reloads that share the browser's storage", async () => {
    const { firstForSetup } = await freshTab();
    expect(firstForSetup("setupA", "agent_connected")).toBe(true);
    expect(firstForSetup("setupA", "agent_connected")).toBe(false);
    expect(firstForSetup("setupA", "install_finished")).toBe(true);
    expect(firstForSetup("setupA", "install_finished")).toBe(false);
  });

  it("starts over for another setup and keeps only the latest one", async () => {
    const { firstForSetup } = await freshTab();
    firstForSetup("setupA", "agent_connected");
    expect(firstForSetup("setupB", "agent_connected")).toBe(true);
    expect(JSON.parse(localStorage.getItem("aui-setup-reported")!)).toEqual({
      setup: "setupB",
      keys: ["agent_connected"],
    });
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
      setup: "setupD",
      keys: ["closed"],
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
