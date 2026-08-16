import type { OAuthDiscoveryState } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import type { MCPStorage } from "../resources/storage/types";
import type { MCPPersistedAuthState } from "./types";
import { createOAuthProvider } from "./createOAuthProvider";

const discoveryState: OAuthDiscoveryState = {
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

const createStorage = (initial: MCPPersistedAuthState | null = null) => {
  let state = initial;
  const storage: MCPStorage = {
    loadCustomServers: async () => [],
    saveCustomServers: async () => {},
    loadAuthState: async () => state,
    saveAuthState: async (_serverId, next) => {
      state = next;
    },
    clearAuthState: async () => {
      state = null;
    },
  };
  return { storage, getState: () => state };
};

const createProvider = (storage: MCPStorage) =>
  createOAuthProvider({
    serverId: "docs",
    config: { type: "oauth" },
    storage,
    redirectUri: "http://localhost/callback",
    onAuthorizationUrl: () => {},
  });

describe("createOAuthProvider discovery state", () => {
  it("persists discovery state alongside the PKCE verifier", async () => {
    const { storage, getState } = createStorage({
      codeVerifier: "pkce-verifier",
    });
    const provider = createProvider(storage);

    await provider.saveDiscoveryState?.(discoveryState);

    expect(getState()).toEqual({
      codeVerifier: "pkce-verifier",
      discoveryState,
    });
  });

  it("restores discovery state on the OAuth callback leg", async () => {
    const { storage } = createStorage({ discoveryState });
    const provider = createProvider(storage);

    await expect(provider.discoveryState?.()).resolves.toEqual(discoveryState);
  });

  it.each(["discovery", "all"] as const)(
    "clears discovery state through the %s invalidation scope",
    async (scope) => {
      const { storage, getState } = createStorage({
        codeVerifier: "pkce-verifier",
        discoveryState,
      });
      const provider = createProvider(storage);

      await provider.invalidateCredentials?.(scope);

      expect(getState()).toEqual(
        scope === "all" ? {} : { codeVerifier: "pkce-verifier" },
      );
    },
  );
});
