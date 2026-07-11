import { resource } from "@assistant-ui/tap";
import {
  OAuthClientInformationFullSchema,
  OAuthTokensSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { MCPAuthConfig, MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";
import { assertValidServerId } from "../../utils/serverId";
import type { MCPStorage } from "./types";

export type McpLocalStorageOptions = {
  /** Namespace prefix for keys. Default "aui-mcp". */
  keyPrefix?: string;
  /** Override the underlying Storage. Defaults to globalThis.localStorage. */
  storage?: Storage;
};

function resolveStorage(opts: McpLocalStorageOptions): Storage | null {
  if (opts.storage) return opts.storage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    try {
      return (globalThis as { localStorage: Storage }).localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isOptionalNonEmptyString = (
  value: unknown,
): value is string | undefined =>
  value === undefined || isNonEmptyString(value);

const isOptionalStringArray = (value: unknown): value is string[] | undefined =>
  value === undefined ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

const isValidServerId = (id: string): boolean => {
  try {
    assertValidServerId(id);
    return true;
  } catch {
    return false;
  }
};

const isMCPAuthConfig = (auth: unknown): auth is MCPAuthConfig => {
  if (!isRecord(auth)) return false;

  switch (auth.type) {
    case "none":
      return true;
    case "bearer":
      return isOptionalNonEmptyString(auth.token);
    case "oauth":
      return (
        isOptionalStringArray(auth.scopes) &&
        isOptionalString(auth.authorizationEndpoint) &&
        isOptionalString(auth.tokenEndpoint) &&
        isOptionalString(auth.registrationEndpoint) &&
        isOptionalString(auth.clientId) &&
        isOptionalString(auth.clientSecret)
      );
    default:
      return false;
  }
};

const isCustomServerRecord = (
  value: unknown,
): value is MCPCustomServerRecord => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !isValidServerId(value.id)) {
    return false;
  }
  return (
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.url) &&
    Number.isFinite(value.createdAt) &&
    isMCPAuthConfig(value.auth)
  );
};

export const normalizeCustomServerRecords = (
  value: unknown,
): MCPCustomServerRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isCustomServerRecord);
};

const normalizeOAuthTokens = (
  value: unknown,
): MCPPersistedAuthState["tokens"] | undefined => {
  const result = OAuthTokensSchema.safeParse(value);
  return result.success ? result.data : undefined;
};

const normalizeClientInformation = (
  value: unknown,
): MCPPersistedAuthState["clientInformation"] | undefined => {
  const result = OAuthClientInformationFullSchema.safeParse(value);
  return result.success ? result.data : undefined;
};

export const normalizePersistedAuthState = (
  value: unknown,
): MCPPersistedAuthState | null => {
  if (!isRecord(value)) return null;

  const state: MCPPersistedAuthState = {};
  if (isNonEmptyString(value.token)) state.token = value.token;
  if (isNonEmptyString(value.codeVerifier)) {
    state.codeVerifier = value.codeVerifier;
  }

  const tokens = normalizeOAuthTokens(value.tokens);
  if (tokens) state.tokens = tokens;

  const clientInformation = normalizeClientInformation(value.clientInformation);
  if (clientInformation) state.clientInformation = clientInformation;

  return Object.keys(state).length > 0 ? state : null;
};

const useMcpLocalStorage = (opts: McpLocalStorageOptions = {}): MCPStorage => {
  const prefix = opts.keyPrefix ?? "aui-mcp";
  const customServersKey = `${prefix}:custom-servers`;
  const authKey = (id: string) => `${prefix}:auth:${id}`;
  const storage = resolveStorage(opts);

  const read = <T>(key: string, fallback: T): T => {
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const write = (key: string, value: unknown): void => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // quota or serialization failure — silently drop
    }
  };

  const remove = (key: string): void => {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return {
    loadCustomServers: async () =>
      normalizeCustomServerRecords(read<unknown>(customServersKey, [])),
    saveCustomServers: async (records) => {
      write(customServersKey, records);
    },
    loadAuthState: async (id) =>
      normalizePersistedAuthState(read<unknown>(authKey(id), null)),
    saveAuthState: async (id, state) => {
      write(authKey(id), state);
    },
    clearAuthState: async (id) => {
      remove(authKey(id));
    },
  };
};

export const McpLocalStorage = resource(useMcpLocalStorage);
