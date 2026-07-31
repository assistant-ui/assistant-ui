import { describe, expect, it } from "vitest";
import { getGroupStatus } from "./getGroupStatus";

describe("getGroupStatus", () => {
  it("reports running when the first member is running and the last is complete", () => {
    const parts = [
      { status: { type: "running" as const } },
      { status: { type: "complete" as const } },
    ];
    const status = getGroupStatus(parts);

    expect(status).toEqual({ type: "running" });
    expect(getGroupStatus(parts, [0, 1])).toBe(status);
    expect(status).toBe(getGroupStatus([{ status: { type: "running" } }]));
    expect(Object.isFrozen(status)).toBe(true);
  });

  it("reports the last status when every member is complete", () => {
    const status = { type: "complete" } as const;

    expect(getGroupStatus([{ status }, { status }])).toBe(status);
  });

  it("reports complete for an empty group", () => {
    expect(getGroupStatus([])).toEqual({ type: "complete" });
  });

  it("matches the positional outcome for statusless adapters", () => {
    expect(
      getGroupStatus(
        [{ status: { type: "complete" } }, { status: { type: "running" } }],
        [0, 1],
      ),
    ).toEqual({ type: "running" });
  });
});
