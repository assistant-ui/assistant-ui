import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";

import {
  McpLocalStorage,
  normalizeCustomServerRecords,
  normalizePersistedAuthState,
} from "./McpLocalStorage";

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

describe("normalizePersistedAuthState", () => {
  it("returns null when the persisted value is not an object", () => {
    expect(normalizePersistedAuthState(null)).toBeNull();
    expect(normalizePersistedAuthState("bad")).toBeNull();
    expect(normalizePersistedAuthState([])).toBeNull();
  });

  it("drops malformed auth state fields", () => {
    expect(
      normalizePersistedAuthState({
        token: "",
        codeVerifier: 123,
        tokens: "not-tokens",
        clientInformation: { redirect_uris: ["http://localhost/callback"] },
      }),
    ).toBeNull();
  });

  it("keeps valid bearer and OAuth callback state", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        codeVerifier: "pkce-verifier",
      }),
    ).toEqual({
      token: "bearer-token",
      codeVerifier: "pkce-verifier",
    });
  });

  it("keeps valid OAuth tokens and client information", () => {
    const tokens = {
      access_token: "access-token",
      token_type: "Bearer",
      refresh_token: "refresh-token",
      expires_in: 3600,
      scope: "docs.read",
    };
    const clientInformation = {
      client_id: "client-id",
      client_secret: "client-secret",
      redirect_uris: ["http://localhost/callback"],
    };

    expect(
      normalizePersistedAuthState({
        tokens,
        clientInformation,
      }),
    ).toEqual({
      tokens,
      clientInformation,
    });
  });

  it("keeps valid fields when neighboring fields are malformed", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        codeVerifier: 123,
        tokens: { refresh_token: "missing-access-token" },
        clientInformation: "not-client-info",
      }),
    ).toEqual({
      token: "bearer-token",
    });
  });
});

const createStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

const loadStorage = (storage: Storage) =>
  createTapRoot(function McpStorageRoot() {
    return useResource(
      McpLocalStorage({
        keyPrefix: "test-mcp",
        storage,
      }),
    );
  }).getValue();

describe("McpLocalStorage auth state", () => {
  it("normalizes loaded auth state from localStorage", async () => {
    const storage = createStorage();
    storage.setItem(
      "test-mcp:auth:docs",
      JSON.stringify({
        token: "bearer-token",
        codeVerifier: 123,
        tokens: "not-tokens",
      }),
    );

    await expect(loadStorage(storage).loadAuthState("docs")).resolves.toEqual({
      token: "bearer-token",
    });
  });
});
