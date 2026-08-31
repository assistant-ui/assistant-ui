import { SSEEventDecoder, type SSEEvent } from "assistant-stream/utils";
import { isRecord } from "@assistant-ui/core/internal";
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
  /** Extra fetch options applied to every request. */
  fetchOptions?:
    | Omit<RequestInit, "headers" | "body" | "method" | "signal">
    | undefined;
};

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

// Incoming key normalization: snake_case → camelCase, plus ProtoJSON enum normalization.
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

const JSONRPC_STATE_MAP: Record<string, string> = {
  "input-required": "input_required",
  "auth-required": "auth_required",
  unknown: "unspecified",
};

// JSON-RPC file parts nest the payload under `file`; the internal A2APart is
// flat, so the nested fields map onto url/raw/mediaType/filename.
function normalizeParts(value: unknown[]): unknown[] {
  return value.map((raw) => {
    const part = normalizeKeys(raw, false);
    if (part === null || typeof part !== "object" || Array.isArray(part))
      return part;
    const record = part as Record<string, unknown>;
    if (record.kind === undefined) return part;
    const { kind, ...rest } = record;
    const file = rest.file;
    if (kind !== "file" || file === null || typeof file !== "object")
      return rest;
    const { file: _file, ...others } = rest;
    const nested = file as Record<string, unknown>;
    return {
      ...others,
      ...(nested.uri !== undefined ? { url: nested.uri } : {}),
      ...(nested.bytes !== undefined ? { raw: nested.bytes } : {}),
      ...(nested.mimeType !== undefined ? { mediaType: nested.mimeType } : {}),
      ...(nested.name !== undefined ? { filename: nested.name } : {}),
    };
  });
}

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

      if (camelKey === "state" && typeof value === "string") {
        // Proto-style (TASK_STATE_WORKING) and the JSON-RPC state names map
        // onto the internal snake_case states; anything unrecognized is
        // preserved verbatim.
        if (value.startsWith("TASK_STATE_")) {
          result[camelKey] = value.slice(11).toLowerCase();
        } else {
          result[camelKey] = JSONRPC_STATE_MAP[value] ?? value;
        }
      } else if (
        camelKey === "role" &&
        typeof value === "string" &&
        value.startsWith("ROLE_")
      ) {
        result[camelKey] = value.slice(5).toLowerCase();
      } else if (camelKey === "content" && Array.isArray(value)) {
        // v0.3 servers used "content" for message/artifact parts; normalize to "parts" for backward compat
        result.parts = normalizeParts(value);
      } else if (camelKey === "parts" && Array.isArray(value)) {
        // dedup: "content" was already mapped to parts above; don't overwrite
        if (!("parts" in result)) result.parts = normalizeParts(value);
      } else if (camelKey !== "parts" || !("parts" in result)) {
        result[camelKey] = isOpaqueChild ? value : normalizeKeys(value, false);
      }
    }
    return result;
  }
  return obj;
}

// Outgoing enum conversion (v1.0 ProtoJSON format)
function toWireRole(role: A2ARole): string {
  if (role === "user") return "ROLE_USER";
  if (role === "agent") return "ROLE_AGENT";
  return "ROLE_UNSPECIFIED";
}

function toWireTaskState(state: A2ATaskState): string {
  return `TASK_STATE_${state.toUpperCase()}`;
}

function toWireMessage(msg: A2AMessage): unknown {
  return { ...msg, role: toWireRole(msg.role) };
}

