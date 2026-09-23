import { describe, it, expect, vi } from "vitest";
import { parseAgUiEvent } from "./event-parser";

const delta = {
  messageId: "act-1",
  activityType: "progress",
  patch: [{ op: "replace", path: "/step", value: 2 }],
};

describe("parseAgUiEvent ACTIVITY_DELTA", () => {
  it("maps the client shape", () => {
    expect(
      parseAgUiEvent({
        type: "ACTIVITY_DELTA",
        ...delta,
        subagentRunId: "sub",
      }),
    ).toEqual({ type: "ACTIVITY_DELTA", ...delta, subagentRunId: "sub" });
  });

  it("maps the bare wire shape without optional fields", () => {
    expect(
      parseAgUiEvent({ type: "ACTIVITY_DELTA", ...delta, timestamp: 1 }),
    ).toEqual({ type: "ACTIVITY_DELTA", ...delta });
  });

  it("rejects a missing messageId", () => {
    const logger = { debug: vi.fn(), error: vi.fn() };
    const { messageId: _, ...rest } = delta;
    expect(
      parseAgUiEvent({ type: "ACTIVITY_DELTA", ...rest }, { logger }),
    ).toBe(null);
    expect(logger.debug).toHaveBeenCalledWith(
      "[agui] ACTIVITY_DELTA missing messageId, activityType or patch array",
      expect.objectContaining({ activityType: "progress" }),
    );
  });

  it("rejects a patch that is not an array", () => {
    expect(
      parseAgUiEvent({ type: "ACTIVITY_DELTA", ...delta, patch: "nope" }),
    ).toBe(null);
  });
});
