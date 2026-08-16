import {
  CloudResponseError,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";

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

const AUI_REFRESH_TOKEN_NAME = "aui:refresh_token";

const getLocalStorage = (): Storage | null => {
  if (!("localStorage" in globalThis)) return null;
  try {
    return (globalThis as { localStorage: Storage }).localStorage;
  } catch {
    return null;
  }
};

const readRefreshToken = (): RefreshToken | undefined => {
  const storage = getLocalStorage();
  if (!storage) return undefined;
  try {
    const value = storage.getItem(AUI_REFRESH_TOKEN_NAME);
    return value
      ? (JSON.parse(value) as { token: string; expires_at: string })
      : undefined;
  } catch {
    return undefined;
  }
};

const writeRefreshToken = (refreshToken: RefreshToken): void => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(AUI_REFRESH_TOKEN_NAME, JSON.stringify(refreshToken));
  } catch {}
};

const removeRefreshToken = (): void => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(AUI_REFRESH_TOKEN_NAME);
  } catch {}
};

export class AssistantCloudAnonymousAuthStrategy implements AssistantCloudAuthStrategy {
  public readonly strategy = "anon";

  private baseUrl: string;
  private jwtStrategy: AssistantCloudJWTAuthStrategy;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.jwtStrategy = new AssistantCloudJWTAuthStrategy(async () => {
      const currentTime = Date.now();
      const storedRefreshToken = readRefreshToken();

      if (storedRefreshToken) {
        const refreshExpiry = new Date(storedRefreshToken.expires_at).getTime();
        if (refreshExpiry - currentTime > 30 * 1000) {
          const response = await fetch(
            `${this.baseUrl}/v1/auth/tokens/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: storedRefreshToken.token }),
            },
          );

          if (response.ok) {
            const { data, accessToken } = await readAuthTokenResponse(
              response,
              "refresh auth token response",
            );
            if (data.refresh_token != null) {
              writeRefreshToken(
                readRefreshTokenResponse(
                  data.refresh_token,
                  "refresh auth token response.refresh_token",
                ),
              );
            }
            return accessToken;
          }
        } else {
          removeRefreshToken();
        }
      }

      // No valid refresh token; request a new anonymous token
      const response = await fetch(`${this.baseUrl}/v1/auth/tokens/anonymous`, {
        method: "POST",
      });

      if (!response.ok) return null;

      const { data, accessToken } = await readAuthTokenResponse(
        response,
        "anonymous auth token response",
      );

      writeRefreshToken(
        readRefreshTokenResponse(
          data.refresh_token,
          "anonymous auth token response.refresh_token",
        ),
      );
      return accessToken;
    });
  }

  public async getAuthHeaders(): Promise<Record<string, string> | false> {
    return this.jwtStrategy.getAuthHeaders();
  }

  public readAuthHeaders(headers: Headers): void {
    this.jwtStrategy.readAuthHeaders(headers);
  }
}