function discriminateStreamResponse(
  data: Record<string, unknown>,
): A2AStreamEvent | null {
  if ("task" in data) {
    const task = toWrappedTask(data.task);
    if (task) return { type: "task", task };
  }
  if ("message" in data) {
    const message = toWrappedMessage(data.message);
    if (message) return { type: "message", message };
  }
  if ("statusUpdate" in data) {
    const statusUpdate = toWrappedStatusUpdate(data.statusUpdate);
    if (statusUpdate) {
      return {
        type: "statusUpdate",
        event: statusUpdate as A2AStreamEvent extends {
          type: "statusUpdate";
          event: infer E;
        }
          ? E
          : never,
      };
    }
  }
  if ("artifactUpdate" in data) {
    const artifactUpdate = toWrappedArtifactUpdate(data.artifactUpdate);
    if (artifactUpdate) {
      return {
        type: "artifactUpdate",
        event: artifactUpdate as A2AStreamEvent extends {
          type: "artifactUpdate";
          event: infer E;
        }
          ? E
          : never,
      };
    }
  }
  // JSON-RPC streaming results are the event itself, flat, discriminated by
  // `kind` (per the A2A JSON-RPC schema), rather than wrapped in a
  // REST-style single-key envelope. The field sets cannot collide with the
  // wrapper keys above, so this is a pure fallthrough.
  const { kind, ...flat } = data;
  switch (kind) {
    case "task":
      if (!isTask(flat)) break;
      return { type: "task", task: flat };
    case "message":
      if (!isMessage(flat)) break;
      return { type: "message", message: flat };
    case "status-update": {
      if (!isStatusUpdate(flat)) break;
      const { final: _final, ...event } = flat;
      return {
        type: "statusUpdate",
        event: event as unknown as A2AStreamEvent extends {
          type: "statusUpdate";
          event: infer E;
        }
          ? E
          : never,
      };
    }
    case "artifact-update":
      if (!isArtifactUpdate(flat)) break;
      return {
        type: "artifactUpdate",
        event: flat as unknown as A2AStreamEvent extends {
          type: "artifactUpdate";
          event: infer E;
        }
          ? E
          : never,
      };
  }
  return null;
}

const TASK_STATES: ReadonlySet<string> = new Set(
  Object.keys({
    unspecified: true,
    submitted: true,
    working: true,
    completed: true,
    failed: true,
    canceled: true,
    input_required: true,
    rejected: true,
    auth_required: true,
  } satisfies Record<A2ATaskState, true>),
);

const isTaskState = (value: unknown): value is A2ATaskState =>
  typeof value === "string" && TASK_STATES.has(value);

const ROLES: ReadonlySet<string> = new Set(
  Object.keys({
    unspecified: true,
    user: true,
    agent: true,
  } satisfies Record<A2ARole, true>),
);

const isRole = (value: unknown): value is A2ARole =>
  typeof value === "string" && ROLES.has(value);

// Ids reach task state and the next request body unchecked by anything
// downstream, so an id that is present and not null must be a string.
// An omitted or null id keeps the acceptance each path already had.
const hasOptionalStringIds = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean =>
  keys.every((key) => value[key] == null || typeof value[key] === "string");

const isTask = (value: unknown): value is A2ATask =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.length > 0 &&
  hasOptionalStringIds(value, ["contextId"]) &&
  isRecord(value.status) &&
  isTaskState(value.status.state);

const isMessage = (value: unknown): value is A2AMessage =>
  isRecord(value) &&
  typeof value.messageId === "string" &&
  value.messageId.length > 0 &&
  hasOptionalStringIds(value, ["contextId", "taskId"]) &&
  isRole(value.role) &&
  Array.isArray(value.parts) &&
  value.parts.every(isRecord);

// Legacy wrappers use ProtoJSON, where omitted and null fields decode to proto
// defaults. Normalize those defaults before enforcing semantic requirements.
// Filling a null id with the ProtoJSON default does not make it a string, and
// the shape guards below check the fields they name rather than the ids. The
// runtime reads these straight into task state and the next request body.
const hasStringIds = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => keys.every((key) => typeof value[key] === "string");

const toWrappedTaskStatus = (
  value: unknown,
): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  return {
    ...value,
    state: value.state == null ? "unspecified" : value.state,
  };
};

const toWrappedTask = (value: unknown): A2ATask | null => {
  if (!isRecord(value)) return null;
  const status = toWrappedTaskStatus(value.status);
  if (!status) return null;

  const task = {
    ...value,
    contextId: value.contextId == null ? "" : value.contextId,
    status,
  };
  return isTask(task) && hasStringIds(task, ["contextId"]) ? task : null;
};

