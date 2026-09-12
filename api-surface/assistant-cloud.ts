import { AttributeValue, Attributes, Context, HrTime, Link, Span, SpanContext, SpanKind, SpanStatus } from "@opentelemetry/api";

import "@standard-schema/spec";

import { UIMessage } from "ai";

type AISDKMessageLike = {
  id?: string | undefined;
  role: string;
  parts: readonly {
    type: string;
    [key: string]: unknown;
  }[];
  metadata?: unknown;
};

type AISDKRunTelemetry = {
  assistantMessageId?: string;
  status: "completed" | "incomplete";
  toolCalls?: AssistantCloudRunReportToolCall[];
  steps?: RunReportStepInit[];
  totalSteps?: number;
  outputText?: string;
  usage?: RunTelemetryUsage;
  modelId?: string;
  metadata?: Record<string, unknown>;
};

type AISDKStorageFormat = Omit<UIMessage, "id">;

declare class AssistantCloud {
  readonly threads: AssistantCloudThreads;
  readonly projects: AssistantCloudProjects;
  readonly auth: {
    tokens: AssistantCloudAuthTokens;
  };
  readonly runs: AssistantCloudRuns;
  readonly files: AssistantCloudFiles;
  readonly events: AssistantCloudEvents;
  readonly scores: AssistantCloudScores;
  readonly telemetry: AssistantCloudTelemetryConfig;
  constructor(config: AssistantCloudConfig);
}

declare class AssistantCloudAPI {
  _auth: AssistantCloudAuthStrategy;
  _baseUrl: string;
  constructor(config: AssistantCloudConfig);
  initializeAuth(): Promise<boolean>;
  makeRawRequest(endpoint: string, options?: MakeRequestOptions): Promise<Response>;
  makeRequest(endpoint: string, options?: MakeRequestOptions): Promise<any>;
}

type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "api-key" | "jwt";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

declare class AssistantCloudAuthTokens {
  #private;
  constructor(cloud: AssistantCloudAPI);
  create(): Promise<AssistantCloudAuthTokensCreateResponse>;
}

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

type AssistantCloudConfig = ({
  baseUrl: string;
  authToken: () => Promise<string | null>;
} | {
  baseUrl?: string;
  apiKey: string;
  userId: string;
  workspaceId: string;
} | {
  baseUrl: string;
  anonymous: true;
}) & {
  telemetry?: boolean | AssistantCloudTelemetryConfig;
};

type AssistantCloudEvent = {
  kind: AssistantCloudEventKind;
  thread_id?: string | undefined;
  message_id?: string | undefined;
  run_id?: string | undefined;
  value?: number | undefined;
  props?: Readonly<Record<string, string | number | boolean>> | undefined;
};

type AssistantCloudEventKind = "attachment_added" | "attachment_failed" | "branch_switched" | "error_shown" | "message_copied" | "message_edited" | "message_regenerated" | "message_sent" | "run_stopped" | "speech_started" | "suggestion_clicked" | "suggestions_shown" | "thread_switched" | "tool_approved" | "tool_rejected" | "voice_started";

declare class AssistantCloudEvents {
  #private;
  constructor(cloud: AssistantCloudAPI, isEnabled: () => boolean);
  track(event: AssistantCloudEvent): void;
  dispose(): void;
}

declare class AssistantCloudFiles {
  #private;
  constructor(cloud: AssistantCloudAPI);
  pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
  generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
  generatePresignedDownloadUrl(body: {
    key: string;
  } | {
    url: string;
  }): Promise<GeneratePresignedDownloadUrlResponse>;
}

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudProjectThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadMessageListResponse = {
  messages: CloudMessage[];
};

declare class AssistantCloudProjectThreadMessages {
  #private;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudProjectThreadMessageListQuery): Promise<AssistantCloudProjectThreadMessageListResponse>;
}

declare class AssistantCloudProjectThreads {
  #private;
  readonly messages: AssistantCloudProjectThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudProjectThreadsListQuery): Promise<AssistantCloudProjectThreadsListResponse>;
}

type AssistantCloudProjectThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadsListResponse = {
  threads: CloudThread[];
};

declare class AssistantCloudProjects {
  readonly threads: AssistantCloudProjectThreads;
  constructor(cloud: AssistantCloudAPI);
}

type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "error" | "incomplete";
  outcome_type?: "aborted" | "content_filter" | "disconnected" | "length";
  message_id?: string;
  first_token_ms?: number;
  release?: string;
  environment?: string;
  tags?: string[];
  provider?: string;
  trace_id?: string;
  error_code?: string;
  error?: string;
  total_steps?: number;
  tool_calls?: AssistantCloudRunReportToolCall[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: AssistantCloudRunReportToolCall[];
    start_ms?: number;
    end_ms?: number;
    finish_reason?: string;
  }[];
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  model_id?: string;
  provider_type?: string;
  duration_ms?: number;
  output_text?: string;
  metadata?: Record<string, unknown>;
};

type AssistantCloudRunReportToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "backend" | "frontend" | "mcp";
  start_ms?: number;
  end_ms?: number;
  sampling_calls?: SamplingCallData[];
};

declare class AssistantCloudRuns {
  #private;
  constructor(cloud: AssistantCloudAPI);
  __internal_getAssistantOptions(assistantId: string): {
    api: string;
    headers: () => Promise<{
      Accept: string;
    }>;
    body: {
      assistant_id: string;
      response_format: string;
      thread_id: string;
    };
  };
  stream(body: AssistantCloudRunsStreamBody): Promise<AssistantStream>;
  report(body: AssistantCloudRunReport): Promise<{
    run_id: string;
  }>;
}

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[];
};

type AssistantCloudScoreBody = {
  name: string;
  data_type: "boolean" | "categorical" | "numeric";
  value?: number | boolean;
  string_value?: string;
  comment?: string;
  thread_id?: string;
  message_id?: string;
  run_id?: string;
};

type AssistantCloudScoreResponse = {
  score_id: string;
  name: string;
  data_type: "boolean" | "categorical" | "numeric";
  value: number | null;
  string_value: string | null;
};

declare class AssistantCloudScores {
  #private;
  constructor(cloud: AssistantCloudAPI);
  create(body: AssistantCloudScoreBody): Promise<AssistantCloudScoreResponse>;
}

type AssistantCloudSpanProcessorOptions = {
  filter?: (span: ReadableSpan) => boolean;
};

type AssistantCloudTelemetryConfig = {
  enabled?: boolean;
  events?: boolean;
  release?: string;
  environment?: string;
  tags?: string[];
  beforeReport?: (report: AssistantCloudRunReport) => AssistantCloudRunReport | null;
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageFeedbackBody = {
  type: "negative" | "positive";
};

type AssistantCloudThreadMessageFeedbackResponse = {
  feedback_id: string;
  type: "negative" | "positive";
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
};

declare class AssistantCloudThreadMessages {
  #private;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudThreadMessageListQuery): Promise<AssistantCloudThreadMessageListResponse>;
  create(threadId: string, body: AssistantCloudThreadMessageCreateBody): Promise<AssistantCloudMessageCreateResponse>;
  update(threadId: string, messageId: string, body: AssistantCloudThreadMessageUpdateBody): Promise<void>;
  feedback(threadId: string, messageId: string, body: AssistantCloudThreadMessageFeedbackBody): Promise<AssistantCloudThreadMessageFeedbackResponse>;
}

declare class AssistantCloudThreads {
  #private;
  readonly messages: AssistantCloudThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudThreadsListQuery): Promise<AssistantCloudThreadsListResponse>;
  get(threadId: string): Promise<CloudThread>;
  create(body: AssistantCloudThreadsCreateBody): Promise<AssistantCloudThreadsCreateResponse>;
  update(threadId: string, body: AssistantCloudThreadsUpdateBody): Promise<void>;
  claim(body: AssistantCloudThreadsClaimBody): Promise<AssistantCloudThreadsClaimResponse>;
  delete(threadId: string): Promise<void>;
}

