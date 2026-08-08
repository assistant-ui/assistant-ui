import { describe, expect, it, vi } from "vitest";
import { invokePiErrorCallback } from "./invokePiErrorCallback";

describe("invokePiErrorCallback", () => {
  it("preserves the operation error when the callback throws", async () => {
    const operationError = new Error("send failed");
    const callbackError = new Error("telemetry failed");
    const onError = vi.fn(() => {
      throw callbackError;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const run = async () => {
      try {
        throw operationError;
      } catch (error) {
        invokePiErrorCallback(onError, error);
        throw error;
      }
    };

    await expect(run()).rejects.toBe(operationError);
    expect(onError).toHaveBeenCalledWith(operationError);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui/react-pi] onError callback threw an error",
      callbackError,
    );
    consoleError.mockRestore();
  });
});