const toWrappedMessage = (value: unknown): A2AMessage | null => {
  if (!isRecord(value)) return null;

  const message = {
    ...value,
    contextId: value.contextId == null ? "" : value.contextId,
    taskId: value.taskId == null ? "" : value.taskId,
    role: value.role == null ? "unspecified" : value.role,
    parts: value.parts == null ? [] : value.parts,
  };
  return isMessage(message) && hasStringIds(message, ["contextId", "taskId"])
    ? message
    : null;
};

const isStatusUpdate = (
  value: unknown,
  allowEmptyTaskId = false,
): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.taskId === "string" &&
  (allowEmptyTaskId || value.taskId.length > 0) &&
  hasOptionalStringIds(value, ["contextId"]) &&
  isRecord(value.status) &&
  isTaskState(value.status.state);

const toWrappedStatusUpdate = (
  value: unknown,
): Record<string, unknown> | null => {
  if (!isRecord(value) || !isRecord(value.status)) return null;

  const statusUpdate = {
    ...value,
    taskId: value.taskId == null ? "" : value.taskId,
    contextId: value.contextId == null ? "" : value.contextId,
    status: toWrappedTaskStatus(value.status),
  };
  return isStatusUpdate(statusUpdate, true) &&
    hasStringIds(statusUpdate, ["taskId", "contextId"])
    ? statusUpdate
    : null;
};

const isArtifact = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.artifactId === "string" &&
  Array.isArray(value.parts) &&
  value.parts.every(isRecord);

const isArtifactUpdate = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  hasOptionalStringIds(value, ["contextId", "taskId"]) &&
  isArtifact(value.artifact);

const toWrappedArtifact = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;

  const artifact = {
    ...value,
    artifactId: value.artifactId == null ? "" : value.artifactId,
    parts: value.parts == null ? [] : value.parts,
  };
  return isArtifact(artifact) ? artifact : null;
};

const toWrappedArtifactUpdate = (
  value: unknown,
): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const artifact = toWrappedArtifact(value.artifact);
  if (!artifact) return null;

  const artifactUpdate = {
    ...value,
    taskId: value.taskId == null ? "" : value.taskId,
    contextId: value.contextId == null ? "" : value.contextId,
    artifact,
  };
  return isArtifactUpdate(artifactUpdate) &&
    hasStringIds(artifactUpdate, ["taskId", "contextId"])
    ? artifactUpdate
    : null;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const toJsonRpcError = (error: unknown): A2AError => {
  const rpcError = error as { code?: number; message?: string; data?: unknown };
  return new A2AError({
    code: rpcError.code ?? -1,
    status: "JSONRPC_ERROR",
    message: rpcError.message ?? "A2A JSON-RPC error",
    details:
      rpcError.data === undefined
        ? undefined
        : Array.isArray(rpcError.data)
          ? rpcError.data
          : [rpcError.data],
  });
};

const invalidAgentCard = (): never => {
  throw new Error(
    "Invalid A2A agent card response: expected a valid agent card payload.",
  );
};

const parseCardString = (value: unknown): string =>
  value == null ? "" : typeof value === "string" ? value : invalidAgentCard();

const parseCardStringArray = (value: unknown): string[] =>
  value == null ? [] : isStringArray(value) ? value : invalidAgentCard();

const parseCardRecordArray = (value: unknown): Record<string, unknown>[] =>
  value == null
    ? []
    : Array.isArray(value) && value.every(isRecord)
      ? (value as Record<string, unknown>[])
      : invalidAgentCard();

const parseCardRecord = (value: unknown): Record<string, unknown> =>
  value == null ? {} : isRecord(value) ? value : invalidAgentCard();

