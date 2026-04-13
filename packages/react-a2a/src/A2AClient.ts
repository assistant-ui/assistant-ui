import type {
  A2AAgentCard,
  A2AErrorInfo,
  A2AListTaskPushNotificationConfigsResponse,
  A2AListTasksRequest,
  A2AListTasksResponse,
  A2AMessage,
  A2ARole,
  A2ASendMessageConfiguration,
  A2AStreamEvent,
  A2ATask,
  A2ATaskPushNotificationConfig,
  A2ATaskState,
} from "./types";
import { A2A_PROTOCOL_VERSION } from "./types";

export type A2AClientOptions = {
  baseUrl: string;
  /** Optional path prefix for all API endpoints (e.g. "/v1"). Does not affect agent card discovery. */
  basePath?: string | undefined;
  /** Optional tenant ID for multi-tenant servers. */
  tenant?: string | undefined;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined;
  /** A2A extension URIs to negotiate. Sent as A2A-Extensions header. */
  extensions?: string[] | undefined;
};

// === Structured A2A Error ===

export class A2AError extends Error {
  code: number;
  status: string;
  details: unknown[] | undefined;

  constructor(info: A2AErrorInfo) {
    super(info.message);
    this.name = "A2AError";
    this.code = info.code;
    this.status = info.status;
    this.details = info.details;
  }
}

// === Key normalization (incoming: snake_case → camelCase + enum normalization) ===

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// Fields whose values are opaque user data (google.protobuf.Struct / Value).
// Keys inside these objects must NOT be camelCased or have enum normalization applied.
const OPAQUE_FIELDS = new Set([
  "metadata",
  "data",
  "params",
  "forwardedProps",
  "scopes",
]);

function normalizeKeys(obj: unknown, opaque = false): unknown {
  if (Array.isArray(obj)) return obj.map((v) => normalizeKeys(v, opaque));
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Inside opaque fields: preserve keys and values as-is (only recurse arrays/objects structurally)
      if (opaque) {
        result[key] =
          typeof value === "object" && value !== null
            ? normalizeKeys(value, true)
            : value;
        continue;
      }

      const camelKey = toCamelCase(key);
      const isOpaqueChild = OPAQUE_FIELDS.has(camelKey);

      if (
        camelKey === "state" &&
        typeof value === "string" &&
        value.startsWith("TASK_STATE_")
      ) {
        result[camelKey] = value.slice(11).toLowerCase();
      } else if (
        camelKey === "role" &&
        typeof value === "string" &&
        value.startsWith("ROLE_")
      ) {
        result[camelKey] = value.slice(5).toLowerCase();
      } else if (camelKey === "content" && Array.isArray(value)) {
        // v1.0 proto uses "content" for message/artifact parts; map to internal "parts"
        result["parts"] = normalizeKeys(value, false);
      } else if (camelKey !== "parts" || !("parts" in result)) {
        // skip "parts" if "content" already mapped it (prefer content over parts)
        result[camelKey] = isOpaqueChild ? value : normalizeKeys(value, false);
      }
    }
    return result;
  }
  return obj;
}

// === Outgoing enum conversion (v1.0 ProtoJSON format) ===

function toWireRole(role: A2ARole): string {
  if (role === "user") return "ROLE_USER";
  if (role === "agent") return "ROLE_AGENT";
  return "ROLE_UNSPECIFIED";
}

function toWireTaskState(state: A2ATaskState): string {
  return `TASK_STATE_${state.toUpperCase()}`;
}

function toWireMessage(msg: A2AMessage): unknown {
  const { parts, ...rest } = msg;
  return { ...rest, role: toWireRole(msg.role), content: parts };
}

// === Stream response discrimination ===

function discriminateStreamResponse(
  data: Record<string, unknown>,
): A2AStreamEvent | null {
  if ("task" in data && data.task) {
    return { type: "task", task: data.task as A2ATask };
  }
  if ("message" in data && data.message) {
    return { type: "message", message: data.message as A2AMessage };
  }
  if ("statusUpdate" in data && data.statusUpdate) {
    return {
      type: "statusUpdate",
      event: data.statusUpdate as A2AStreamEvent extends {
        type: "statusUpdate";
        event: infer E;
      }
        ? E
        : never,
    };
  }
  if ("artifactUpdate" in data && data.artifactUpdate) {
    return {
      type: "artifactUpdate",
      event: data.artifactUpdate as A2AStreamEvent extends {
        type: "artifactUpdate";
        event: infer E;
      }
        ? E
        : never,
    };
  }
  return null;
}

function signalInit(signal?: AbortSignal): RequestInit {
  return signal ? { signal } : {};
}

