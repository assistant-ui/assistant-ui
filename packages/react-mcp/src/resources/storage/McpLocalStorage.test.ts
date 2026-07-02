import { describe, expect, it } from "vitest";

import { normalizeCustomServerRecords } from "./McpLocalStorage";

const validRecord = {
  id: "docs",
  name: "Docs",
  url: "https://docs.example.com/mcp",
  auth: { type: "none" },
  createdAt: 1,
} as const;

describe("normalizeCustomServerRecords", () => {
  it("returns an empty list when the persisted value is not an array", () => {
    expect(normalizeCustomServerRecords({ bad: true })).toEqual([]);
    expect(normalizeCustomServerRecords(null)).toEqual([]);
  });

  it("filters malformed custom server entries", () => {
    expect(
      normalizeCustomServerRecords([
        validRecord,
        null,
        { ...validRecord, id: "" },
        { ...validRecord, id: "docs__search" },
        { ...validRecord, name: "" },
        { ...validRecord, url: " " },
        { ...validRecord, name: 123 },
        { ...validRecord, url: null },
        { ...validRecord, createdAt: Number.NaN },
        { ...validRecord, auth: { type: "bearer", token: "" } },
        { ...validRecord, auth: { type: "bearer", token: 123 } },
      ]),
    ).toEqual([validRecord]);
  });

  it("accepts persisted bearer and oauth auth configs", () => {
    expect(
      normalizeCustomServerRecords([
        {
          ...validRecord,
          id: "private-docs",
          auth: { type: "bearer", token: "token" },
        },
        {
          ...validRecord,
          id: "oauth-docs",
          auth: {
            type: "oauth",
            scopes: ["docs.read"],
            authorizationEndpoint: "https://docs.example.com/oauth/authorize",
            tokenEndpoint: "https://docs.example.com/oauth/token",
          },
        },
      ]),
    ).toHaveLength(2);
  });
});
