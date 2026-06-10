import { describe, expect, it } from "vitest";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { deriveContextUsage } from "./piContextUsage";

const WINDOW = 100_000;

// Structural fakes — deriveContextUsage reads role/usage/stopReason off messages
// and type/message off branch entries; the SDK token helpers run for real.
const user = (text: string) => ({
  role: "user",
  content: [{ type: "text", text }],
});
const assistant = (totalTokens: number, stopReason = "end_turn") => ({
  role: "assistant",
  stopReason,
  usage: { totalTokens, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  content: [{ type: "text", text: "ok" }],
});
const branch = (...entries: unknown[]) => entries as readonly SessionEntry[];
const msgEntry = (message: unknown) => ({ type: "message", message });
const compaction = { type: "compaction" };

describe("deriveContextUsage", () => {
  it("returns undefined when the context window is unknown", () => {
    expect(deriveContextUsage(0, branch(), [user("hi")])).toBeUndefined();
  });

  it("trusts the latest assistant usage when nothing trails it", () => {
    const usage = deriveContextUsage(WINDOW, branch(), [
      user("hello"),
      assistant(5000),
    ]);
    expect(usage).toEqual({ tokens: 5000, contextWindow: WINDOW, percent: 5 });
  });

  it("adds an estimate for messages after the last usage", () => {
    const usage = deriveContextUsage(WINDOW, branch(), [
      user("hello"),
      assistant(5000),
      user("a follow-up question that has not been counted yet"),
    ]);
    expect(usage!.tokens).toBeGreaterThan(5000);
    expect(usage!.percent).toBeCloseTo((usage!.tokens! / WINDOW) * 100);
  });

  it("estimates from scratch when no assistant usage exists", () => {
    const usage = deriveContextUsage(WINDOW, branch(), [user("just a draft")]);
    expect(usage!.tokens).toBeGreaterThan(0);
    expect(usage!.tokens).not.toBeNull();
  });

  it("reports unknown tokens when a compaction has no trustworthy usage after it", () => {
    const usage = deriveContextUsage(WINDOW, branch(compaction), [
      user("hello"),
      assistant(5000),
    ]);
    expect(usage).toEqual({
      tokens: null,
      contextWindow: WINDOW,
      percent: null,
    });
  });

  it("trusts usage once a good assistant turn follows the compaction", () => {
    const usage = deriveContextUsage(
      WINDOW,
      branch(compaction, msgEntry(assistant(3000))),
      [user("hello"), assistant(3000)],
    );
    expect(usage).toEqual({ tokens: 3000, contextWindow: WINDOW, percent: 3 });
  });

  it("ignores aborted assistant usage after a compaction", () => {
    const usage = deriveContextUsage(
      WINDOW,
      branch(compaction, msgEntry(assistant(3000, "aborted"))),
      [user("hello"), assistant(3000, "aborted")],
    );
    expect(usage!.tokens).toBeNull();
  });
});
