import { describe, expect, it } from "vitest";
import { estimateMicroUsd } from "./usage-budget-codes";

describe("estimateMicroUsd", () => {
  it("charges input tokens at $0.28 per million", () => {
    expect(estimateMicroUsd({ inputTokens: 1_000_000 })).toBe(280_000);
  });

  it("charges output tokens at $0.42 per million", () => {
    expect(estimateMicroUsd({ outputTokens: 1_000_000 })).toBe(420_000);
  });

  it("adds both sides and rounds the turn up", () => {
    expect(estimateMicroUsd({ inputTokens: 10_001, outputTokens: 2_000 })).toBe(
      3_641,
    );
  });

  it("charges at least one micro dollar for a turn that reports no usage", () => {
    expect(estimateMicroUsd({})).toBe(1);
  });
});