// Proto3 JSON parsing treats omitted and null fields as defaults, so a valid
// card may arrive without its empty lists, strings, or capabilities. Fill
// those per the proto3 JSON mapping rules; a payload without a name or with a
// present field of the wrong type rejects.
const parseAgentCardResponse = (value: unknown): A2AAgentCard => {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    value.name.length === 0
  ) {
    return invalidAgentCard();
  }

  return {
    ...value,
    name: value.name,
    description: parseCardString(value.description),
    version: parseCardString(value.version),
    supportedInterfaces: parseCardRecordArray(value.supportedInterfaces).map(
      (entry) => ({
        ...entry,
        url: parseCardString(entry.url),
        protocolBinding: parseCardString(entry.protocolBinding),
        protocolVersion: parseCardString(entry.protocolVersion),
      }),
    ),
    capabilities: parseCardRecord(value.capabilities),
    defaultInputModes: parseCardStringArray(value.defaultInputModes),
    defaultOutputModes: parseCardStringArray(value.defaultOutputModes),
    skills: parseCardRecordArray(value.skills).map((entry) => ({
      ...entry,
      id: parseCardString(entry.id),
      name: parseCardString(entry.name),
      description: parseCardString(entry.description),
      tags: parseCardStringArray(entry.tags),
    })),
  } as A2AAgentCard;
};

const parseSendMessageResponse = (value: unknown): A2ATask | A2AMessage => {
  if (isRecord(value)) {
    const candidate = value.task ?? value.message ?? value;
    if (isTask(candidate) || isMessage(candidate)) return candidate;
  }

  throw new Error(
    "Invalid A2A message:send response: expected a valid task or message payload.",
  );
};

const parseTaskResponse = (
  value: unknown,
  operation: "tasks:get" | "tasks:cancel",
): A2ATask => {
  if (isTask(value)) return value;

  throw new Error(
    `Invalid A2A ${operation} response: expected a valid task payload.`,
  );
};

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const invalidListTasksResponse = (): never => {
  throw new Error(
    "Invalid A2A tasks:list response: expected a valid task list payload.",
  );
};

const parseListTasksResponse = (value: unknown): A2AListTasksResponse => {
  if (!isRecord(value)) return invalidListTasksResponse();

  const tasks = value.tasks ?? [];
  if (!Array.isArray(tasks) || !tasks.every(isTask)) {
    return invalidListTasksResponse();
  }

  const { nextPageToken, pageSize, totalSize } = value;
  if (
    (nextPageToken != null && typeof nextPageToken !== "string") ||
    (pageSize != null && !isNonNegativeInteger(pageSize)) ||
    (totalSize != null && !isNonNegativeInteger(totalSize))
  ) {
    return invalidListTasksResponse();
  }

  return {
    ...value,
    tasks,
    nextPageToken: nextPageToken ?? "",
    pageSize: pageSize ?? 0,
    totalSize: totalSize ?? 0,
  };
};

const invalidPushNotificationConfigResponse =
  (
    operation: "pushNotificationConfigs:create" | "pushNotificationConfigs:get",
  ) =>
  (): never => {
    throw new Error(
      `Invalid A2A ${operation} response: expected a valid push notification config payload.`,
    );
  };

const invalidListPushNotificationConfigsResponse = (): never => {
  throw new Error(
    "Invalid A2A pushNotificationConfigs:list response: expected a valid push notification config list payload.",
  );
};

const parseOptionalString = (
  value: unknown,
  invalid: () => never,
): string | undefined =>
  value == null ? undefined : typeof value === "string" ? value : invalid();

const parseTaskPushNotificationConfigResponse = (
  value: unknown,
  invalid: () => never,
): A2ATaskPushNotificationConfig => {
  if (
    !isRecord(value) ||
    typeof value.url !== "string" ||
    value.url.length === 0
  ) {
    return invalid();
  }

  const { tenant, id, taskId, url, token, authentication, ...extra } = value;
  let normalizedAuthentication: A2ATaskPushNotificationConfig["authentication"];
  if (authentication != null) {
    if (!isRecord(authentication)) return invalid();
    const { scheme, credentials, ...authenticationExtra } = authentication;
    normalizedAuthentication = {
      ...authenticationExtra,
      scheme: parseOptionalString(scheme, invalid) ?? "",
      ...(credentials == null
        ? {}
        : { credentials: parseOptionalString(credentials, invalid) }),
    };
  }

  return {
    ...extra,
    ...(tenant == null ? {} : { tenant: parseOptionalString(tenant, invalid) }),
    ...(id == null ? {} : { id: parseOptionalString(id, invalid) }),
    ...(taskId == null ? {} : { taskId: parseOptionalString(taskId, invalid) }),
    url,
    ...(token == null ? {} : { token: parseOptionalString(token, invalid) }),
    ...(normalizedAuthentication === undefined
      ? {}
      : { authentication: normalizedAuthentication }),
  };
};

