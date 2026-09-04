import {
  CloudResponseError,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";

const AUTH_TOKEN_REQUEST_TIMEOUT_MS = 30_000;

const withAuthTokenDeadline = async <T>(
  operation: string,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, AUTH_TOKEN_REQUEST_TIMEOUT_MS);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (timedOut) {
      throw new Error(
        `Assistant Cloud ${operation} timed out after ${AUTH_TOKEN_REQUEST_TIMEOUT_MS}ms`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "jwt" | "api-key";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

const getJwtExpiry = (jwt: string): number => {
  try {
    const parts = jwt.split(".");
    const bodyPart = parts[1];
    if (!bodyPart) {
      throw new Error("Invalid JWT format");
    }

    // Convert from Base64Url to Base64 and add padding if necessary
    let base64 = bodyPart.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    // Decode the Base64 string and parse the payload
    const payload = atob(base64);
    const payloadObj = JSON.parse(payload);
    const exp = payloadObj.exp;

    if (!exp || typeof exp !== "number") {
      throw new Error('JWT does not contain a valid "exp" field');
    }

    // Convert expiration time to milliseconds
    return exp * 1000;
  } catch (error) {
    throw new Error(`Unable to determine the token expiry: ${error}`);
  }
};

type RefreshToken = {
  token: string;
  expires_at: string;
};

const readNonEmptyCloudString = (value: unknown, field: string): string => {
  const result = readCloudString(value, field);
  if (result.length === 0) {
    throw new CloudResponseError(
      `Invalid Assistant Cloud response for "${field}": expected a non-empty string`,
    );
  }
  return result;
};

const readRefreshTokenResponse = (
  value: unknown,
  field: string,
): RefreshToken => {
  const refreshToken = readCloudRecord(value, field);
  return {
    token: readNonEmptyCloudString(refreshToken.token, `${field}.token`),
    expires_at: readNonEmptyCloudString(
      refreshToken.expires_at,
      `${field}.expires_at`,
    ),
  };
};

const readAuthTokenResponse = async (
  response: Response,
  field: string,
): Promise<{ data: Record<string, unknown>; accessToken: string }> => {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new CloudResponseError(
      `Invalid Assistant Cloud response for "${field}": expected valid JSON`,
    );
  }

  const data = readCloudRecord(value, field);
  const accessToken = readNonEmptyCloudString(
    data.access_token,
    `${field}.access_token`,
  );
  return { data, accessToken };
};

export class AssistantCloudJWTAuthStrategy implements AssistantCloudAuthStrategy {
  public readonly strategy = "jwt";

  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;
  private tokenRequest: Promise<Record<string, string> | false> | null = null;
  #authTokenCallback: () => Promise<string | null>;

  constructor(authTokenCallback: () => Promise<string | null>) {
    this.#authTokenCallback = authTokenCallback;
  }

  public async getAuthHeaders(): Promise<Record<string, string> | false> {
    const currentTime = Date.now();

    // Use cached token if it's valid for at least 30 more seconds
    if (
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry - currentTime > 30 * 1000
    ) {
      return { Authorization: `Bearer ${this.cachedToken}` };
    }

    if (!this.tokenRequest) {
      this.tokenRequest = this.fetchAuthHeaders();
    }

    const tokenRequest = this.tokenRequest;
    try {
      return await tokenRequest;
    } finally {
      if (this.tokenRequest === tokenRequest) {
        this.tokenRequest = null;
      }
    }
  }

  private async fetchAuthHeaders(): Promise<Record<string, string> | false> {
    const token = await this.#authTokenCallback();
    if (!token) return false;

    this.cachedToken = token;
    this.tokenExpiry = getJwtExpiry(token);

    return { Authorization: `Bearer ${token}` };
  }

  public readAuthHeaders(headers: Headers) {
    const authHeader = headers.get("Authorization");
    if (!authHeader) return;

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new Error("Invalid auth header received");
    }

    this.cachedToken = token;
    this.tokenExpiry = getJwtExpiry(token);
  }
}

export class AssistantCloudAPIKeyAuthStrategy implements AssistantCloudAuthStrategy {
  public readonly strategy = "api-key";

  #apiKey: string;
  #userId: string;
  #workspaceId: string;

  constructor(apiKey: string, userId: string, workspaceId: string) {
    this.#apiKey = apiKey;
    this.#userId = userId;
    this.#workspaceId = workspaceId;
  }

  public async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${this.#apiKey}`,
      "Aui-User-Id": this.#userId,
      "Aui-Workspace-Id": this.#workspaceId,
    };
  }

  public readAuthHeaders() {
    // No operation needed for API key auth
  }
}

const LEGACY_AUI_REFRESH_TOKEN_NAME = "aui:refresh_token";

const getRefreshTokenName = (baseUrl: string): string =>
  `${LEGACY_AUI_REFRESH_TOKEN_NAME}:${baseUrl}`;

const removeLegacyRefreshToken = (storage: Storage): void => {
  try {
    storage.removeItem(LEGACY_AUI_REFRESH_TOKEN_NAME);
  } catch {}
};

const getLocalStorage = (): Storage | null => {
  if (!("localStorage" in globalThis)) return null;
  try {
    return (globalThis as { localStorage: Storage }).localStorage;
  } catch {
    return null;
  }
};

