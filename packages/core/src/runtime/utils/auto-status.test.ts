import { describe, expect, it } from "vitest";
import { getAutoStatus } from "./auto-status";

describe("getAutoStatus", () => {
  it("reports a cancelled message as incomplete", () => {
    expect(
      getAutoStatus(true, false, false, false, undefined, true),
    ).toMatchObject({ type: "incomplete", reason: "cancelled" });
  });

  it("keeps a cancelled message incomplete once a later message arrives", () => {
    expect(
      getAutoStatus(false, false, false, false, undefined, true),
    ).toMatchObject({ type: "incomplete", reason: "cancelled" });
  });

  it("reports an uncancelled message as complete", () => {
    expect(
      getAutoStatus(true, false, false, false, undefined, false),
    ).toMatchObject({ type: "complete", reason: "unknown" });
  });

  it.each([
    [
      "running",
      { type: "running" },
      [true, true, false, false, undefined] as const,
    ],
    [
      "an interrupted tool call",
      { type: "requires-action", reason: "interrupt" },
      [true, false, true, true, undefined] as const,
    ],
    [
      "a pending tool call",
      { type: "requires-action", reason: "tool-calls" },
      [true, false, false, true, undefined] as const,
    ],
    [
      "an error",
      { type: "incomplete", reason: "error", error: "boom" },
      [true, false, false, false, "boom"] as const,
    ],
  ])("keeps %s ahead of cancellation", (_label, expected, args) => {
    expect(getAutoStatus(...args, true)).toMatchObject(expected);
  });
});
