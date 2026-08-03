import { describe, expect, it } from "vitest";
import type { ThreadAssistantMessagePart } from "../types/message";
import { normalizePartStatus } from "./normalizePartStatus";

const partWithStatus = (status: unknown): ThreadAssistantMessagePart =>
  ({
    type: "text",
    text: "text",
    status,
  }) as unknown as ThreadAssistantMessagePart;

describe("normalizePartStatus", () => {
  it("returns a frozen running status", () => {
    const status = normalizePartStatus(partWithStatus({ type: "running" }));

    expect(status).toEqual({ type: "running" });
    expect(status).toBe(
      normalizePartStatus(partWithStatus({ type: "running" })),
    );
    expect(Object.isFrozen(status)).toBe(true);
  });

  it("normalizes a complete status without a reason", () => {
    expect(normalizePartStatus(partWithStatus({ type: "complete" }))).toEqual({
      type: "complete",
    });
  });

  it("drops an upstream complete reason", () => {
    expect(
      normalizePartStatus(
        partWithStatus({ type: "complete", reason: "unknown" }),
      ),
    ).toEqual({ type: "complete" });
  });

  it.each(["cancelled", "length", "content-filter", "other", "error"] as const)(
    "preserves the incomplete reason %s",
    (reason) => {
      expect(
        normalizePartStatus(partWithStatus({ type: "incomplete", reason })),
      ).toEqual({ type: "incomplete", reason });
    },
  );

  it("coerces an unrecognized incomplete reason to other", () => {
    expect(
      normalizePartStatus(
        partWithStatus({ type: "incomplete", reason: "unknown" }),
      ),
    ).toEqual({ type: "incomplete", reason: "other" });
  });

  it("returns undefined for an unknown status type", () => {
    expect(
      normalizePartStatus(partWithStatus({ type: "unknown" })),
    ).toBeUndefined();
  });
});
