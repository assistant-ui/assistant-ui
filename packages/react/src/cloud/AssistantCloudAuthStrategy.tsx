export type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "jwt" | "api-key";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

export class AssistantCloudJWTAuthStrategy
  implements AssistantCloudAuthStrategy
{
  public readonly strategy = "jwt";

  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  #authTokenCallback;

  constructor(authTokenCallback: (() => Promise<string | null>) | undefined) {
    this.#authTokenCallback = authTokenCallback;
  }

  private getJwtExpiry(jwt: string): number {
    try {
      const bodyPart = jwt.split(".").at(1);
      if (!bodyPart) {
        throw new Error("Invalid JWT format");
      }

      // Base64Url decode
      const payload = Buffer.from(
        bodyPart.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString();
      const payloadObj = JSON.parse(payload);

      const exp = payloadObj.exp;
      if (!exp || typeof exp !== "number") {
        throw new Error('JWT does not contain a valid "exp" field');
      }

      // Convert exp to milliseconds
      return exp * 1000;
    } catch (error) {
      throw new Error("Unable to determine the token expiry " + error);
    }
  }

  public async getAuthHeaders(): Promise<Record<string, string> | false> {
    const currentTime = Date.now();

    // Check if the cached token is valid for at least 30 seconds
    if (
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry - currentTime > 30 * 1000 // 30 seconds
    ) {
      return {
        Authorization: `Bearer ${this.cachedToken}`,
      };
    }

    // Fetch a new token
    const newToken = await this.#authTokenCallback?.();
    if (!newToken) return false;

    const expiry = this.getJwtExpiry(newToken);

    this.cachedToken = newToken;
    this.tokenExpiry = expiry;

    return {
      Authorization: `Bearer ${newToken}`,
    };
  }

  public readAuthHeaders(headers: Headers) {
    const authHeader = headers.get("Authorization");
    if (!authHeader) return;

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token)
      throw new Error("Invalid auth header received");

    this.cachedToken = token;
    this.tokenExpiry = this.getJwtExpiry(token);
  }
}

export class AssistantCloudAPIKeyAuthStrategy
  implements AssistantCloudAuthStrategy
{
  public readonly strategy = "api-key";

  #apiKey;
  #userId;
  #workspaceId;

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
    // noop
  }
}

export class AssistantCloudAnonAuthStrategy
  implements AssistantCloudAuthStrategy
{
  public readonly strategy = "anon";

  private baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getJwtExpiry(jwt: string): number {
    try {
      const bodyPart = jwt.split(".").at(1);
      if (!bodyPart) {
        throw new Error("Invalid JWT format");
      }

      const payload = Buffer.from(
        bodyPart.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString();
      const payloadObj = JSON.parse(payload);

      const exp = payloadObj.exp;
      if (!exp || typeof exp !== "number") {
        throw new Error('JWT does not contain a valid "exp" field');
      }

      return exp * 1000; // Convert to milliseconds
    } catch (error) {
      throw new Error("Unable to determine the token expiry " + error);
    }
  }

  public async getAuthHeaders(): Promise<Record<string, string> | false> {
    const currentTime = Date.now();
    const storedRefreshToken = localStorage.getItem("refresh_token");

    // Check if cached access token is valid for at least 30 seconds
    if (
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry - currentTime > 30 * 1000
    ) {
      return { Authorization: `Bearer ${this.cachedToken}` };
    }

    if (storedRefreshToken) {
      try {
        const refreshExpiry = this.getJwtExpiry(storedRefreshToken);
        if (refreshExpiry - currentTime > 30 * 1000) {
          return { Authorization: `Bearer ${storedRefreshToken}` };
        }
      } catch {
        localStorage.removeItem("refresh_token"); // Clear invalid token
      }
    }

    // No valid token, request a new one
    const response = await fetch(`${this.baseUrl}/v1/auth/tokens/anonymous`, {
      method: "POST",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const { access_token, refresh_token } = data;

    if (!access_token || !refresh_token) {
      return false;
    }

    this.cachedToken = access_token;
    this.tokenExpiry = this.getJwtExpiry(access_token);
    localStorage.setItem("refresh_token", refresh_token);

    return { Authorization: `Bearer ${access_token}` };
  }

  public readAuthHeaders(headers: Headers): void {
    const authHeader = headers.get("Authorization");
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme === "Bearer" && token) {
        this.cachedToken = token;
        this.tokenExpiry = this.getJwtExpiry(token);
      }
    }

    const refreshHeader = headers.get("Aui-Refresh-Token");
    if (refreshHeader) {
      localStorage.setItem("refresh_token", refreshHeader);
    }
  }
}
