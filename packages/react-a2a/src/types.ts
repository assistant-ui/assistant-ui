// A2A v1.0 Protocol Types
// Enum values use lowercase internally; normalized from ProtoJSON SCREAMING_SNAKE_CASE on read.
// Wire format uses ROLE_USER/ROLE_AGENT and TASK_STATE_* per ADR-001.

export const A2A_PROTOCOL_VERSION = "1.0";

// === Roles ===
export type A2ARole = "unspecified" | "user" | "agent";

// === Part (content unit) ===
export type A2APart = {
  text?: string | undefined;
  raw?: string | undefined; // base64 encoded bytes
  url?: string | undefined;
  data?: unknown; // google.protobuf.Value

  metadata?: Record<string, unknown> | undefined;
  filename?: string | undefined;
  mediaType?: string | undefined; // MIME type
};

// === Message ===
export type A2AMessage = {
  messageId: string;
  contextId?: string | undefined;
  taskId?: string | undefined;
  role: A2ARole;
  parts: A2APart[];
  metadata?: Record<string, unknown> | undefined;
  extensions?: string[] | undefined;
  referenceTaskIds?: string[] | undefined;
};

// === Task State ===
export type A2ATaskState =
  | "unspecified"
  | "submitted"
  | "working"
  | "completed"
  | "failed"
  | "canceled"
  | "input_required"
  | "rejected"
  | "auth_required";

// === Task Status ===
export type A2ATaskStatus = {
  state: A2ATaskState;
  message?: A2AMessage | undefined;
  timestamp?: string | undefined; // ISO 8601
};

// === Artifact ===
export type A2AArtifact = {
  artifactId: string;
  name?: string | undefined;
  description?: string | undefined;
  parts: A2APart[];
  metadata?: Record<string, unknown> | undefined;
  extensions?: string[] | undefined;
};

// === Task ===
export type A2ATask = {
  id: string;
  contextId?: string | undefined;
  status: A2ATaskStatus;
  artifacts?: A2AArtifact[] | undefined;
  history?: A2AMessage[] | undefined;
  metadata?: Record<string, unknown> | undefined;
};

// === Streaming Events ===
export type A2ATaskStatusUpdateEvent = {
  taskId: string;
  contextId: string; // REQUIRED per proto
  status: A2ATaskStatus;
  metadata?: Record<string, unknown> | undefined;
};

