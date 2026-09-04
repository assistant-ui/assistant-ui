import type {
  OAuthClientProvider,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthDiscoveryState,
  OAuthTokens,
} from "@modelcontextprotocol/client";
import type { MCPStorage } from "../resources/storage/types";
import type { MCPAuthConfig } from "../mcp-scope";
import {
  isAuthStateForServerUrl,
  normalizeMcpServerUrl,
} from "../utils/serverUrl";

const STATE_PREFIX = "aui-mcp:";

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded =
    b64url.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeServerIdInState(serverId: string): string {
  const bytes = new TextEncoder().encode(serverId);
  return `${STATE_PREFIX}${bytesToBase64Url(bytes)}`;
}

export function decodeServerIdFromState(state: string): string | null {
  if (!state.startsWith(STATE_PREFIX)) return null;
  const dot = state.indexOf(".", STATE_PREFIX.length);
  const encoded =
    dot === -1
      ? state.slice(STATE_PREFIX.length)
      : state.slice(STATE_PREFIX.length, dot);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      base64UrlToBytes(encoded),
    );
  } catch {
    return null;
  }
}

export type CreateOAuthProviderOptions = {
  serverId: string;
  serverUrl: string;
  /** Must be `auth.type === "oauth"`. */
  config: Extract<MCPAuthConfig, { type: "oauth" }>;
  storage: MCPStorage;
  redirectUri: string;
  /** Called by the SDK to start the authorization redirect. */
  onAuthorizationUrl: (url: URL) => void;
};

type OAuthProviderCache = {
  tokens?: OAuthTokens | undefined;
  clientInformation?: OAuthClientInformationFull | undefined;
  codeVerifier?: string | undefined;
  state?: string | undefined;
  discoveryState?: OAuthDiscoveryState | undefined;
};

type OAuthProviderEndpointCache = {
  serverUrl: string;
  cached: OAuthProviderCache | null;
  cachePromise: Promise<OAuthProviderCache> | null;
  invalidated: boolean;
};

type OAuthProviderPersistence = {
  endpoint: OAuthProviderEndpointCache | null;
  queue: Promise<void>;
  invalidated: boolean;
};

// scopeId, not object identity, is what addresses the same persisted data, so
// storages sharing one share an anchor and an unscoped storage is its own
// identity. Every storage declaring a scope holds that scope's anchor, so the
// coordination state below is collected once the last of them is gone.
const anchorByStorage = new WeakMap<MCPStorage, object>();
const anchorByScope = new Map<string, WeakRef<object>>();
const anchorRegistry = new FinalizationRegistry<string>((scopeId) => {
  if (!anchorByScope.get(scopeId)?.deref()) anchorByScope.delete(scopeId);
});

const getStorageIdentity = (storage: MCPStorage): object => {
  const existing = anchorByStorage.get(storage);
  if (existing) return existing;

  const { scopeId } = storage;
  if (scopeId === undefined) return storage;

  let anchor = anchorByScope.get(scopeId)?.deref();
  if (!anchor) {
    anchor = {};
    anchorByScope.set(scopeId, new WeakRef(anchor));
    anchorRegistry.register(anchor, scopeId);
  }
  anchorByStorage.set(storage, anchor);
  return anchor;
};

// McpServerResource builds a fresh provider for every transport, so the cache,
// the in-flight load, and the write queue have to outlive any one provider.
// saveAuthState replaces the whole record, so two providers writing their own
// snapshots concurrently would drop whichever field the loser had added.
const persistenceByIdentity = new WeakMap<
  object,
  Map<string, OAuthProviderPersistence>
>();

const getPersistence = (
  storage: MCPStorage,
  serverId: string,
  serverUrl: string,
): {
  persistence: OAuthProviderPersistence;
  endpoint: OAuthProviderEndpointCache;
} => {
  const identity = getStorageIdentity(storage);
  let byServerId = persistenceByIdentity.get(identity);
  if (!byServerId) {
    byServerId = new Map();
    persistenceByIdentity.set(identity, byServerId);
  }

  let persistence = byServerId.get(serverId);
  if (!persistence) {
    persistence = {
      endpoint: null,
      queue: Promise.resolve(),
      invalidated: false,
    };
    byServerId.set(serverId, persistence);
  }

  let endpoint = persistence.endpoint;
  if (endpoint?.serverUrl !== serverUrl) {
    if (endpoint) endpoint.invalidated = true;
    endpoint = {
      serverUrl,
      cached: null,
      cachePromise: null,
      invalidated: false,
    };
    persistence.endpoint = endpoint;
  }
  return { persistence, endpoint };
};

/**
 * Clears persisted OAuth state after the in-flight load and every queued write
 * for that server have settled, so a discarded provider cannot recreate the
 * record it was mid-save on.
 */
export const clearOAuthProviderAuthState = async (
  storage: MCPStorage,
  serverId: string,
): Promise<void> => {
  const identity = getStorageIdentity(storage);
  const byServerId = persistenceByIdentity.get(identity);
  const persistence = byServerId?.get(serverId);
  if (!byServerId || !persistence) {
    await storage.clearAuthState(serverId);
    return;
  }

  // Detaching the entry before awaiting keeps a provider built during the clear
  // on a fresh generation instead of inheriting the fenced one.
  persistence.invalidated = true;
  byServerId.delete(serverId);
  if (byServerId.size === 0) persistenceByIdentity.delete(identity);

  if (persistence.endpoint) persistence.endpoint.invalidated = true;
  const cachePromise = persistence.endpoint?.cachePromise;
  if (cachePromise) await Promise.allSettled([cachePromise]);
  await persistence.queue;
  await storage.clearAuthState(serverId);
};

