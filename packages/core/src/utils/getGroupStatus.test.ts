import { describe, expect, it } from "vitest";
import type {
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../types/message";
import { getGroupStatus, getGroupSummary } from "./getGroupStatus";

type Status = MessagePartStatus | ToolCallMessagePartStatus;

const part = (status: Status) => ({ status });

describe("getGroupStatus", () => {
  it("reports running when the first member is running and the last is complete", () => {
    const parts = [
      { status: { type: "running" as const } },
      { status: { type: "complete" as const } },
    ];
    const status = getGroupStatus(parts);

    expect(status).toEqual({ type: "running" });
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
      getGroupSummary(
        [{ status: { type: "complete" } }, { status: { type: "running" } }],
        [0, 1],
      ).status,
    ).toEqual({ type: "running" });
  });
});

describe("getGroupSummary", () => {
  it("tallies every status over the requested indices and reports running when any part runs", () => {
    const summary = getGroupSummary(
      [
        part({ type: "complete" }),
        part({ type: "running" }),
        part({ type: "incomplete", reason: "error" }),
        part({ type: "requires-action", reason: "tool-calls" }),
      ],
      [0, 1, 2, 3],
    );

    expect(summary.counts).toEqual({
      running: 1,
      complete: 1,
      incomplete: 1,
      requiresAction: 1,
    });
    expect(
      Object.values(summary.counts).reduce((sum, count) => sum + count),
    ).toBe(4);
    expect(summary.status).toEqual({ type: "running" });
  });

  it("uses the last status when no part runs and treats missing parts as complete", () => {
    const summary = getGroupSummary(
      [
        undefined,
        part({ type: "incomplete", reason: "cancelled" }),
        part({ type: "requires-action", reason: "interrupt" }),
      ],
      [0, 1, 2],
    );

    expect(summary.counts).toEqual({
      running: 0,
      complete: 1,
      incomplete: 1,
      requiresAction: 1,
    });
    expect(summary.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("returns complete with zero counts for empty indices", () => {
    expect(getGroupSummary([], [])).toEqual({
      status: { type: "complete" },
      counts: {
        running: 0,
        complete: 0,
        incomplete: 0,
        requiresAction: 0,
      },
    });
  });
});
