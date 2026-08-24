// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const completeAuth = vi.fn<(url: string) => Promise<void>>();
  const server = vi.fn(() => ({ completeAuth }));
  return {
    completeAuth,
    server,
    aui: { mcp: { server } },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => mocks.aui,
}));

const { createMcpOAuthCallbackError, useMcpOAuthCallback } =
  await import("./useMcpOAuthCallback");

const callbackUrl =
  "https://app.example.com/oauth/callback?state=aui-mcp%3AZG9jcw.nonce";

beforeEach(() => {
  mocks.completeAuth.mockReset();
  mocks.server.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMcpOAuthCallback", () => {
  it.each(["throws", "rejects"] as const)(
    "keeps successful authentication done when onComplete %s",
    async (mode) => {
      const callbackError = new Error("telemetry failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const onComplete = vi.fn(() => {
        if (mode === "throws") throw callbackError;
        return Promise.reject(callbackError);
      });
      mocks.completeAuth.mockResolvedValueOnce();

      const { result } = renderHook(() =>
        useMcpOAuthCallback({ url: callbackUrl, onComplete }),
      );

      await waitFor(() => expect(result.current.status).toBe("done"));
      expect(result.current).toEqual({
        status: "done",
        serverId: "docs",
        error: null,
      });
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-mcp] onComplete callback threw an error",
          callbackError,
        );
      });
    },
  );

  it.each(["throws", "rejects"] as const)(
    "preserves authentication errors when onError %s",
    async (mode) => {
      const authError = new Error("invalid_grant");
      const callbackError = new Error("telemetry failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const onError = vi.fn(() => {
        if (mode === "throws") throw callbackError;
        return Promise.reject(callbackError);
      });
      mocks.completeAuth.mockRejectedValueOnce(authError);

      const { result } = renderHook(() =>
        useMcpOAuthCallback({ url: callbackUrl, onError }),
      );

      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.serverId).toBe("docs");
      expect(result.current.error).toMatchObject({
        message: 'MCP OAuth callback for server "docs" failed: invalid_grant',
        cause: authError,
      });
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-mcp] onError callback threw an error",
          callbackError,
        );
      });
    },
  );
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