type AssistantCloudThreadsClaimBody = {
  refresh_token: string;
};

type AssistantCloudThreadsClaimResponse = {
  moved: number;
};

type AssistantCloudThreadsCreateBody = {
  title?: string | undefined;
  last_message_at: Date;
  metadata?: unknown | undefined;
  external_id?: string | undefined;
};

type AssistantCloudThreadsCreateResponse = {
  thread_id: string;
};

type AssistantCloudThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
};

type AssistantCloudThreadsUpdateBody = {
  title?: string | undefined;
  last_message_at?: Date | undefined;
  metadata?: unknown | undefined;
  is_archived?: boolean | undefined;
};

type AssistantCloudTraceExportOptions = {
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
};

type AssistantStream = ReadableStream<AssistantStreamChunk>;

declare const AssistantStream: {
  toResponse(stream: AssistantStream, transformer: AssistantStreamEncoder): Response;
  fromResponse(response: Response, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
  toByteStream(stream: AssistantStream, transformer: ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk>): ReadableStream<Uint8Array<ArrayBuffer>>;
  fromByteStream(readable: ReadableStream<Uint8Array<ArrayBuffer>>, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
};

type AssistantStreamChunk = {
  readonly path: readonly number[];
} & ({
  readonly type: "part-start";
  readonly part: PartInit;
} | {
  readonly type: "part-finish";
} | {
  readonly type: "tool-call-args-text-finish";
} | {
  readonly type: "text-delta";
  readonly textDelta: string;
} | {
  readonly type: "annotations";
  readonly annotations: ReadonlyJSONValue[];
} | {
  readonly type: "data";
  readonly data: ReadonlyJSONValue[];
} | {
  readonly type: "step-start";
  readonly messageId: string;
} | {
  readonly type: "step-finish";
  readonly finishReason: "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly isContinued: boolean;
} | {
  readonly type: "message-finish";
  readonly finishReason: "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
} | {
  readonly type: "result";
  readonly artifact?: ReadonlyJSONValue;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;
} | {
  readonly type: "error";
  readonly error: string;
  readonly code?: string;
  readonly severity?: "critical" | "info" | "warning";
} | {
  readonly type: "update-state";
  readonly operations: AssistantTransportStateOperation[];
});

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

type AssistantTransportStateOperation = {
  readonly type: "set";
  readonly path: readonly string[];
  readonly value: ReadonlyJSONValue;
} | {
  readonly type: "append-text";
  readonly path: readonly string[];
  readonly value: string;
};

declare class CloudAPIError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>);
}

declare class CloudEngagementReporter {
  #private;
  constructor(cloud: AssistantCloud | (() => AssistantCloud), resolveIds?: EngagementIdResolver);
  runStarted(threadId: string): void;
  runEnded(threadId: string): void;
  runStopped(threadId: string): void;
  messageSent(threadId: string, init: {
    messageId?: string | undefined;
    chars: number;
    attachments: number;
  }): void;
  messageEdited(threadId: string, init: {
    messageId: string;
    chars: number;
  }): void;
  messageRegenerated(threadId: string, messageId?: string): void;
  errorShown(threadId: string, init: {
    messageId?: string | undefined;
    reason: string;
  }): void;
  suggestionsShown(threadId: string, count: number): void;
  suggestionClicked(threadId: string): void;
  attachmentAdded(threadId: string, init: {
    messageId?: string | undefined;
    contentType?: string | undefined;
  }): void;
  attachmentFailed(threadId: string, init: {
    messageId?: string | undefined;
    contentType?: string | undefined;
  }): void;
  voiceStarted(threadId: string): void;
  speechStarted(threadId: string, messageId?: string): void;
  branchSwitched(threadId: string, messageId?: string): void;
  messageCopied(threadId: string, messageId?: string): void;
  threadSwitched(threadId: string): void;
}

type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

