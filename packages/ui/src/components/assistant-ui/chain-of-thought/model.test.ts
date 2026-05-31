import { describe, expect, it } from "vitest";
import { derivePhase, pluralize } from "./model";

describe("pluralize", () => {
  it("selects singular/plural via Intl.PluralRules (English one/other)", () => {
    expect(pluralize(1, "step")).toBe("step");
    expect(pluralize(0, "step")).toBe("steps");
    expect(pluralize(2, "step")).toBe("steps");
    expect(pluralize(1, "source")).toBe("source");
    expect(pluralize(3, "source")).toBe("sources");
  });
});

describe("derivePhase", () => {
  it("returns 'idle' when there are no parts", () => {
    expect(
      derivePhase({
        partsLength: 0,
        isStreaming: true,
        hasRequiresAction: true,
        hasIncomplete: true,
      }),
    ).toBe("idle");
  });

  it("prefers 'requires-action' over 'running' when both apply", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: true,
        hasRequiresAction: true,
        hasIncomplete: false,
      }),
    ).toBe("requires-action");
  });

  it("returns 'running' while streaming with no requires-action signal", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: true,
        hasRequiresAction: false,
        hasIncomplete: true,
      }),
    ).toBe("running");
  });

  it("returns 'incomplete' for a stopped chain with any incomplete part", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: false,
        hasRequiresAction: false,
        hasIncomplete: true,
      }),
    ).toBe("incomplete");
  });

  it("returns 'complete' as the default terminal state", () => {
    expect(
      derivePhase({
        partsLength: 3,
        isStreaming: false,
        hasRequiresAction: false,
        hasIncomplete: false,
      }),
    ).toBe("complete");
  });
});
