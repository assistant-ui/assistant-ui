import type { OAuthDiscoveryState } from "@modelcontextprotocol/client";
import { describe, expect, it, vi } from "vitest";
import type { MCPStorage } from "../resources/storage/types";
import type { MCPPersistedAuthState } from "./types";
import {
  clearOAuthProviderAuthState,
  createOAuthProvider,
} from "./createOAuthProvider";

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

describe("createOAuthProvider callback state", () => {
  it("persists the generated state with the PKCE verifier", async () => {
    const { storage, getState } = createStorage();
    const provider = createProvider(storage);

    const state = await provider.state?.();
    await provider.saveCodeVerifier("pkce-verifier");

    expect(state).toMatch(/^aui-mcp:ZG9jcw\./);
    expect(getState()).toEqual({
      codeVerifier: "pkce-verifier",
      state,
    });
  });

  it("consumes callback state when tokens are saved", async () => {
    const { storage, getState } = createStorage({
      codeVerifier: "pkce-verifier",
      state: "aui-mcp:ZG9jcw.nonce",
    });
    const provider = createProvider(storage);

    await provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });

    expect(getState()).toEqual({
      tokens: { access_token: "access-token", token_type: "bearer" },
      codeVerifier: "pkce-verifier",
    });
  });

  it.each(["verifier", "all"] as const)(
    "clears callback state through the %s invalidation scope",
    async (scope) => {
      const { storage, getState } = createStorage({
        codeVerifier: "pkce-verifier",
        state: "aui-mcp:ZG9jcw.nonce",
      });
      const provider = createProvider(storage);

      await provider.invalidateCredentials?.(scope);

      expect(getState()).toEqual({});
    },
  );
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

describe("createOAuthProvider persistence", () => {
  it("loads persisted auth state once for concurrent reads", async () => {
    let resolveLoad!: (value: MCPPersistedAuthState | null) => void;
    const loadAuthState = vi.fn(
      () =>
        new Promise<MCPPersistedAuthState | null>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { storage } = createStorage();
    storage.loadAuthState = loadAuthState;
    const provider = createProvider(storage);

    const tokens = provider.tokens();
    const clientInformation = provider.clientInformation();

    expect(loadAuthState).toHaveBeenCalledTimes(1);
    resolveLoad(null);
    await Promise.all([tokens, clientInformation]);
  });

  it("retries loading persisted auth state after a failure", async () => {
    const failure = new Error("storage unavailable");
    const loadAuthState = vi
      .fn<() => Promise<MCPPersistedAuthState | null>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ codeVerifier: "pkce-verifier" });
    const { storage } = createStorage();
    storage.loadAuthState = loadAuthState;
    const provider = createProvider(storage);

    const tokens = provider.tokens();
    const clientInformation = provider.clientInformation();

    await expect(tokens).rejects.toBe(failure);
    await expect(clientInformation).rejects.toBe(failure);
    expect(loadAuthState).toHaveBeenCalledTimes(1);

    await expect(provider.codeVerifier()).resolves.toBe("pkce-verifier");
    expect(loadAuthState).toHaveBeenCalledTimes(2);
  });

  it("serializes writes so newer auth state is not overwritten", async () => {
    const { storage } = createStorage();
    const pendingWrites: Array<() => void> = [];
    let persisted: MCPPersistedAuthState | null = null;
    storage.saveAuthState = async (_serverId, next) => {
      await new Promise<void>((resolve) => pendingWrites.push(resolve));
      persisted = next;
    };
    const provider = createProvider(storage);
    await provider.tokens();

    const tokenSave = provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });
    await vi.waitFor(() => expect(pendingWrites).toHaveLength(1));

    const verifierSave = provider.saveCodeVerifier("pkce-verifier");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(pendingWrites).toHaveLength(1);

    pendingWrites.shift()!();
    await vi.waitFor(() => expect(pendingWrites).toHaveLength(1));
    pendingWrites.shift()!();
    await Promise.all([tokenSave, verifierSave]);

    expect(persisted).toEqual({
      tokens: { access_token: "access-token", token_type: "bearer" },
      codeVerifier: "pkce-verifier",
    });
  });

  it("continues persisting after a failed auth state write", async () => {
    const { storage } = createStorage();
    const failure = new Error("storage unavailable");
    let saveCount = 0;
    let persisted: MCPPersistedAuthState | null = null;
    let rejectFirstSave!: (reason: unknown) => void;
    storage.saveAuthState = async (_serverId, next) => {
      saveCount += 1;
      if (saveCount === 1) {
        await new Promise<void>((_resolve, reject) => {
          rejectFirstSave = reject;
        });
      }
      persisted = next;
    };
    const provider = createProvider(storage);
    await provider.tokens();

    const tokenSave = provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });
    const verifierSave = provider.saveCodeVerifier("pkce-verifier");

    await vi.waitFor(() => expect(saveCount).toBe(1));
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(saveCount).toBe(1);

    const tokenSaveResult = expect(tokenSave).rejects.toBe(failure);
    rejectFirstSave(failure);
    await tokenSaveResult;
    await expect(verifierSave).resolves.toBeUndefined();
    expect(saveCount).toBe(2);
    expect(persisted).toEqual({
      tokens: { access_token: "access-token", token_type: "bearer" },
      codeVerifier: "pkce-verifier",
    });
  });
});

