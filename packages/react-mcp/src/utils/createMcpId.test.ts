import { afterEach, describe, expect, it, vi } from "vitest";
import { createMcpId } from "./createMcpId";
import { assertValidServerId } from "./serverId";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createMcpId", () => {
  it("uses the platform UUID when one is available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-2222-3333-4444-555555555555",
    });
    expect(createMcpId()).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("falls back to a prefixed generated id without randomUUID", () => {
    vi.stubGlobal("crypto", {});
    const first = createMcpId();
    const second = createMcpId();
    expect(first).toMatch(/^mcp-[0-9A-Za-z]+$/);
    expect(second).not.toBe(first);
    expect(() => assertValidServerId(first)).not.toThrow();
  });
});
