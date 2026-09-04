import { createTapRoot, resource, useResource } from "@assistant-ui/tap";
import { useState } from "react";
import { auth, type FetchLike } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { createOAuthProvider } from "../../auth/createOAuthProvider";

import type { MCPStorage } from "./types";
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

  it("strips malformed connection timeouts without dropping servers", () => {
    expect(
      normalizeCustomServerRecords([
        { ...validRecord, id: "string-timeout", connectionTimeout: "10000" },
        { ...validRecord, id: "null-timeout", connectionTimeout: null },
        { ...validRecord, id: "negative-timeout", connectionTimeout: -1 },
        { ...validRecord, id: "nan-timeout", connectionTimeout: Number.NaN },
        {
          ...validRecord,
          id: "infinite-timeout",
          connectionTimeout: Number.POSITIVE_INFINITY,
        },
      ]),
    ).toEqual([
      { ...validRecord, id: "string-timeout" },
      { ...validRecord, id: "null-timeout" },
      { ...validRecord, id: "negative-timeout" },
      { ...validRecord, id: "nan-timeout" },
      { ...validRecord, id: "infinite-timeout" },
    ]);
  });

  it("accepts finite non-negative connection timeouts", () => {
    expect(
      normalizeCustomServerRecords([
        { ...validRecord, connectionTimeout: 0 },
        { ...validRecord, connectionTimeout: 10_000 },
      ]),
    ).toEqual([
      { ...validRecord, connectionTimeout: 0 },
      { ...validRecord, connectionTimeout: 10_000 },
    ]);
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
        tokens: {
          access_token: "access-token",
          token_type: "Bearer",
          expires_in: Number.POSITIVE_INFINITY,
        },
        clientInformation: { client_id: "client-id" },
      }),
    ).toBeNull();
  });

  it("keeps valid bearer and OAuth callback state", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        codeVerifier: "pkce-verifier",
        state: "aui-mcp:ZG9jcw.nonce",
      }),
    ).toEqual({
      token: "bearer-token",
      codeVerifier: "pkce-verifier",
      state: "aui-mcp:ZG9jcw.nonce",
    });
  });

  it("keeps valid server URL bindings", () => {
    expect(
      normalizePersistedAuthState({
        serverUrl: "http://mcp.example.com/docs",
        token: "bearer-token",
      }),
    ).toEqual({
      serverUrl: "http://mcp.example.com/docs",
      token: "bearer-token",
    });
  });

  it("rejects auth state with an unsafe server URL binding", () => {
    expect(
      normalizePersistedAuthState({
        serverUrl: "javascript:alert(1)",
        token: "bearer-token",
      }),
    ).toBeNull();
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

  it("keeps valid OAuth discovery state", () => {
    const discoveryState = {
      authorizationServerUrl: "https://auth.example.com",
      resourceMetadataUrl:
        "https://mcp.example.com/.well-known/oauth-protected-resource",
      authorizationServerMetadata: {
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
      },
      resourceMetadata: {
        resource: "https://mcp.example.com",
        authorization_servers: ["https://auth.example.com"],
      },
    };

    expect(normalizePersistedAuthState({ discoveryState })).toEqual({
      discoveryState,
    });
  });

  it("drops malformed OAuth discovery state", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        discoveryState: {
          authorizationServerUrl: "not-a-url",
        },
      }),
    ).toEqual({ token: "bearer-token" });
  });

  it("keeps the URL binding when optional discovery fields are malformed", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        discoveryState: {
          authorizationServerUrl: "https://auth.example.com",
          authorizationServerMetadata: { issuer: 123 },
          resourceMetadata: { resource: 42 },
        },
      }),
    ).toEqual({
      token: "bearer-token",
      discoveryState: {
        authorizationServerUrl: "https://auth.example.com",
      },
    });
  });

  it.each([
    "http://auth.example.com",
    "data:text/plain,auth",
    "file:///tmp/auth",
  ])("drops discovery state with an unsafe URL: %s", (url) => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        discoveryState: { authorizationServerUrl: url },
      }),
    ).toEqual({ token: "bearer-token" });
  });

  it.each([
    "http://localhost:3000",
    "http://foo.localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.2:3000",
    "http://[::1]:3000",
  ])("keeps loopback HTTP discovery URLs: %s", (url) => {
    expect(
      normalizePersistedAuthState({
        discoveryState: { authorizationServerUrl: url },
      }),
    ).toEqual({
      discoveryState: { authorizationServerUrl: url },
    });
  });

  it("drops an unsafe resource metadata URL but keeps the binding", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        discoveryState: {
          authorizationServerUrl: "https://auth.example.com",
          resourceMetadataUrl: "http://mcp.example.com/oauth-resource",
        },
      }),
    ).toEqual({
      token: "bearer-token",
      discoveryState: {
        authorizationServerUrl: "https://auth.example.com",
      },
    });
  });

  it("keeps valid fields when neighboring fields are malformed", () => {
    expect(
      normalizePersistedAuthState({
        token: "bearer-token",
        codeVerifier: 123,
        tokens: { access_token: "access-token" },
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

describe("McpLocalStorage custom servers", () => {
  it("strips malformed connection timeouts when loading", async () => {
    const storage = createStorage();
    storage.setItem(
      "test-mcp:custom-servers",
      JSON.stringify([
        validRecord,
        {
          ...validRecord,
          id: "bad-timeout",
          connectionTimeout: "immediately",
        },
      ]),
    );

    await expect(loadStorage(storage).loadCustomServers()).resolves.toEqual([
      validRecord,
      { ...validRecord, id: "bad-timeout" },
    ]);
  });
});

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

  it("completes an SDK callback with discovery state from localStorage", async () => {
    const storage = createStorage();
    const requests: Array<{ method: string; url: string }> = [];
    const fetchFn: FetchLike = async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      requests.push({ method: init?.method ?? "GET", url: url.toString() });

      if (url.pathname === "/.well-known/oauth-protected-resource") {
        return Response.json({
          resource: "https://mcp.example.com/mcp",
          authorization_servers: ["https://auth.example.com"],
        });
      }
      if (url.pathname === "/.well-known/oauth-authorization-server") {
        return Response.json({
          issuer: "https://auth.example.com",
          authorization_endpoint: "https://auth.example.com/authorize",
          token_endpoint: "https://auth.example.com/token",
          response_types_supported: ["code"],
          code_challenge_methods_supported: ["S256"],
        });
      }
      if (url.pathname === "/token") {
        return Response.json({
          access_token: "access-token",
          token_type: "Bearer",
        });
      }
      throw new Error(`Unexpected OAuth request: ${url}`);
    };
    const authorizationUrls: URL[] = [];
    const createProvider = () =>
      createOAuthProvider({
        serverId: "docs",
        serverUrl: "https://mcp.example.com/mcp",
        config: { type: "oauth", clientId: "client-id" },
        storage: loadStorage(storage),
        redirectUri: "http://localhost/callback",
        onAuthorizationUrl: (url) => authorizationUrls.push(url),
      });
    const redirectProvider = createProvider();

    await expect(
      auth(redirectProvider, {
        serverUrl: "https://mcp.example.com/mcp",
        resourceMetadataUrl: new URL(
          "https://mcp.example.com/.well-known/oauth-protected-resource",
        ),
        fetchFn,
      }),
    ).resolves.toBe("REDIRECT");
    expect(authorizationUrls).toHaveLength(1);
    expect(
      JSON.parse(storage.getItem("test-mcp:auth:docs") ?? "null"),
    ).toMatchObject({
      codeVerifier: expect.any(String),
      state: authorizationUrls[0]!.searchParams.get("state"),
      discoveryState: {
        authorizationServerUrl: "https://auth.example.com",
      },
    });

    requests.length = 0;
    const callbackProvider = createProvider();
    await expect(
      auth(callbackProvider, {
        serverUrl: "https://mcp.example.com/mcp",
        authorizationCode: "authorization-code",
        fetchFn,
      }),
    ).resolves.toBe("AUTHORIZED");
    expect(requests).toEqual([
      { method: "POST", url: "https://auth.example.com/token" },
    ]);
    await expect(
      loadStorage(storage).loadAuthState("docs"),
    ).resolves.toMatchObject({
      tokens: { access_token: "access-token" },
    });
  });
});

describe("McpLocalStorage instance identity", () => {
  it("derives a scope from the prefix for the shared default backing", () => {
    let storage!: MCPStorage;

    createTapRoot(function McpStorageScopeRoot() {
      storage = useResource(McpLocalStorage({ keyPrefix: "test-mcp" }));
      return storage;
    });

    expect(storage.scopeId).toBe("local-storage:test-mcp");
  });

  it("declares no scope for a custom backing store unless one is named", () => {
    const backing = createStorage();
    let unnamed!: MCPStorage;
    let named!: MCPStorage;

    createTapRoot(function McpStorageCustomScopeRoot() {
      unnamed = useResource(
        McpLocalStorage({ keyPrefix: "test-mcp", storage: backing }),
      );
      return unnamed;
    });
    createTapRoot(function McpStorageNamedScopeRoot() {
      named = useResource(
        McpLocalStorage({
          keyPrefix: "test-mcp",
          storage: backing,
          scopeId: "session:alpha",
        }),
      );
      return named;
    });

    expect(unnamed.scopeId).toBeUndefined();
    expect(named.scopeId).toBe("session:alpha");
  });

  it("returns the same instance across re-renders", () => {
    const backing = createStorage();
    const seen: MCPStorage[] = [];
    let rerender!: () => void;

    const useHost = () => {
      const [, setTick] = useState(0);
      rerender = () => setTick((n) => n + 1);
      const storage = useResource(
        McpLocalStorage({ keyPrefix: "test-mcp", storage: backing }),
      );
      seen.push(storage);
      return storage;
    };
    const Host = resource(useHost);

    createTapRoot(function McpStorageIdentityRoot() {
      return useResource(Host());
    });
    rerender();
    rerender();

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});
