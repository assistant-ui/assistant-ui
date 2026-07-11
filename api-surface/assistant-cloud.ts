import "@standard-schema/spec";

declare class AssistantCloud {
  readonly threads: AssistantCloudThreads;
  readonly auth: {
    tokens: AssistantCloudAuthTokens;
  };
  readonly runs: AssistantCloudRuns;
  readonly files: AssistantCloudFiles;
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
  private cloud;
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

declare class AssistantCloudFiles {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
  generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
}

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "error" | "incomplete";
  total_steps?: number;
  tool_calls?: ReportToolCall[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: ReportToolCall[];
    start_ms?: number;
    end_ms?: number;
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

declare class AssistantCloudRuns {
  private cloud;
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

type AssistantCloudTelemetryConfig = {
  enabled?: boolean;
  beforeReport?: (report: AssistantCloudRunReport) => AssistantCloudRunReport | null;
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
};

declare class AssistantCloudThreadMessages {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudThreadMessageListQuery): Promise<AssistantCloudThreadMessageListResponse>;
  create(threadId: string, body: AssistantCloudThreadMessageCreateBody): Promise<AssistantCloudMessageCreateResponse>;
  update(threadId: string, messageId: string, body: AssistantCloudThreadMessageUpdateBody): Promise<void>;
}

declare class AssistantCloudThreads {
  private cloud;
  readonly messages: AssistantCloudThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudThreadsListQuery): Promise<AssistantCloudThreadsListResponse>;
  get(threadId: string): Promise<CloudThread>;
  create(body: AssistantCloudThreadsCreateBody): Promise<AssistantCloudThreadsCreateResponse>;
  update(threadId: string, body: AssistantCloudThreadsUpdateBody): Promise<void>;
  delete(threadId: string): Promise<void>;
}

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
} | {
  readonly type: "update-state";
  readonly operations: ObjectStreamOperation[];
});

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

declare class CloudAPIError extends Error {
  readonly status: number;
  constructor(message: string, status: number);
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
  private cloud;
  private idMapping;
  constructor(cloud: AssistantCloud);
  append(threadId: string, messageId: string, parentId: string | null, format: string, content: ReadonlyJSONObject): Promise<void>;
  update(threadId: string, messageId: string, _format: string, content: ReadonlyJSONObject): Promise<void>;
  isPersisted(messageId: string): boolean;
  getRemoteId(messageId: string): Promise<string | undefined>;
  load(threadId: string, format?: string): Promise<CloudMessage[]>;
  reset(): void;
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

type GeneratePresignedUploadUrlRequestBody = {
  filename: string;
};

type GeneratePresignedUploadUrlResponse = {
  success: boolean;
  signedUrl: string;
  expiresAt: string;
  publicUrl: string;
};

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
};

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

type ObjectStreamOperation = {
  readonly type: "set";
  readonly path: readonly string[];
  readonly value: ReadonlyJSONValue;
} | {
  readonly type: "append-text";
  readonly path: readonly string[];
  readonly value: string;
};

type PartInit = {
  readonly type: "reasoning" | "text";
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

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReportToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "backend" | "frontend" | "mcp";
  start_ms?: number;
  end_ms?: number;
  sampling_calls?: SamplingCallData[];
};

type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  duration_ms?: number;
};

type ToolModelContentPart = {
  readonly type: "text";
  readonly text: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mediaType: string;
  readonly filename?: string;
};

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

declare function createSamplingCollector(): {
  collect: (data: SamplingCallData) => number;
  getCalls: () => SamplingCallData[];
  reset: () => void;
};

declare namespace entry_root_exports {
  export { AssistantCloud, AssistantCloudRunReport, AssistantCloudTelemetryConfig, CloudAPIError, CloudMessage, CloudMessagePersistence, McpSamplingHandler, MessageFormatAdapter, SamplingCallData, createFormattedPersistence, createSamplingCollector, wrapSamplingHandler };
}

declare function wrapSamplingHandler(handler: McpSamplingHandler, onSamplingCall: (data: SamplingCallData) => void): McpSamplingHandler;

export { entry_root_exports as entry_root };