declare class CloudMessagePersistence {
  #private;
  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  append(threadId: string, messageId: string, parentId: string | null, format: string, content: ReadonlyJSONObject): Promise<void>;
  update(threadId: string, messageId: string, _format: string, content: ReadonlyJSONObject): Promise<void>;
  isPersisted(messageId: string): boolean;
  getRemoteId(messageId: string): Promise<string | undefined>;
  getResolvedRemoteId(messageId: string): string | undefined;
  load(threadId: string, format?: string): Promise<CloudMessage[]>;
  reset(): void;
}

declare class CloudResponseError extends Error {
  constructor(message: string);
}

type CloudRunReportInit = Omit<RunReportInit, "telemetry">;

declare class CloudRunReporter {
  #private;
  constructor(cloud: AssistantCloud | (() => AssistantCloud));
  report(init: CloudRunReportInit, key?: string): Promise<void>;
}

type CloudThread = {
  title: string;
  last_message_at: Date;
  metadata: unknown;
  external_id: string | null;
  id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
  is_archived: boolean;
};

type EngagementEventIds = Pick<AssistantCloudEvent, "message_id" | "run_id" | "thread_id">;

type EngagementIdResolver = (threadId: string, messageId: string | undefined, options: {
  awaitThread: boolean;
}) => EngagementEventIds | Promise<EngagementEventIds>;

interface ExportResult {
  code: ExportResultCode;
  error?: Error;
}

declare enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1
}

type GeneratePresignedDownloadUrlResponse = {
  signedUrl: string;
  expiresAt: string;
  key: string;
};

type GeneratePresignedUploadUrlRequestBody = {
  filename: string;
};

type GeneratePresignedUploadUrlResponse = {
  success: boolean;
  signedUrl: string;
  expiresAt: string;
  publicUrl: string;
  key?: string;
};

interface InstrumentationScope {
  readonly name: string;
  readonly version?: string;
  readonly schemaUrl?: string;
}

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
  keepalive?: boolean | undefined;
};

type MaybePromise<T> = T | Promise<T>;

type McpSamplingHandler = (request: McpSamplingRequest) => Promise<McpSamplingResponse>;

type McpSamplingRequest = {
  method: "sampling/createMessage";
  params: {
    messages: unknown[];
    modelPreferences?: {
      hints?: {
        name?: string;
      }[];
    };
    maxTokens?: number;
    [key: string]: unknown;
  };
};

type McpSamplingResponse = {
  model?: string;
  content: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  };
  [key: string]: unknown;
};

type MessageFormatAdapter<TMessage, TStorageFormat> = {
  format: string;
  encode(item: {
    parentId: string | null;
    message: TMessage;
  }): TStorageFormat;
  decode(stored: {
    id: string;
    parent_id: string | null;
    format: string;
    content: TStorageFormat;
  }): {
    parentId: string | null;
    message: TMessage;
  };
  getId(message: TMessage): string;
};

type PartInit = {
  readonly type: "text";
  readonly parentId?: string;
} | {
  readonly type: "reasoning";
  readonly unstable_summary?: string;
  readonly parentId?: string;
} | {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly parentId?: string;
} | {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly parentId?: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
} | {
  readonly type: "data";
  readonly name: string;
  readonly data: ReadonlyJSONValue;
  readonly parentId?: string;
};

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
};

type RawResourceAttribute = [
  string,
  MaybePromise<AttributeValue | undefined>
];

interface ReadableSpan {
  readonly name: string;
  readonly kind: SpanKind;
  readonly spanContext: () => SpanContext;
  readonly parentSpanContext?: SpanContext;
  readonly startTime: HrTime;
  readonly endTime: HrTime;
  readonly status: SpanStatus;
  readonly attributes: Attributes;
  readonly links: Link[];
  readonly events: TimedEvent[];
  readonly duration: HrTime;
  readonly ended: boolean;
  readonly resource: Resource;
  readonly instrumentationScope: InstrumentationScope;
  readonly droppedAttributesCount: number;
  readonly droppedEventsCount: number;
  readonly droppedLinksCount: number;
}

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