const readRefreshToken = (baseUrl: string): RefreshToken | undefined => {
  const storage = getLocalStorage();
  if (!storage) return undefined;
  try {
    const name = getRefreshTokenName(baseUrl);
    const value = storage.getItem(name);
    if (value) {
      removeLegacyRefreshToken(storage);
      return JSON.parse(value) as RefreshToken;
    }

    const legacyValue = storage.getItem(LEGACY_AUI_REFRESH_TOKEN_NAME);
    if (!legacyValue) return undefined;

    let refreshToken: RefreshToken;
    try {
      refreshToken = JSON.parse(legacyValue) as RefreshToken;
    } catch {
      removeLegacyRefreshToken(storage);
      return undefined;
    }

    storage.setItem(name, legacyValue);
    removeLegacyRefreshToken(storage);
    return refreshToken;
  } catch {
    return undefined;
  }
};

export const normalizeBaseUrl = (baseUrl: string): string => {
  if (!baseUrl || !baseUrl.endsWith("/")) return baseUrl;
  return baseUrl.slice(0, -1);
};

/** The refresh token of the anonymous identity this browser holds for `baseUrl`, or null when it has none. */
export const readAnonymousRefreshToken = (baseUrl: string): string | null => {
  const refreshToken = readRefreshToken(normalizeBaseUrl(baseUrl));
  if (!refreshToken) return null;
  const refreshExpiry = new Date(refreshToken.expires_at).getTime();
  return refreshExpiry - Date.now() > 30 * 1000 ? refreshToken.token : null;
};

const writeRefreshToken = (
  baseUrl: string,
  refreshToken: RefreshToken,
): void => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(getRefreshTokenName(baseUrl), JSON.stringify(refreshToken));
  } catch {}
};

const removeRefreshToken = (baseUrl: string): void => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(getRefreshTokenName(baseUrl));
  } catch {}
};

// In-flight sharing follows refresh-token storage scope to isolate server requests.
const anonymousAuthTokenRequests = new WeakMap<
  Storage,
  Map<string, Promise<string | null>>
>();

const getWebLockManager = (): LockManager | null => {
  if (!("navigator" in globalThis)) return null;
  return (
    (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks ??
    null
  );
};

const getAnonymousAuthLockName = (baseUrl: string): string =>
  `assistant-cloud:anonymous-auth:${baseUrl}`;

const getSharedAnonymousAuthToken = (
  baseUrl: string,
  requestToken: () => Promise<string | null>,
): Promise<string | null> => {
  const storage = getLocalStorage();
  if (!storage) return requestToken();

  let storageRequests = anonymousAuthTokenRequests.get(storage);
  if (!storageRequests) {
    storageRequests = new Map();
    anonymousAuthTokenRequests.set(storage, storageRequests);
  }

  const activeRequest = storageRequests.get(baseUrl);
  if (activeRequest) return activeRequest;

  const locks = getWebLockManager();
  const request = locks
    ? locks.request(getAnonymousAuthLockName(baseUrl), requestToken)
    : requestToken();
  const sharedRequest = request.finally(() => {
    if (storageRequests.get(baseUrl) === sharedRequest) {
      storageRequests.delete(baseUrl);
    }
  });
  storageRequests.set(baseUrl, sharedRequest);
  return sharedRequest;
};

export class AssistantCloudAnonymousAuthStrategy implements AssistantCloudAuthStrategy {
  public readonly strategy = "anon";

  private baseUrl: string;
  private jwtStrategy: AssistantCloudJWTAuthStrategy;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    const requestAuthToken = async (): Promise<string | null> => {
      const currentTime = Date.now();
      const storedRefreshToken = readRefreshToken(this.baseUrl);

      if (storedRefreshToken) {
        const refreshExpiry = new Date(storedRefreshToken.expires_at).getTime();
        if (refreshExpiry - currentTime > 30 * 1000) {
          const refreshedAccessToken = await withAuthTokenDeadline(
            "refresh token request",
            async (signal) => {
              const response = await fetch(
                `${this.baseUrl}/v1/auth/tokens/refresh`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    refresh_token: storedRefreshToken.token,
                  }),
                  signal,
                },
              );

              if (response.ok) {
                const { data, accessToken } = await readAuthTokenResponse(
                  response,
                  "refresh auth token response",
                );
                if (data.refresh_token != null) {
                  writeRefreshToken(
                    this.baseUrl,
                    readRefreshTokenResponse(
                      data.refresh_token,
                      "refresh auth token response.refresh_token",
                    ),
                  );
                }
                return accessToken;
              }

              if (response.status === 429 || response.status >= 500) {
                throw new Error(
                  `Assistant Cloud token refresh failed with status ${response.status}`,
                );
              }

              return null;
            },
          );
          if (refreshedAccessToken !== null) return refreshedAccessToken;
        } else {
          removeRefreshToken(this.baseUrl);
        }
      }

      // No valid refresh token; request a new anonymous token
      return withAuthTokenDeadline(
        "anonymous token request",
        async (signal) => {
          const response = await fetch(
            `${this.baseUrl}/v1/auth/tokens/anonymous`,
            { method: "POST", signal },
          );

          if (!response.ok) return null;

          const { data, accessToken } = await readAuthTokenResponse(
            response,
            "anonymous auth token response",
          );

          writeRefreshToken(
            this.baseUrl,
            readRefreshTokenResponse(
              data.refresh_token,
              "anonymous auth token response.refresh_token",
            ),
          );
          return accessToken;
        },
      );
    };
    this.jwtStrategy = new AssistantCloudJWTAuthStrategy(() =>
      getSharedAnonymousAuthToken(this.baseUrl, requestAuthToken),
    );
  }

  public async getAuthHeaders(): Promise<Record<string, string> | false> {
    return this.jwtStrategy.getAuthHeaders();
  }

  public readAuthHeaders(headers: Headers): void {
    this.jwtStrategy.readAuthHeaders(headers);
  }
}
