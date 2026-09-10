import {
  type AssistantCloudAuthStrategy,
  AssistantCloudJWTAuthStrategy,
  AssistantCloudAPIKeyAuthStrategy,
  AssistantCloudAnonymousAuthStrategy,
  normalizeBaseUrl,
} from "./AssistantCloudAuthStrategy";
import type { AssistantCloudRunReport } from "./AssistantCloudRuns";

export type AssistantCloudTelemetryConfig = {
  /**
   * Enables Assistant Cloud telemetry. Defaults to `true`. Set to `false` to
   * disable both run reports and engagement events.
   */
  enabled?: boolean;
  /**
   * Enables Assistant Cloud engagement events. Defaults to `true` when
   * telemetry is enabled. Set to `false` to keep run reports while disabling
   * engagement events.
   */
  events?: boolean;
  release?: string;
  environment?: string;
  tags?: string[];
  /**
   * Called before each telemetry report is sent.
   * Return a modified report to enrich it (e.g. add `model_id`),
   * or return `null` to skip the report.
   */
  beforeReport?: (
    report: AssistantCloudRunReport,
  ) => AssistantCloudRunReport | null;
};

export type AssistantCloudConfig = (
  | {
      baseUrl: string;
      authToken: () => Promise<string | null>;
    }
  | {
      baseUrl?: string;
      apiKey: string;
      userId: string;
      workspaceId: string;
    }
  | {
      baseUrl: string;
      anonymous: true;
    }
) & {
  /**
   * Client-side run telemetry reporting. Default: `true`.
   *
   * When enabled, the SDK automatically reports run metadata (status, step
   * count, tool calls, and token usage) to Assistant Cloud after each
   * assistant message is saved. No message content is sent.
   *
   * - `true` / `undefined` — enabled with defaults
   * - `false` — disabled
   * - `{ beforeReport }` — enabled with a hook to enrich or filter reports
   */
  telemetry?: boolean | AssistantCloudTelemetryConfig;
};

export class CloudAPIError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    if (code !== undefined) this.code = code;
    if (details !== undefined) this.details = details;
    this.name = "CloudAPIError";
  }
}

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
  keepalive?: boolean | undefined;
};

export class AssistantCloudAPI {
  public _auth: AssistantCloudAuthStrategy;
  public _baseUrl;

  constructor(config: AssistantCloudConfig) {
    if ("authToken" in config) {
      this._baseUrl = normalizeBaseUrl(config.baseUrl);
      this._auth = new AssistantCloudJWTAuthStrategy(config.authToken);
    } else if ("apiKey" in config) {
      this._baseUrl = normalizeBaseUrl(
        config.baseUrl ?? "https://backend.assistant-api.com",
      );
      this._auth = new AssistantCloudAPIKeyAuthStrategy(
        config.apiKey,
        config.userId,
        config.workspaceId,
      );
    } else if ("anonymous" in config) {
      this._baseUrl = normalizeBaseUrl(config.baseUrl);
      this._auth = new AssistantCloudAnonymousAuthStrategy(this._baseUrl);
    } else {
      throw new Error(
        "Invalid configuration: Must provide authToken, apiKey, or anonymous configuration",
      );
    }
  }

  public async initializeAuth() {
    return !!(await this._auth.getAuthHeaders());
  }

  public async makeRawRequest(
    endpoint: string,
    options: MakeRequestOptions = {},
  ) {
    const authHeaders = await this._auth.getAuthHeaders();
    if (!authHeaders) throw new Error("Authorization failed");

    const headers = {
      ...authHeaders,
      ...options.headers,
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

    const url = new URL(`${this._baseUrl}/v1${endpoint}`);
    url.search = queryParams.toString();

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : null,
      ...(options.keepalive ? { keepalive: true } : {}),
    });

    this._auth.readAuthHeaders(response.headers);

    if (!response.ok) {
      const text = await response.text();
      let message: string | undefined;
      let code: string | undefined;
      let details: Record<string, unknown> | undefined;
      try {
        const body = JSON.parse(text) as unknown;
        if (typeof body === "object" && body !== null && !Array.isArray(body)) {
          const record = body as Record<string, unknown>;
          if (typeof record.message === "string" && record.message.length > 0) {
            message = record.message;
          }
          if (typeof record.error === "string") {
            code = record.error;
            details = { ...record };
            delete details.error;
          }
        }
      } catch {}
      throw new CloudAPIError(
        message ?? `Request failed with status ${response.status}, ${text}`,
        response.status,
        code,
        details,
      );
    }

    return response;
  }

  public async makeRequest(endpoint: string, options: MakeRequestOptions = {}) {
    const response = await this.makeRawRequest(endpoint, options);
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    )
      return undefined;

    const text = await response.text();
    if (text.trim() === "") return undefined;

    return JSON.parse(text);
  }
}