interface Resource {
  readonly asyncAttributesPending?: boolean;
  readonly attributes: Attributes;
  readonly schemaUrl?: string;
  waitForAsyncAttributes?(): Promise<void>;
  merge(other: Resource | null): Resource;
  getRawAttributes(): RawResourceAttribute[];
}

type RunReportInit = {
  threadId: string;
  status: AssistantCloudRunReport["status"];
  outcome?: RunReportOutcome | undefined;
  errorCode?: string | undefined;
  error?: string | undefined;
  messageId?: string | undefined;
  traceId?: string | undefined;
  modelId?: string | undefined;
  provider?: string | undefined;
  usage?: RunTelemetryUsageInit | undefined;
  steps?: RunReportStepInit[] | undefined;
  totalSteps?: number | undefined;
  toolCalls?: AssistantCloudRunReportToolCall[] | undefined;
  durationMs?: number | undefined;
  firstTokenMs?: number | undefined;
  outputText?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  telemetry?: {
    environment?: string | undefined;
    release?: string | undefined;
    tags?: readonly string[] | undefined;
  };
};

type RunReportOutcome = "aborted" | "content_filter" | "disconnected" | "length";

type RunReportStepInit = {
  usage?: RunTelemetryUsageInit | undefined;
  toolCalls?: AssistantCloudRunReportToolCall[] | undefined;
  startMs?: number | undefined;
  endMs?: number | undefined;
  finishReason?: string | undefined;
};

type RunTelemetryToolCallInit = {
  toolName: string;
  toolCallId: string;
  args?: unknown;
  argsText?: string | undefined;
  result?: unknown;
  toolSource?: "mcp" | "frontend" | "backend" | undefined;
};

type RunTelemetryUsage = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  reasoningTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
};

type RunTelemetryUsageInit = RunTelemetryUsage & {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  inputTokenDetails?: {
    cacheReadTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
};

type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  duration_ms?: number;
};

type Span$1 = Span & ReadableSpan;

interface SpanExporter {
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
  shutdown(): Promise<void>;
  forceFlush?(): Promise<void>;
}

interface SpanProcessor {
  forceFlush(): Promise<void>;
  onStart(span: Span$1, parentContext: Context): void;
  onEnding?(span: Span$1): void;
  onEnd(span: ReadableSpan): void;
  shutdown(): Promise<void>;
}

interface TimedEvent {
  time: HrTime;
  name: string;
  attributes?: Attributes;
  droppedAttributesCount?: number;
}

type ToolModelContentPart = {
  readonly type: "text";
  readonly text: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mediaType: string;
  readonly filename?: string;
};

declare const aiSDKV6FormatAdapter: MessageFormatAdapter<UIMessage, AISDKStorageFormat>;

declare function assistantCloudTraceExportOptions(_param0: AssistantCloudTraceExportOptions): {
  url: string;
  headers: Record<string, string>;
};

declare function assistantCloudTraceMetadata(): {
  traceId?: string;
};

declare function createAssistantCloudSpanProcessor(exporter: SpanExporter, options?: AssistantCloudSpanProcessorOptions): SpanProcessor;

declare function createAssistantCloudTraceExporter(options: AssistantCloudTraceExportOptions): SpanExporter;

declare const createFormattedPersistence: <TMessage, TStorageFormat>(persistence: {
  append: (threadId: string, messageId: string, parentId: string | null, format: string, content: ReadonlyJSONObject) => Promise<void>;
  load: (threadId: string, format?: string) => Promise<any[]>;
  isPersisted: (messageId: string) => boolean;
  update?: (threadId: string, messageId: string, format: string, content: ReadonlyJSONObject) => Promise<void>;
}, adapter: MessageFormatAdapter<TMessage, TStorageFormat>) => {
  append: (threadId: string, item: {
    parentId: string | null;
    message: TMessage;
  }) => Promise<void>;
  update: ((threadId: string, item: {
    parentId: string | null;
    message: TMessage;
  }, messageId: string) => Promise<void>) | undefined;
  load: (threadId: string) => Promise<{
    messages: {
      parentId: string | null;
      message: TMessage;
    }[];
  }>;
  isPersisted: (messageId: string) => boolean;
};

