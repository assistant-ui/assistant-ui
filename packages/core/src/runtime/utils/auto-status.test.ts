import { describe, expect, it } from "vitest";
import { getAutoStatus } from "./auto-status";

describe("getAutoStatus", () => {
  it.each([
    [
      { type: "running" },
      getAutoStatus(true, true, false, false, undefined, true),
    ],
    [
      { type: "requires-action", reason: "interrupt" },
      getAutoStatus(true, false, true, true, undefined, true),
    ],
    [
      { type: "requires-action", reason: "tool-calls" },
      getAutoStatus(true, false, false, true, undefined, true),
    ],
  ])(
    "keeps higher-priority statuses ahead of cancellation",
    (expected, status) => {
      expect(status).toMatchObject(expected);
    },
  );
});