export type A2ATaskArtifactUpdateEvent = {
  taskId: string;
  contextId: string; // REQUIRED per proto
  artifact: A2AArtifact;
  append?: boolean | undefined;
  lastChunk?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type A2AStreamEvent =
  | { type: "task"; task: A2ATask }
  | { type: "message"; message: A2AMessage }
  | { type: "statusUpdate"; event: A2ATaskStatusUpdateEvent }
  | { type: "artifactUpdate"; event: A2ATaskArtifactUpdateEvent };

// === Authentication ===
export type A2AAuthenticationInfo = {
  scheme: string;
  credentials?: string | undefined;
};

// === Push Notification Config ===
export type A2ATaskPushNotificationConfig = {
  tenant?: string | undefined;
  id?: string | undefined;
  taskId?: string | undefined;
  url: string;
  token?: string | undefined;
  authentication?: A2AAuthenticationInfo | undefined;
};

export type A2AListTaskPushNotificationConfigsResponse = {
  configs: A2ATaskPushNotificationConfig[];
  nextPageToken?: string | undefined;
};

// === Request/Response Types ===
export type A2ASendMessageConfiguration = {
  acceptedOutputModes?: string[] | undefined;
  taskPushNotificationConfig?: A2ATaskPushNotificationConfig | undefined;
  historyLength?: number | undefined;
  returnImmediately?: boolean | undefined;
};

export type A2AListTasksRequest = {
  contextId?: string | undefined;
  status?: A2ATaskState | undefined;
  pageSize?: number | undefined;
  pageToken?: string | undefined;
  historyLength?: number | undefined;
  statusTimestampAfter?: string | undefined; // ISO 8601
  includeArtifacts?: boolean | undefined;
};

export type A2AListTasksResponse = {
  tasks: A2ATask[];
  nextPageToken: string;
  pageSize: number;
  totalSize: number;
};

// === Structured Error (google.rpc.Status) ===
export type A2AErrorInfo = {
  code: number;
  status: string;
  message: string;
  details?: unknown[] | undefined;
};

// === Security Schemes ===
export type A2AApiKeySecurityScheme = {
  description?: string | undefined;
  location: string; // "query" | "header" | "cookie"
  name: string;
};

export type A2AHttpAuthSecurityScheme = {
  description?: string | undefined;
  scheme: string; // e.g. "Bearer"
  bearerFormat?: string | undefined;
};

export type A2AAuthorizationCodeOAuthFlow = {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string | undefined;
  scopes: Record<string, string>;
  pkceRequired?: boolean | undefined;
};

export type A2AClientCredentialsOAuthFlow = {
  tokenUrl: string;
  refreshUrl?: string | undefined;
  scopes: Record<string, string>;
};

export type A2ADeviceCodeOAuthFlow = {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string | undefined;
  scopes: Record<string, string>;
};

/** @deprecated Use Authorization Code + PKCE instead. */
export type A2AImplicitOAuthFlow = {
  authorizationUrl?: string | undefined;
  refreshUrl?: string | undefined;
  scopes?: Record<string, string> | undefined;
};

/** @deprecated Use Authorization Code + PKCE or Device Code. */
export type A2APasswordOAuthFlow = {
  tokenUrl?: string | undefined;
  refreshUrl?: string | undefined;
  scopes?: Record<string, string> | undefined;
};

export type A2AOAuthFlows = {
  authorizationCode?: A2AAuthorizationCodeOAuthFlow | undefined;
  clientCredentials?: A2AClientCredentialsOAuthFlow | undefined;
  /** @deprecated */
  implicit?: A2AImplicitOAuthFlow | undefined;
  /** @deprecated */
  password?: A2APasswordOAuthFlow | undefined;
  deviceCode?: A2ADeviceCodeOAuthFlow | undefined;
};

export type A2AOAuth2SecurityScheme = {
  description?: string | undefined;
  flows: A2AOAuthFlows;
  oauth2MetadataUrl?: string | undefined;
};

export type A2AOpenIdConnectSecurityScheme = {
  description?: string | undefined;
  openIdConnectUrl: string;
};

export type A2AMutualTlsSecurityScheme = {
  description?: string | undefined;
};

export type A2ASecurityScheme = {
  apiKeySecurityScheme?: A2AApiKeySecurityScheme | undefined;
  httpAuthSecurityScheme?: A2AHttpAuthSecurityScheme | undefined;
  oauth2SecurityScheme?: A2AOAuth2SecurityScheme | undefined;
  openIdConnectSecurityScheme?: A2AOpenIdConnectSecurityScheme | undefined;
  mtlsSecurityScheme?: A2AMutualTlsSecurityScheme | undefined;
};

export type A2ASecurityRequirement = {
  schemes: Record<string, { list: string[] }>;
};

// === Agent Card Signature (JWS) ===
export type A2AAgentCardSignature = {
  protected: string; // base64url-encoded JWS header
  signature: string; // base64url-encoded signature
  header?: Record<string, unknown> | undefined;
};

// === Agent Card ===
export type A2AAgentSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[] | undefined;
  inputModes?: string[] | undefined;
  outputModes?: string[] | undefined;
  securityRequirements?: A2ASecurityRequirement[] | undefined;
};

export type A2AAgentCapabilities = {
  streaming?: boolean | undefined;
  pushNotifications?: boolean | undefined;
  extensions?:
    | Array<{
        uri: string;
        description?: string | undefined;
        required?: boolean | undefined;
        params?: Record<string, unknown> | undefined;
      }>
    | undefined;
  extendedAgentCard?: boolean | undefined;
};

export type A2AAgentInterface = {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
  tenant?: string | undefined;
};

export type A2AAgentCard = {
  name: string;
  description: string;
  supportedInterfaces: A2AAgentInterface[]; // REQUIRED per proto
  provider?:
    | {
        organization: string;
        url: string;
      }
    | undefined;
  version: string;
  documentationUrl?: string | undefined;
  capabilities: A2AAgentCapabilities;
  securitySchemes?: Record<string, A2ASecurityScheme> | undefined;
  securityRequirements?: A2ASecurityRequirement[] | undefined;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
  signatures?: A2AAgentCardSignature[] | undefined;
  iconUrl?: string | undefined;
};