const parseListTaskPushNotificationConfigsResponse = (
  value: unknown,
): A2AListTaskPushNotificationConfigsResponse => {
  if (!isRecord(value)) return invalidListPushNotificationConfigsResponse();

  const { configs: rawConfigs, nextPageToken, ...extra } = value;
  if (rawConfigs != null && !Array.isArray(rawConfigs)) {
    return invalidListPushNotificationConfigsResponse();
  }

  return {
    ...extra,
    configs: (rawConfigs ?? []).map((config) =>
      parseTaskPushNotificationConfigResponse(
        config,
        invalidListPushNotificationConfigsResponse,
      ),
    ),
    ...(nextPageToken == null
      ? {}
      : {
          nextPageToken: parseOptionalString(
            nextPageToken,
            invalidListPushNotificationConfigsResponse,
          ),
        }),
  };
};

function signalInit(signal?: AbortSignal): RequestInit {
  return signal ? { signal } : {};
}

const SKIPPED_FRAME_SNIPPET_LENGTH = 120;

function describeSkippedFrame(data: string, reason: string): string {
  const collapsed = data.replace(/\s+/g, " ");
  const snippet =
    collapsed.length > SKIPPED_FRAME_SNIPPET_LENGTH
      ? `${collapsed.slice(0, SKIPPED_FRAME_SNIPPET_LENGTH)}…`
      : collapsed;
  return `${reason} (frame: ${snippet})`;
}