describe("createOAuthProvider persistence across provider instances", () => {
  it("shares one auth state load across provider instances", async () => {
    let resolveLoad!: (value: MCPPersistedAuthState | null) => void;
    const loadAuthState = vi.fn(
      () =>
        new Promise<MCPPersistedAuthState | null>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { storage } = createStorage();
    storage.loadAuthState = loadAuthState;
    const provider = createProvider(storage);
    const replacementProvider = createProvider(storage);

    const tokens = provider.tokens();
    const clientInformation = replacementProvider.clientInformation();

    expect(loadAuthState).toHaveBeenCalledTimes(1);
    resolveLoad(null);
    await Promise.all([tokens, clientInformation]);
  });

  it("serializes writes across provider instances", async () => {
    const { storage } = createStorage();
    const pendingWrites: Array<() => void> = [];
    let persisted: MCPPersistedAuthState | null = null;
    storage.saveAuthState = async (_serverId, next) => {
      await new Promise<void>((resolve) => pendingWrites.push(resolve));
      persisted = next;
    };
    const provider = createProvider(storage);
    const replacementProvider = createProvider(storage);
    await Promise.all([provider.tokens(), replacementProvider.tokens()]);

    const tokenSave = provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });
    await vi.waitFor(() => expect(pendingWrites).toHaveLength(1));

    const verifierSave = replacementProvider.saveCodeVerifier("pkce-verifier");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(pendingWrites).toHaveLength(1);

    pendingWrites.shift()!();
    await vi.waitFor(() => expect(pendingWrites).toHaveLength(1));
    pendingWrites.shift()!();
    await Promise.all([tokenSave, verifierSave]);

    expect(persisted).toEqual({
      tokens: { access_token: "access-token", token_type: "bearer" },
      codeVerifier: "pkce-verifier",
    });
  });

  it("clears after a pending write and fences the discarded provider", async () => {
    const { storage, getState } = createStorage();
    const pendingWrites: Array<() => void> = [];
    const saveAuthState = storage.saveAuthState;
    storage.saveAuthState = async (serverId, next) => {
      await new Promise<void>((resolve) => pendingWrites.push(resolve));
      await saveAuthState(serverId, next);
    };
    const clearAuthState = vi.spyOn(storage, "clearAuthState");
    const provider = createProvider(storage);
    await provider.tokens();

    const save = provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });
    await vi.waitFor(() => expect(pendingWrites).toHaveLength(1));

    const clear = clearOAuthProviderAuthState(storage, "docs");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(clearAuthState).not.toHaveBeenCalled();

    pendingWrites.shift()!();
    await expect(save).resolves.toBeUndefined();
    await clear;
    expect(clearAuthState).toHaveBeenCalledTimes(1);
    expect(getState()).toBeNull();

    storage.saveAuthState = saveAuthState;
    await provider.saveCodeVerifier("late-verifier");
    expect(getState()).toBeNull();
  });

  it("re-derives static client information for a replacement provider", async () => {
    const { storage } = createStorage();
    const provider = createOAuthProvider({
      serverId: "docs",
      config: { type: "oauth", clientId: "client-a" },
      storage,
      redirectUri: "http://localhost/callback",
      onAuthorizationUrl: () => {},
    });
    await expect(provider.clientInformation()).resolves.toEqual({
      client_id: "client-a",
      redirect_uris: ["http://localhost/callback"],
    });

    const replacementProvider = createOAuthProvider({
      serverId: "docs",
      config: { type: "oauth", clientId: "client-b", clientSecret: "secret-b" },
      storage,
      redirectUri: "http://localhost/callback-2",
      onAuthorizationUrl: () => {},
    });
    await expect(replacementProvider.clientInformation()).resolves.toEqual({
      client_id: "client-b",
      client_secret: "secret-b",
      redirect_uris: ["http://localhost/callback-2"],
    });
  });

  it("does not leak static client information to a dynamic provider", async () => {
    const { storage } = createStorage();
    const staticProvider = createOAuthProvider({
      serverId: "docs",
      config: { type: "oauth", clientId: "client-a" },
      storage,
      redirectUri: "http://localhost/callback",
      onAuthorizationUrl: () => {},
    });
    await expect(staticProvider.clientInformation()).resolves.toEqual({
      client_id: "client-a",
      redirect_uris: ["http://localhost/callback"],
    });

    const dynamicProvider = createProvider(storage);
    await expect(dynamicProvider.clientInformation()).resolves.toBeUndefined();
  });

  it("keeps a provider built while the clear is in flight usable", async () => {
    const { storage, getState } = createStorage();
    let releaseClear: (() => void) | undefined;
    const clearAuthState = storage.clearAuthState;
    storage.clearAuthState = async (serverId) => {
      await new Promise<void>((resolve) => {
        releaseClear = resolve;
      });
      await clearAuthState(serverId);
    };
    const provider = createProvider(storage);
    await provider.saveTokens({
      access_token: "access-token",
      token_type: "bearer",
    });

    const clear = clearOAuthProviderAuthState(storage, "docs");
    await vi.waitFor(() => expect(releaseClear).toBeTypeOf("function"));

    const replacementProvider = createProvider(storage);
    releaseClear!();
    await clear;
    expect(getState()).toBeNull();

    await replacementProvider.saveCodeVerifier("new-verifier");
    expect(getState()).toEqual({ codeVerifier: "new-verifier" });
  });
});
