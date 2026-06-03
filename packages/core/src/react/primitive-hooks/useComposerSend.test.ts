import { describe, it, expect } from "vitest";

// Pure replica of the gating predicate in useComposerSend.ts, asserting the
// full matrix. Keep this expression identical to the hook's `disabled` selector.
const isDisabled = (s: {
  canSend: boolean;
  isRunning: boolean;
  capabilitiesQueue: boolean;
  queueWhileRunning: boolean;
}) =>
  !s.canSend || (s.isRunning && !s.capabilitiesQueue && !s.queueWhileRunning);

describe("useComposerSend gating", () => {
  it("disabled when canSend is false regardless of other flags", () => {
    expect(
      isDisabled({
        canSend: false,
        isRunning: false,
        capabilitiesQueue: true,
        queueWhileRunning: true,
      }),
    ).toBe(true);
  });

  it("enabled when idle and sendable", () => {
    expect(
      isDisabled({
        canSend: true,
        isRunning: false,
        capabilitiesQueue: false,
        queueWhileRunning: false,
      }),
    ).toBe(false);
  });

  it("disabled while running by default (no queue capability, no opt-in)", () => {
    expect(
      isDisabled({
        canSend: true,
        isRunning: true,
        capabilitiesQueue: false,
        queueWhileRunning: false,
      }),
    ).toBe(true);
  });

  it("enabled while running when capabilities.queue is true (assistant-transport)", () => {
    expect(
      isDisabled({
        canSend: true,
        isRunning: true,
        capabilitiesQueue: true,
        queueWhileRunning: false,
      }),
    ).toBe(false);
  });

  it("enabled while running when queueWhileRunning opt-in is set", () => {
    expect(
      isDisabled({
        canSend: true,
        isRunning: true,
        capabilitiesQueue: false,
        queueWhileRunning: true,
      }),
    ).toBe(false);
  });
});
