import { describe, expect, it } from "vitest";
import { createMcpOAuthCallbackError } from "./useMcpOAuthCallback";

describe("createMcpOAuthCallbackError", () => {
  it("adds MCP OAuth callback context without a server id", () => {
    expect(
      createMcpOAuthCallbackError(new Error('missing "state" parameter'), null)
        .message,
    ).toBe('MCP OAuth callback failed: missing "state" parameter');
  });

  it("adds MCP OAuth callback context with a server id", () => {
    expect(
      createMcpOAuthCallbackError(new Error("invalid_grant"), "github").message,
    ).toBe('MCP OAuth callback for server "github" failed: invalid_grant');
  });
});
