import {
  AssistantCloudAuthStrategy,
  AssistantCloudJWTAuthStrategy,
  AssistantCloudAPIKeyAuthStrategy,
} from "./AssistantCloudAuthStrategy";

export type AssistantCloudConfig =
  | {
      baseUrl: string;
      // TODO use baseUrl to construct the projectId
      unstable_projectId: string;
      authToken(): Promise<string>;
    }
  | {
      apiKey: string;
      workspaceId: string;
    };

export class AssistantCloudAPI {
  private _tokenManager: AssistantCloudAuthStrategy;
  private _baseUrl;

  constructor(config: AssistantCloudConfig) {
    if ("authToken" in config) {
      this._baseUrl = config.baseUrl;
      this._tokenManager = new AssistantCloudJWTAuthStrategy(
        config.unstable_projectId,
        config.authToken,
      );
    } else {
      this._baseUrl = "https://api.assistant-ui.com";
      this._tokenManager = new AssistantCloudAPIKeyAuthStrategy(
        config.apiKey,
        config.workspaceId,
      );
    }
  }

  public async makeRequest(
    endpoint: string,
    options: {
      method?: "POST" | "PUT" | "DELETE" | undefined;
      query?: Record<string, string | number | boolean> | undefined;
      body?: object | undefined;
    } = {},
  ) {
    const authHeaders = await this._tokenManager.getAuthHeaders();
    const headers = {
      ...authHeaders,
      "Content-Type": "application/json",
    };

    const queryParams = new URLSearchParams();
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === false) continue;
        if (value === true) {
          queryParams.set(key, "true");
        } else {
          queryParams.set(key, value.toString());
        }
      }
    }

    const url = new URL(`${this._baseUrl}${endpoint}`);
    url.search = queryParams.toString();

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : null,
    });

    if (!response.ok) {
      // TODO better error handling
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  }
}