// === A2A Client ===

export class A2AClient {
  private baseUrl: string;
  private basePath: string;
  private tenant: string | undefined;
  private extensionUris: string[] | undefined;
  private headersFn:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);

  constructor(options: A2AClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.basePath = options.basePath
      ? `/${options.basePath.replace(/^\/|\/$/g, "")}`
      : "";
    this.tenant = options.tenant;
    this.extensionUris = options.extensions;
    this.headersFn = options.headers ?? {};
  }

  private getBasePath(): string {
    return `${this.basePath}${this.tenant ? `/${encodeURIComponent(this.tenant)}` : ""}`;
  }

  private async getHeaders(
    includeContentType = true,
  ): Promise<Record<string, string>> {
    const custom =
      typeof this.headersFn === "function"
        ? await this.headersFn()
        : this.headersFn;
    const headers: Record<string, string> = {
      Accept: "application/a2a+json, application/json",
      "A2A-Version": A2A_PROTOCOL_VERSION,
      ...custom,
    };
    if (includeContentType) {
      headers["Content-Type"] = "application/a2a+json";
    }
    if (this.extensionUris?.length) {
      headers["A2A-Extensions"] = this.extensionUris.join(", ");
    }
    return headers;
  }

  private async throwResponseError(response: Response): Promise<never> {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      // no parseable body
    }

    if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
      const err = (errorBody as Record<string, any>).error;
      throw new A2AError({
        code: err.code ?? response.status,
        status: err.status ?? response.statusText,
        message: err.message ?? `A2A request failed: ${response.status}`,
        details: err.details,
      });
    }

    throw new A2AError({
      code: response.status,
      status: response.statusText,
      message: `A2A request failed: ${response.status} ${response.statusText}`,
    });
  }

  private async fetchJSON<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const isGet = !options.method || options.method.toUpperCase() === "GET";
    const headers = await this.getHeaders(!isGet);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });
    if (!response.ok) {
      await this.throwResponseError(response);
    }
    const json = await response.json();
    return normalizeKeys(json) as T;
  }

  // --- Agent Card ---

  async getAgentCard(signal?: AbortSignal): Promise<A2AAgentCard> {
    const headers = await this.getHeaders(false); // GET: no Content-Type
    const url = `${this.baseUrl}/.well-known/agent-card.json`;
    const response = await fetch(url, { headers, ...signalInit(signal) });
    if (!response.ok) {
      await this.throwResponseError(response);
    }
    const json = await response.json();
    return normalizeKeys(json) as A2AAgentCard;
  }

  async getExtendedAgentCard(signal?: AbortSignal): Promise<A2AAgentCard> {
    return this.fetchJSON<A2AAgentCard>(
      `${this.getBasePath()}/extendedAgentCard`,
      signalInit(signal),
    );
  }

  // --- Message ---

  async sendMessage(
    message: A2AMessage,
    configuration?: A2ASendMessageConfiguration,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<A2ATask | A2AMessage> {
    const body: Record<string, unknown> = {
      message: toWireMessage(message),
    };
    if (configuration) body.configuration = configuration;
    if (metadata) body.metadata = metadata;

    const result = await this.fetchJSON<Record<string, unknown>>(
      `${this.getBasePath()}/message:send`,
      {
        method: "POST",
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );

    // Unwrap SendMessageResponse: {task: Task} | {message: Message}
    if ("task" in result && result.task) return result.task as A2ATask;
    if ("message" in result && result.message)
      return result.message as A2AMessage;
    return result as unknown as A2ATask | A2AMessage;
  }

  async *streamMessage(
    message: A2AMessage,
    configuration?: A2ASendMessageConfiguration,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): AsyncGenerator<A2AStreamEvent> {
    const headers = await this.getHeaders(true);
    headers["Accept"] = "text/event-stream";

    const body: Record<string, unknown> = {
      message: toWireMessage(message),
    };
    if (configuration) body.configuration = configuration;
    if (metadata) body.metadata = metadata;

    const response = await fetch(
      `${this.baseUrl}${this.getBasePath()}/message:stream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );
    if (!response.ok) {
      await this.throwResponseError(response);
    }

    yield* this.parseSSE(response);
  }

  // --- Tasks ---

  async getTask(
    taskId: string,
    historyLength?: number,
    signal?: AbortSignal,
  ): Promise<A2ATask> {
    const params = new URLSearchParams();
    if (historyLength !== undefined) {
      // Proto field name for HTTP transcoding query params
      params.set("history_length", String(historyLength));
    }
    const qs = params.toString();
    return this.fetchJSON<A2ATask>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
  }

  async listTasks(
    request?: A2AListTasksRequest,
    signal?: AbortSignal,
  ): Promise<A2AListTasksResponse> {
    const params = new URLSearchParams();
    if (request?.contextId) params.set("context_id", request.contextId);
    if (request?.status) params.set("status", toWireTaskState(request.status));
    if (request?.pageSize !== undefined)
      params.set("page_size", String(request.pageSize));
    if (request?.pageToken) params.set("page_token", request.pageToken);
    if (request?.historyLength !== undefined)
      params.set("history_length", String(request.historyLength));
    if (request?.statusTimestampAfter)
      params.set("status_timestamp_after", request.statusTimestampAfter);
    if (request?.includeArtifacts !== undefined)
      params.set("include_artifacts", String(request.includeArtifacts));
    const qs = params.toString();
    return this.fetchJSON<A2AListTasksResponse>(
      `${this.getBasePath()}/tasks${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
  }

  async cancelTask(
    taskId: string,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<A2ATask> {
    const body = metadata ? { metadata } : {};
    return this.fetchJSON<A2ATask>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}:cancel`,
      {
        method: "POST",
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );
  }

  async *subscribeToTask(
    taskId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<A2AStreamEvent> {
    const headers = await this.getHeaders(false); // GET: no Content-Type
    headers["Accept"] = "text/event-stream";

    const response = await fetch(
      `${this.baseUrl}${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}:subscribe`,
      { headers, ...signalInit(signal) },
    );
    if (!response.ok) {
      await this.throwResponseError(response);
    }

    yield* this.parseSSE(response);
  }

  // --- Push Notification Configs ---

  async createTaskPushNotificationConfig(
    config: A2ATaskPushNotificationConfig,
    signal?: AbortSignal,
  ): Promise<A2ATaskPushNotificationConfig> {
    const taskId = config.taskId;
    if (!taskId) throw new Error("taskId is required");
    return this.fetchJSON<A2ATaskPushNotificationConfig>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs`,
      {
        method: "POST",
        body: JSON.stringify(config),
        ...signalInit(signal),
      },
    );
  }

  async getTaskPushNotificationConfig(
    taskId: string,
    configId: string,
    signal?: AbortSignal,
  ): Promise<A2ATaskPushNotificationConfig> {
    return this.fetchJSON<A2ATaskPushNotificationConfig>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs/${encodeURIComponent(configId)}`,
      signalInit(signal),
    );
  }

  async listTaskPushNotificationConfigs(
    taskId: string,
    options?: { pageSize?: number; pageToken?: string },
    signal?: AbortSignal,
  ): Promise<A2AListTaskPushNotificationConfigsResponse> {
    const params = new URLSearchParams();
    if (options?.pageSize !== undefined)
      params.set("page_size", String(options.pageSize));
    if (options?.pageToken) params.set("page_token", options.pageToken);
    const qs = params.toString();
    return this.fetchJSON<A2AListTaskPushNotificationConfigsResponse>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
  }

  async deleteTaskPushNotificationConfig(
    taskId: string,
    configId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const isGet = false;
    const headers = await this.getHeaders(!isGet);
    const response = await fetch(
      `${this.baseUrl}${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs/${encodeURIComponent(configId)}`,
      { method: "DELETE", headers, ...signalInit(signal) },
    );
    if (!response.ok) {
      await this.throwResponseError(response);
    }
  }

  // --- SSE Parsing ---

  private async *parseSSE(response: Response): AsyncGenerator<A2AStreamEvent> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eventEnd: number = buffer.indexOf("\n\n");
        while (eventEnd !== -1) {
          const eventText = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);

          const dataLines: string[] = [];

          for (const line of eventText.split("\n")) {
            const trimmed = line.replace(/\r$/, "");
            if (trimmed.startsWith("data:")) {
              dataLines.push(trimmed.slice(5).trim());
            }
            // event:, id:, retry: lines are parsed but not used —
            // we discriminate event type from the JSON payload.
          }

          if (dataLines.length === 0) continue;

          try {
            let parsed = JSON.parse(dataLines.join("\n"));

            // Unwrap JSON-RPC envelope if present
            if (
              parsed &&
              typeof parsed === "object" &&
              "jsonrpc" in parsed &&
              "result" in parsed
            ) {
              parsed = parsed.result;
            }

            const normalized = normalizeKeys(parsed) as Record<string, unknown>;
            const event = discriminateStreamResponse(normalized);
            if (event) yield event;
          } catch {
            // Skip malformed events
          }
          eventEnd = buffer.indexOf("\n\n");
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
