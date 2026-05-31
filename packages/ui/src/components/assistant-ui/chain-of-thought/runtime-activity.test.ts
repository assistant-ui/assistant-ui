import { describe, expect, it } from "vitest";
import {
  deriveCollapsedActivity,
  extractSearchResults,
  formatSearchSourceLabel,
  getActivityFromPart,
  inferToolActivityStatusType,
  isCollapsedActivityReasoning,
  partStatusOrFallback,
} from "./runtime-activity";

describe("runtime-activity", () => {
  it("falls back part status from chain/message state", () => {
    expect(partStatusOrFallback("running", "complete", "complete")).toBe(
      "running",
    );
    expect(partStatusOrFallback(undefined, "running", "complete")).toBe(
      "running",
    );
    expect(partStatusOrFallback(undefined, "complete", "requires-action")).toBe(
      "requires-action",
    );
    expect(partStatusOrFallback(undefined, "complete", "complete")).toBe(
      "complete",
    );
    // Deliberate: a tool normalized to `complete` keeps its success status even
    // when the surrounding run is incomplete. The latest tool genuinely
    // succeeded; folding `incomplete` in here would mislabel *every* completed
    // tool row as an error. Run-level interruption is surfaced by the
    // "Stopped after N steps" summary + the `stopped` live region instead.
    expect(partStatusOrFallback("complete", "complete", "incomplete")).toBe(
      "complete",
    );
  });

  it("infers active tool-call status while message is still streaming", () => {
    const basePart = { type: "tool-call", toolName: "search_web" };

    expect(
      inferToolActivityStatusType(
        { ...basePart, result: undefined },
        "complete",
        "running",
      ),
    ).toBe("running");
    expect(
      inferToolActivityStatusType(
        { ...basePart, interrupt: true },
        "complete",
        "running",
      ),
    ).toBe("requires-action");
  });

  it("resolves default and custom activity labels", () => {
    const part = { type: "tool-call", toolName: "search_web" };
    expect(
      getActivityFromPart(part, "running", undefined, "running", "running"),
    ).toBe("Searching web");
    expect(
      getActivityFromPart(part, "complete", undefined, "complete", "complete"),
    ).toBe("Searched web");

    const custom = getActivityFromPart(
      part,
      "running",
      {
        search_web: () => "  custom activity  ",
      },
      "running",
      "running",
    );
    expect(custom).toBe("custom activity");
  });

  it("builds collapsed activity from active/last reasoning-tool part", () => {
    const active = deriveCollapsedActivity({
      parts: [
        { type: "reasoning", text: "first", status: { type: "complete" } },
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "running" },
        },
        { type: "text", text: "tail" },
      ],
      chainStatusType: "running",
      messageStatusType: "running",
      toolActivityLabels: undefined,
    });
    expect(active).toBe("Searching web");

    const completed = deriveCollapsedActivity({
      parts: [
        { type: "reasoning", text: "first", status: { type: "complete" } },
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "complete" },
          result: { hits: 2 },
        },
        { type: "text", text: "tail" },
      ],
      chainStatusType: "complete",
      messageStatusType: "complete",
      toolActivityLabels: undefined,
    });
    expect(completed).toBe("Searched web");

    // The reasoningActivity seam threads through to the reasoning snippet.
    const localizedReasoning = deriveCollapsedActivity({
      parts: [
        {
          type: "reasoning",
          text: "weighing options",
          status: { type: "complete" },
        },
      ],
      chainStatusType: "running",
      messageStatusType: "running",
      toolActivityLabels: undefined,
      reasoningActivity: (snippet) => `Custom: ${snippet}`,
    });
    expect(localizedReasoning).toBe("Custom: weighing options");
  });

  it("parses search result metadata and source labels", () => {
    expect(extractSearchResults("fetch_docs", { hits: 2 })).toBeNull();
    expect(extractSearchResults("search_web", { unrelated: true })).toBeNull();

    const parsed = extractSearchResults("search_web", {
      hits: 2,
      sources: ["https://example.com/path"],
    });
    expect(parsed).toEqual({
      summary: "Found 2 results.",
      sources: ["https://example.com/path"],
    });
    expect(formatSearchSourceLabel("https://example.com/path")).toBe(
      "example.com/path",
    );
    expect(formatSearchSourceLabel("plain-source")).toBe("plain-source");
  });

  it("guards untrusted hit counts before rendering a summary", () => {
    // Non-integer / negative hit counts must not produce "Found 1.5 results."
    expect(extractSearchResults("search_web", { hits: 1.5 })).toBeNull();
    expect(extractSearchResults("search_web", { hits: -1 })).toBeNull();
    // A genuine zero still renders.
    expect(extractSearchResults("search_web", { hits: 0 })).toEqual({
      summary: "Found 0 results.",
      sources: [],
    });
  });

  it("prefixes reasoning with 'Thinking:' from streaming state, not the pinned part status", () => {
    // The runtime pins reasoning parts to `complete` even mid-stream, so the
    // prefix must follow the chain/message streaming state to match the shimmer.
    const streaming = getActivityFromPart(
      {
        type: "reasoning",
        text: "weighing options",
        status: { type: "complete" },
      },
      "complete",
      undefined,
      "running",
      "running",
    );
    expect(streaming).toBe("Thinking: weighing options");

    const done = getActivityFromPart(
      {
        type: "reasoning",
        text: "weighing options",
        status: { type: "complete" },
      },
      "complete",
      undefined,
      "complete",
      "complete",
    );
    expect(done).toBe("weighing options");
  });

  it("reports whether a reasoning part drives the collapsed activity", () => {
    // The active part wins: a running tool overrides an earlier settled reasoning.
    expect(
      isCollapsedActivityReasoning([
        { type: "reasoning", text: "x", status: { type: "complete" } },
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "running" },
        },
      ]),
    ).toBe(false);

    // A single active reasoning part drives the activity.
    expect(
      isCollapsedActivityReasoning([
        {
          type: "reasoning",
          text: "still thinking",
          status: { type: "running" },
        },
      ]),
    ).toBe(true);

    // No active part → the latest reasoning/tool part wins (here, reasoning).
    expect(
      isCollapsedActivityReasoning([
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "complete" },
        },
        { type: "reasoning", text: "wrap up", status: { type: "complete" } },
      ]),
    ).toBe(true);

    expect(isCollapsedActivityReasoning([])).toBe(false);
  });

  it("recognizes alternative search result shapes (results/items/documents)", () => {
    // Object-shaped hit lists still report a count derived from array length.
    expect(
      extractSearchResults("web_search", { results: [{}, {}, {}] }),
    ).toEqual({ summary: "Found 3 results.", sources: [] });
    expect(
      extractSearchResults("doc_search", {
        items: ["https://a.com", "https://b.com"],
      }),
    ).toEqual({
      summary: "Found 2 results.",
      sources: ["https://a.com", "https://b.com"],
    });
    // Singular pluralization via Intl.PluralRules.
    expect(extractSearchResults("search_docs", { documents: [{}] })).toEqual({
      summary: "Found 1 result.",
      sources: [],
    });
    // An explicit, valid `hits` count still wins over the array length.
    expect(
      extractSearchResults("search_web", { hits: 5, results: [{}, {}] }),
    ).toEqual({ summary: "Found 5 results.", sources: [] });
    // An empty hit list with no count stays null (no "Found 0 results." noise).
    expect(extractSearchResults("search_web", { results: [] })).toBeNull();
  });

  it("supports a '*' catch-all tool activity resolver", () => {
    const label = getActivityFromPart(
      { type: "tool-call", toolName: "unknown_tool" },
      "running",
      { "*": ({ fallbackLabel }) => `localized:${fallbackLabel}` },
      "running",
      "running",
    );
    expect(label).toBe("localized:unknown tool");
  });
});
