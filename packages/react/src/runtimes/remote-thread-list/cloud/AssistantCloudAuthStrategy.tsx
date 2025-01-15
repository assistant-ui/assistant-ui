export type AssistantCloudAuthStrategy = {
  readonly strategy: "jwt" | "api-key";
  getAuthHeaders(): Promise<Record<string, string>>;
};

export class AssistantCloudJWTAuthStrategy
  implements AssistantCloudAuthStrategy
{
  public readonly strategy = "jwt";

  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  #authTokenCallback;

  constructor(authTokenCallback: () => Promise<string>) {
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

  public async getAuthHeaders(): Promise<Record<string, string>> {
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
    const newToken = await this.#authTokenCallback();
    const expiry = this.getJwtExpiry(newToken);

    this.cachedToken = newToken;
    this.tokenExpiry = expiry;

    return {
      Authorization: `Bearer ${newToken}`,
    };
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
}
