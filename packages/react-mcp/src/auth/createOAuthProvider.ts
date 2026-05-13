import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { MCPStorage } from "../resources/storage/types";
import type { MCPAuthConfig } from "../mcp-scope";

const STATE_PREFIX = "aui-mcp:";

function encodeServerIdInState(serverId: string): string {
  const b64 = btoa(unescape(encodeURIComponent(serverId)));
  const urlSafe = b64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${STATE_PREFIX}${urlSafe}`;
}

export function decodeServerIdFromState(state: string): string | null {
  if (!state.startsWith(STATE_PREFIX)) return null;
  const dot = state.indexOf(".", STATE_PREFIX.length);
  const encoded =
    dot === -1
      ? state.slice(STATE_PREFIX.length)
      : state.slice(STATE_PREFIX.length, dot);
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

export type CreateOAuthProviderOptions = {
  serverId: string;
  /** Must be `auth.type === "oauth"`. */
  config: Extract<MCPAuthConfig, { type: "oauth" }>;
  storage: MCPStorage;
  redirectUri: string;
  /** Called by the SDK to start the authorization redirect. */
  onAuthorizationUrl: (url: URL) => void;
};

/**
 * Builds an OAuthClientProvider for the MCP SDK, backed by MCPStorage.
 * Token refresh and DCR are handled by the SDK; this provider only mediates
 * load/save and the redirect step.
 */
export function createOAuthProvider(
  opts: CreateOAuthProviderOptions,
): OAuthClientProvider {
  const { serverId, config, storage, redirectUri, onAuthorizationUrl } = opts;

  type Cache = {
    tokens?: OAuthTokens | undefined;
    clientInformation?: OAuthClientInformationFull | undefined;
    codeVerifier?: string | undefined;
  };
  let cached: Cache | null = null;

  const loadCache = async (): Promise<Cache> => {
    if (cached) return cached;
    const persisted = await storage.loadAuthState(serverId);
    const initial: Cache = {};
    if (persisted?.tokens) initial.tokens = persisted.tokens;
    if (config.clientId) {
      const ci: OAuthClientInformationFull = {
        client_id: config.clientId,
        redirect_uris: [redirectUri],
      };
      if (config.clientSecret) ci.client_secret = config.clientSecret;
      initial.clientInformation = ci;
    } else if (persisted?.clientInformation) {
      initial.clientInformation = persisted.clientInformation;
    }
    if (persisted?.codeVerifier) initial.codeVerifier = persisted.codeVerifier;
    cached = initial;
    return cached;
  };

  const persist = async () => {
    const c = cached;
    if (!c) return;
    const next: Parameters<typeof storage.saveAuthState>[1] = {};
    if (c.tokens) next.tokens = c.tokens;
    if (c.clientInformation) next.clientInformation = c.clientInformation;
    if (c.codeVerifier) next.codeVerifier = c.codeVerifier;
    await storage.saveAuthState(serverId, next);
  };

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
      return `${encodeServerIdInState(serverId)}.${nonce}`;
    },
    async clientInformation() {
      const c = await loadCache();
      return c.clientInformation;
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
      await persist();
    },
    async redirectToAuthorization(url) {
      onAuthorizationUrl(url);
    },
    async saveCodeVerifier(codeVerifier) {
      const c = await loadCache();
      c.codeVerifier = codeVerifier;
      await persist();
    },
    async codeVerifier() {
      const c = await loadCache();
      if (!c.codeVerifier) {
        throw new Error("No code verifier saved for this OAuth flow");
      }
      return c.codeVerifier;
    },
    async invalidateCredentials(scope) {
      const c = await loadCache();
      if (scope === "all" || scope === "tokens") delete c.tokens;
      if (scope === "all" || scope === "client") delete c.clientInformation;
      if (scope === "all" || scope === "verifier") delete c.codeVerifier;
      await persist();
    },
  };
}
