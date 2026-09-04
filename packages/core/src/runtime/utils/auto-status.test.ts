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
    ["running", { type: "running" }, true, false, false, undefined],
    [
      "an interrupted tool call",
      { type: "requires-action", reason: "interrupt" },
      false,
      true,
      true,
      undefined,
    ],
    [
      "a pending tool call",
      { type: "requires-action", reason: "tool-calls" },
      false,
      false,
      true,
      undefined,
    ],
    [
      "an error",
      { type: "incomplete", reason: "error", error: "boom" },
      false,
      false,
      false,
      "boom",
    ],
  ])(
    "keeps %s ahead of cancellation",
    (_label, expected, isRunning, interrupted, pending, error) => {
      expect(
        getAutoStatus(true, isRunning, interrupted, pending, error, true),
      ).toMatchObject(expected);
    },
  );
});