/**
 * Builds an OAuthClientProvider for the MCP SDK, backed by MCPStorage.
 * Token refresh and DCR are handled by the SDK; this provider only mediates
 * load/save and the redirect step.
 */
export function createOAuthProvider(
  opts: CreateOAuthProviderOptions,
): OAuthClientProvider {
  const {
    serverId,
    serverUrl,
    config,
    storage,
    redirectUri,
    onAuthorizationUrl,
  } = opts;
  const normalizedServerUrl = normalizeMcpServerUrl(serverUrl);
  const { persistence, endpoint } = getPersistence(
    storage,
    serverId,
    normalizedServerUrl,
  );
  let pendingState: string | undefined;

  // The cache is shared with every other provider for this storage, server id,
  // and server URL, so a statically configured client stays a read-time overlay
  // owned by this provider. Writing it into the cache would leak this provider's
  // registration to a replacement built for a different, or absent, clientId.
  const staticClientInformation = (():
    | OAuthClientInformationFull
    | undefined => {
    if (!config.clientId) return undefined;
    const ci: OAuthClientInformationFull = {
      client_id: config.clientId,
      redirect_uris: [redirectUri],
    };
    if (config.clientSecret) ci.client_secret = config.clientSecret;
    return ci;
  })();

  const loadCache = (): Promise<OAuthProviderCache> => {
    if (endpoint.invalidated) return Promise.resolve({});
    if (endpoint.cached) return Promise.resolve(endpoint.cached);
    if (endpoint.cachePromise) return endpoint.cachePromise;

    endpoint.cachePromise = persistence.queue
      .then(() => storage.loadAuthState(serverId))
      .then(
        async (persisted) => {
          const initial: OAuthProviderCache = {};
          if (endpoint.invalidated) return initial;
          if (isAuthStateForServerUrl(persisted, normalizedServerUrl)) {
            if (persisted?.tokens) initial.tokens = persisted.tokens;
            if (persisted?.clientInformation)
              initial.clientInformation = persisted.clientInformation;
            if (persisted?.codeVerifier)
              initial.codeVerifier = persisted.codeVerifier;
            if (persisted?.state) initial.state = persisted.state;
            if (persisted?.discoveryState)
              initial.discoveryState = persisted.discoveryState;
          }
          endpoint.cached = initial;
          return initial;
        },
        (error) => {
          endpoint.cachePromise = null;
          throw error;
        },
      );
    return endpoint.cachePromise;
  };

  function persist() {
    const task = persistence.queue.then(async () => {
      if (persistence.invalidated || endpoint.invalidated) return;
      const c = endpoint.cached;
      if (!c) return;
      const next: Parameters<typeof storage.saveAuthState>[1] = {};
      if (c.tokens) next.tokens = c.tokens;
      if (c.clientInformation) next.clientInformation = c.clientInformation;
      if (c.codeVerifier) next.codeVerifier = c.codeVerifier;
      if (c.state) next.state = c.state;
      if (c.discoveryState) next.discoveryState = c.discoveryState;
      next.serverUrl = normalizedServerUrl;
      await storage.saveAuthState(serverId, next);
    });
    persistence.queue = task.catch(() => {});
    return task;
  }

  const clientMetadata: OAuthClientMetadata = {
    client_name: "assistant-ui",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: config.scopes?.join(" "),
  };

  return {
    get redirectUrl() {
      return redirectUri;
    },
    get clientMetadata() {
      return clientMetadata;
    },
    state() {
      // Embed the server id so the callback handler can route it back to the
      // right MCPServerResource without app-level wiring.
      const nonce =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}.${Math.random()}`;
      pendingState = `${encodeServerIdInState(serverId)}.${nonce}`;
      return pendingState;
    },
    async clientInformation() {
      const c = await loadCache();
      return staticClientInformation ?? c.clientInformation;
    },
    async saveClientInformation(info) {
      const c = await loadCache();
      c.clientInformation = info as OAuthClientInformationFull;
      await persist();
    },
    async tokens() {
      const c = await loadCache();
      return c.tokens;
    },
    async saveTokens(tokens) {
      const c = await loadCache();
      c.tokens = tokens;
      delete c.state;
      await persist();
    },
    async redirectToAuthorization(url) {
      onAuthorizationUrl(url);
    },
    async saveCodeVerifier(codeVerifier) {
      const c = await loadCache();
      c.codeVerifier = codeVerifier;
      if (pendingState) {
        c.state = pendingState;
        pendingState = undefined;
      }
      await persist();
    },
    async codeVerifier() {
      const c = await loadCache();
      if (!c.codeVerifier) {
        throw new Error("No code verifier saved for this OAuth flow");
      }
      return c.codeVerifier;
    },
    async saveDiscoveryState(discoveryState) {
      const c = await loadCache();
      c.discoveryState = discoveryState;
      await persist();
    },
    async discoveryState() {
      const c = await loadCache();
      return c.discoveryState;
    },
    async invalidateCredentials(scope) {
      const c = await loadCache();
      if (scope === "all" || scope === "tokens") delete c.tokens;
      if (scope === "all" || scope === "client") delete c.clientInformation;
      if (scope === "all" || scope === "verifier") {
        delete c.codeVerifier;
        delete c.state;
      }
      if (scope === "all" || scope === "discovery") delete c.discoveryState;
      await persist();
    },
  };
}
