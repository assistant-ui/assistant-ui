import { describe, expect, it } from "vitest";
import { createMcpOAuthCallbackError } from "./useMcpOAuthCallback";

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