export class A2AClient {
  private baseUrl: string;
  private basePath: string;
  private tenant: string | undefined;
  private extensionUris: string[] | undefined;
  private fetchOptions: Omit<
    RequestInit,
    "headers" | "body" | "method" | "signal"
  >;
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
    const {
      headers: _h,
      body: _b,
      method: _m,
      signal: _s,
      ...safeFetchOptions
    } = (options.fetchOptions ?? {}) as RequestInit;
    this.fetchOptions = safeFetchOptions;
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
      ...this.fetchOptions,
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
    if (json && typeof json === "object" && "jsonrpc" in json) {
      if ("error" in json && json.error) {
        throw toJsonRpcError(json.error);
      }
      if ("result" in json) {
        const result = normalizeKeys(json.result);
        if (isRecord(result) && typeof result.kind === "string") {
          const { kind: _kind, ...rest } = result;
          return rest as T;
        }
        return result as T;
      }
    }
    return normalizeKeys(json) as T;
  }

  // --- Agent Card ---

  async getAgentCard(signal?: AbortSignal): Promise<A2AAgentCard> {
    const headers = await this.getHeaders(false); // GET: no Content-Type
    const url = `${this.baseUrl}/.well-known/agent-card.json`;
    const response = await fetch(url, {
      ...this.fetchOptions,
      headers,
      ...signalInit(signal),
    });
    if (!response.ok) {
      await this.throwResponseError(response);
    }
    const json = await response.json();
    return parseAgentCardResponse(normalizeKeys(json));
  }

  async getExtendedAgentCard(signal?: AbortSignal): Promise<A2AAgentCard> {
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/extendedAgentCard`,
      signalInit(signal),
    );
    return parseAgentCardResponse(result);
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

    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/message:send`,
      {
        method: "POST",
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );

    return parseSendMessageResponse(result);
  }

  async *streamMessage(
    message: A2AMessage,
    configuration?: A2ASendMessageConfiguration,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): AsyncGenerator<A2AStreamEvent> {
    const headers = await this.getHeaders(true);
    headers.Accept = "text/event-stream";

    const body: Record<string, unknown> = {
      message: toWireMessage(message),
    };
    if (configuration) body.configuration = configuration;
    if (metadata) body.metadata = metadata;

    const response = await fetch(
      `${this.baseUrl}${this.getBasePath()}/message:stream`,
      {
        ...this.fetchOptions,
        method: "POST",
        headers,
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );
    if (!response.ok) {
      await this.throwResponseError(response);
    }

    return yield* this.parseSSE(response);
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
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
    return parseTaskResponse(result, "tasks:get");
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
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
    return parseListTasksResponse(result);
  }

  async cancelTask(
    taskId: string,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<A2ATask> {
    const body = metadata ? { metadata } : {};
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}:cancel`,
      {
        method: "POST",
        body: JSON.stringify(body),
        ...signalInit(signal),
      },
    );
    return parseTaskResponse(result, "tasks:cancel");
  }

  async *subscribeToTask(
    taskId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<A2AStreamEvent> {
    const headers = await this.getHeaders(false); // GET: no Content-Type
    headers.Accept = "text/event-stream";

    const response = await fetch(
      `${this.baseUrl}${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}:subscribe`,
      {
        ...this.fetchOptions,
        headers,
        ...signalInit(signal),
      },
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
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs`,
      {
        method: "POST",
        body: JSON.stringify(config),
        ...signalInit(signal),
      },
    );
    return parseTaskPushNotificationConfigResponse(
      result,
      invalidPushNotificationConfigResponse("pushNotificationConfigs:create"),
    );
  }

  async getTaskPushNotificationConfig(
    taskId: string,
    configId: string,
    signal?: AbortSignal,
  ): Promise<A2ATaskPushNotificationConfig> {
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs/${encodeURIComponent(configId)}`,
      signalInit(signal),
    );
    return parseTaskPushNotificationConfigResponse(
      result,
      invalidPushNotificationConfigResponse("pushNotificationConfigs:get"),
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
    const result = await this.fetchJSON<unknown>(
      `${this.getBasePath()}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs${qs ? `?${qs}` : ""}`,
      signalInit(signal),
    );
    return parseListTaskPushNotificationConfigsResponse(result);
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
      {
        ...this.fetchOptions,
        method: "DELETE",
        headers,
        ...signalInit(signal),
      },
    );
    if (!response.ok) {
      await this.throwResponseError(response);
    }
  }

  // --- SSE Parsing ---

  private async *parseSSE(
    response: Response,
  ): AsyncGenerator<A2AStreamEvent, string | undefined> {
    const contentType = response.headers.get("Content-Type");
    const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "text/event-stream") {
      const received = contentType
        ? `"${contentType}"`
        : "no Content-Type header";
      void response.body?.cancel().catch(() => undefined);
      throw new Error(
        `Expected A2A stream response Content-Type "text/event-stream", received ${received}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    const sseDecoder = new SSEEventDecoder();

    let firstSkipReason: string | undefined;
    const noteSkip = (data: string, reason: string) => {
      firstSkipReason ??= describeSkippedFrame(data, reason);
    };

    const readEvent = (event: SSEEvent): A2AStreamEvent | null => {
      try {
        let parsed = JSON.parse(event.data);

        if (parsed && typeof parsed === "object" && "jsonrpc" in parsed) {
          if ("error" in parsed && parsed.error) {
            throw toJsonRpcError(parsed.error);
          }
          if ("result" in parsed) {
            parsed = parsed.result;
          }
        }

        const normalized = normalizeKeys(parsed) as Record<string, unknown>;
        const streamEvent = discriminateStreamResponse(normalized);
        if (!streamEvent) noteSkip(event.data, "unrecognized event shape");
        return streamEvent;
      } catch (error) {
        if (error instanceof A2AError) throw error;
        noteSkip(
          event.data,
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    };

    let shouldCancel = true;
    try {
      while (true) {
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await reader.read();
        } catch (error) {
          shouldCancel = false;
          throw error;
        }

        const { done, value } = result;
        if (done) {
          shouldCancel = false;
          for (const event of sseDecoder.push(decoder.decode())) {
            const parsed = readEvent(event);
            if (parsed) yield parsed;
          }
          break;
        }

        for (const event of sseDecoder.push(
          decoder.decode(value, { stream: true }),
        )) {
          const parsed = readEvent(event);
          if (parsed) yield parsed;
        }
      }
    } finally {
      try {
        if (shouldCancel) await reader.cancel().catch(() => undefined);
      } finally {
        reader.releaseLock();
      }
    }

    return firstSkipReason;
  }
}
