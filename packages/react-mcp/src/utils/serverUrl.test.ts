import { describe, expect, it } from "vitest";
import {
  hasPersistedCredentials,
  isAuthStateForServerUrl,
  normalizeMcpServerUrl,
} from "./serverUrl";

describe("normalizeMcpServerUrl", () => {
  it("normalizes host case and the default port", () => {
    expect(normalizeMcpServerUrl("https://MCP.Example.com:443/mcp")).toBe(
      "https://mcp.example.com/mcp",
    );
  });
});

describe("isAuthStateForServerUrl", () => {
  it("matches equivalent spellings of the same endpoint", () => {
    expect(
      isAuthStateForServerUrl(
        { serverUrl: "https://MCP.Example.com/mcp" },
        "https://mcp.example.com:443/mcp",
      ),
    ).toBe(true);
  });

  it("rejects a different endpoint, an unbound record, and no record", () => {
    expect(
      isAuthStateForServerUrl(
        { serverUrl: "https://a.example.com/mcp" },
        "https://b.example.com/mcp",
      ),
    ).toBe(false);
    expect(
      isAuthStateForServerUrl({ token: "t" }, "https://a.example.com/mcp"),
    ).toBe(false);
    expect(isAuthStateForServerUrl(null, "https://a.example.com/mcp")).toBe(
      false,
    );
  });

  it("rejects an unparsable URL on either side", () => {
    expect(
      isAuthStateForServerUrl({ serverUrl: "not a url" }, "https://a.test/mcp"),
    ).toBe(false);
    expect(
      isAuthStateForServerUrl({ serverUrl: "https://a.test/mcp" }, "not a url"),
    ).toBe(false);
  });
});

describe("hasPersistedCredentials", () => {
  it("counts bearer and OAuth tokens, not flow state", () => {
    expect(hasPersistedCredentials({ token: "t" })).toBe(true);
    expect(hasPersistedCredentials({ token: "" })).toBe(false);
    expect(
      hasPersistedCredentials({
        tokens: { access_token: "a", token_type: "bearer" },
      }),
    ).toBe(true);
    expect(hasPersistedCredentials({ codeVerifier: "v", state: "s" })).toBe(
      false,
    );
    expect(hasPersistedCredentials({})).toBe(false);
    expect(hasPersistedCredentials(null)).toBe(false);
  });
});
