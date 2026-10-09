import { describe, expect, it } from "vitest";
import {
  normalizeCustomServerRecords,
  normalizePersistedAuthState,
} from "./McpStoredDataNormalization";

describe("stored data normalization", () => {
  it("rejects unsafe persisted server ids and URLs", () => {
    expect(
      normalizeCustomServerRecords([
        {
          id: "docs__tool",
          name: "Docs",
          url: "https://example.com/mcp",
          auth: { type: "none" },
          createdAt: 1,
        },
      ]),
    ).toEqual([]);
    expect(
      normalizePersistedAuthState({ serverUrl: "javascript:alert(1)" }),
    ).toBeNull();
  });
});