declare function createRunReport(init: RunReportInit): AssistantCloudRunReport;

declare function createRunTelemetryToolCall(init: RunTelemetryToolCallInit): AssistantCloudRunReportToolCall;

declare function createSamplingCollector(): {
  collect: (data: SamplingCallData) => number;
  getCalls: () => SamplingCallData[];
  reset: () => void;
};

declare function deriveRunOutcome(input: {
  finishReason?: string | undefined;
  isAbort?: boolean | undefined;
  isDisconnect?: boolean | undefined;
  isError?: boolean | undefined;
}, fallbackStatus?: "completed" | "incomplete"): {
  status: "completed" | "error" | "incomplete";
  outcome?: RunReportOutcome;
};

declare function describeRunError(error: unknown): {
  error?: string;
  errorCode?: string;
};

declare function extractAISDKRunTelemetry(messages: readonly AISDKMessageLike[]): AISDKRunTelemetry | null;

declare function extractRunTelemetryModelId(metadata: Record<string, unknown> | undefined): string | undefined;

declare function generateThreadTitle(cloud: AssistantCloud, options: {
  threadId: string;
  messages: readonly {
    role: string;
    content: readonly {
      type: "text";
      text: string;
    }[];
  }[];
}): Promise<string | null>;

declare namespace entry_ai_sdk_exports {
  export { AISDKMessageLike, AISDKRunTelemetry, AISDKStorageFormat, aiSDKV6FormatAdapter, extractAISDKRunTelemetry };
}

declare namespace entry_root_exports {
  export { AssistantCloud, AssistantCloudEvent, AssistantCloudEventKind, AssistantCloudEvents, AssistantCloudRunReport, AssistantCloudRunReportToolCall, AssistantCloudScoreBody, AssistantCloudScoreResponse, AssistantCloudScores, AssistantCloudTelemetryConfig, AssistantCloudThreadMessageFeedbackBody, AssistantCloudThreadMessageFeedbackResponse, CloudAPIError, CloudEngagementReporter, CloudMessage, CloudMessagePersistence, CloudResponseError, CloudRunReportInit, CloudRunReporter, EngagementEventIds, EngagementIdResolver, GeneratePresignedDownloadUrlResponse, McpSamplingHandler, MessageFormatAdapter, RunReportInit, RunReportOutcome, RunReportStepInit, RunTelemetryToolCallInit, RunTelemetryUsage, RunTelemetryUsageInit, SamplingCallData, createFormattedPersistence, createRunReport, createRunTelemetryToolCall, createSamplingCollector, deriveRunOutcome, describeRunError, extractRunTelemetryModelId, generateThreadTitle, normalizeRunTelemetryUsage, readAnonymousRefreshToken, truncateRunTelemetryText, wrapSamplingHandler };
}

declare namespace entry_telemetry_exports {
  export { AssistantCloudSpanProcessorOptions, AssistantCloudTraceExportOptions, assistantCloudTraceExportOptions, assistantCloudTraceMetadata, createAssistantCloudSpanProcessor, createAssistantCloudTraceExporter, isAssistantCloudSpan, withAssistantCloudTraceMetadata };
}

declare function isAssistantCloudSpan(span: ReadableSpan): boolean;

declare function normalizeRunTelemetryUsage(usage: RunTelemetryUsageInit): RunTelemetryUsage | undefined;

declare const readAnonymousRefreshToken: (baseUrl: string) => string | null;

declare function truncateRunTelemetryText(value: string): string;

declare function withAssistantCloudTraceMetadata<Part extends {
  type: string;
} = {
  type: string;
}>(messageMetadata?: (options: {
  part: Part;
}) => Record<string, unknown> | undefined): (options: {
  part: Part;
}) => Record<string, unknown> | undefined;

declare function wrapSamplingHandler(handler: McpSamplingHandler, onSamplingCall: (data: SamplingCallData) => void): McpSamplingHandler;

export { entry_ai_sdk_exports as entry_ai_sdk, entry_root_exports as entry_root, entry_telemetry_exports as entry_telemetry };
