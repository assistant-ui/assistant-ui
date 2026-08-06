import { describe, expect, it, vi } from "vitest";
import {
  createMcpOAuthCallbackError,
  invokeMcpOAuthCallback,
} from "./useMcpOAuthCallback";

describe("invokeMcpOAuthCallback", () => {
  it.each([
    { name: "onComplete", mode: "throws" },
    { name: "onComplete", mode: "rejects" },
    { name: "onError", mode: "throws" },
    { name: "onError", mode: "rejects" },
  ] as const)("isolates $name callbacks that $mode", async ({ name, mode }) => {
    const callbackError = new Error("telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const callback = vi.fn(() => {
      if (mode === "throws") throw callbackError;
      return Promise.reject(callbackError);
    });

    expect(() => invokeMcpOAuthCallback(name, callback)).not.toThrow();
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        `[react-mcp] ${name} callback threw an error`,
        callbackError,
      );
    });
  });
});

describe("createMcpOAuthCallbackError", () => {
  it("adds MCP OAuth callback context without a server id", () => {
    const cause = new Error('missing "state" parameter');
    const error = createMcpOAuthCallbackError(cause, null);

    expect(error.message).toBe(
      'MCP OAuth callback failed: missing "state" parameter',
    );
    expect(error.cause).toBe(cause);
  });

  it("adds MCP OAuth callback context with a server id", () => {
    const cause = new Error("invalid_grant");
    const error = createMcpOAuthCallbackError(cause, "github");

    expect(error.message).toBe(
      'MCP OAuth callback for server "github" failed: invalid_grant',
    );
    expect(error.cause).toBe(cause);
  });
});
