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
      isError: false,
      isCancelled: false,
      isDisabled: false,
      error: undefined,
    });
  });

  it("reports loading before running or terminal states", () => {
    expect(
      getRuntimeStatus({
        isLoading: true,
        isRunning: true,
        error: "boom",
        isCancelled: true,
      }),
    ).toMatchObject({
      type: "loading",
      isLoading: true,
      isRunning: false,
      isError: false,
      isCancelled: false,
      error: undefined,
    });
  });

  it("reports running before terminal states", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: true,
        error: "boom",
        isCancelled: true,
      }),
    ).toMatchObject({
      type: "running",
      isLoading: false,
      isRunning: true,
      isError: false,
      isCancelled: false,
      error: undefined,
    });
  });

  it("reports error when idle with an error", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        error: { message: "boom" },
      }),
    ).toMatchObject({
      type: "error",
      isError: true,
      error: { message: "boom" },
    });
  });

  it("reports cancelled when idle after cancellation", () => {
    expect(
      getRuntimeStatus({
        isLoading: false,
        isRunning: false,
        isCancelled: true,
      }),
    ).toMatchObject({
      type: "cancelled",
      isCancelled: true,
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
