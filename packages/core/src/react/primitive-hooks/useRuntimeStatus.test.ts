import { describe, expect, it } from "vitest";
import { getRuntimeStatus } from "./useRuntimeStatus";

describe("getRuntimeStatus", () => {
  it("reports idle when there is no active work or terminal state", () => {
    expect(
      getRuntimeStatus({ isLoading: false, isRunning: false }),
    ).toMatchObject({
      type: "idle",
      isIdle: true,
      isLoading: false,
      isRunning: false,
      isRequiresAction: false,
      isError: false,
      isCancelled: false,
      isIncomplete: false,
      isDisabled: false,
      reason: undefined,
      error: undefined,
    });
  });

  it("reports loading before running or terminal states", () => {
    expect(
      getRuntimeStatus({
        isLoading: true,
        isRunning: true,
        messageStatus: {
          type: "incomplete",
          reason: "error",
          error: "boom",
        },
      }),
    ).toMatchObject({
      type: "loading",
      isLoading: true,
      isRunning: false,
      isRequiresAction: false,
      isError: false,
      isCancelled: false,
      isIncomplete: false,
      reason: undefined,
      error: undefined,
    });
  });

  it("reports running before terminal states", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: true,
        messageStatus: {
          type: "incomplete",
          reason: "error",
          error: "boom",
        },
      }),
    ).toMatchObject({
      type: "running",
      isLoading: false,
      isRunning: true,
      isRequiresAction: false,
      isError: false,
      isCancelled: false,
      isIncomplete: false,
      reason: undefined,
      error: undefined,
    });
  });

  it("reports error when idle with an error", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        messageStatus: {
          type: "incomplete",
          reason: "error",
          error: { message: "boom" },
        },
      }),
    ).toMatchObject({
      type: "error",
      isError: true,
      reason: "error",
      error: { message: "boom" },
    });
  });

  it("reports cancelled when idle after cancellation", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        messageStatus: { type: "incomplete", reason: "cancelled" },
      }),
    ).toMatchObject({
      type: "cancelled",
      isCancelled: true,
      reason: "cancelled",
    });
  });

  it("reports requires-action when idle while waiting on tools or human input", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        messageStatus: { type: "requires-action", reason: "interrupt" },
      }),
    ).toMatchObject({
      type: "requires-action",
      isRequiresAction: true,
      reason: "interrupt",
    });
  });

  it("reports incomplete for non-error terminal incomplete reasons", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        messageStatus: { type: "incomplete", reason: "content-filter" },
      }),
    ).toMatchObject({
      type: "incomplete",
      isIncomplete: true,
      reason: "content-filter",
    });
  });

  it("preserves the disabled flag separately from the status type", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        isDisabled: true,
      }),
    ).toMatchObject({
      type: "idle",
      isDisabled: true,
    });
  });
});
