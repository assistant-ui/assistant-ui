// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics, firstForSetup, trackedAgentKind } from "./analytics";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  delete window.posthog;
});

describe("firstForSetup", () => {
  it("is true once per setup and key, across reloads that share the browser's storage", () => {
    expect(firstForSetup("setupA", "agent_connected")).toBe(true);
    expect(firstForSetup("setupA", "agent_connected")).toBe(false);
    expect(firstForSetup("setupA", "install_finished")).toBe(true);
    expect(firstForSetup("setupA", "install_finished")).toBe(false);
  });

  it("starts over for another setup and keeps only the latest one", () => {
    firstForSetup("setupA", "agent_connected");
    expect(firstForSetup("setupB", "agent_connected")).toBe(true);
    expect(JSON.parse(localStorage.getItem("aui-setup-reported")!)).toEqual({
      setup: "setupB",
      keys: ["agent_connected"],
    });
  });

  it("still reports each milestone once in this tab when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(firstForSetup("setupC", "closed")).toBe(true);
    expect(firstForSetup("setupC", "closed")).toBe(false);
  });

  it("ignores a stored record it cannot read", () => {
    localStorage.setItem("aui-setup-reported", "{not json");
    expect(firstForSetup("setupD", "closed")).toBe(true);
  });
});

describe("trackedAgentKind", () => {
  it("keeps the kinds the page names and reports any other as other", () => {
    expect(trackedAgentKind("codex")).toBe("codex");
    expect(trackedAgentKind("an-agent-from-tomorrow")).toBe("other");
    expect(trackedAgentKind(null)).toBeUndefined();
  });
});

describe("analytics.setup.error", () => {
  it("reports an error without a setup every time, and one with a setup once per reason and step", () => {
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
