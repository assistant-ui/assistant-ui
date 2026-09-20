import { StandardSchemaV1 } from "@standard-schema/spec";

import { Cluster, Redis } from "ioredis";

import { JSONSchema7 } from "json-schema";

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type AssistantMessage = {
  role: "assistant";
  status: AssistantMessageStatus;
  parts: AssistantMessagePart[];
  content: AssistantMessagePart[];
  metadata: {
    unstable_state: ReadonlyJSONValue;
    unstable_data: ReadonlyJSONValue[];
    unstable_annotations: ReadonlyJSONValue[];
    steps: AssistantMessageStepMetadata[];
    custom: Record<string, unknown>;
    timing?: AssistantMessageTiming;
  };
};

declare class AssistantMessageAccumulator extends TransformStream<AssistantStreamChunk, AssistantMessage> {
  constructor(_param0?: {
    initialMessage?: AssistantMessage;
    throttle?: boolean;
    onError?: (error: string) => void;
    strict?: boolean | undefined;
  });
}

type AssistantMessagePart = TextPart | ReasoningPart | ToolCallPart | SourcePart | FilePart | DataPart;

type AssistantMessageStatus = {
  type: "running";
} | {
  type: "requires-action";
  reason: "tool-calls";
} | {
  type: "complete";
  reason: "stop" | "unknown";
} | {
  type: "incomplete";
  reason: "cancelled" | "content-filter" | "error" | "length" | "other" | "tool-calls";
  error?: ReadonlyJSONValue;
};

type AssistantMessageStepMetadata = {
  state: "started";
  messageId: string;
} | {
  state: "finished";
  messageId: string;
  finishReason: "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";
  usage?: AssistantMessageStepUsage;
  isContinued: boolean;
};

type AssistantMessageStepUsage = {
  inputTokens: number;
  outputTokens: number;
};

declare class AssistantMessageStream {
  readonly readable: ReadableStream<AssistantMessage>;
  constructor(readable: ReadableStream<AssistantMessage>);
  static fromAssistantStream(stream: AssistantStream): AssistantMessageStream;
  unstable_result(): Promise<AssistantMessage>;
  [Symbol.asyncIterator](): AsyncIterator<AssistantMessage, any, any>;
  tee(): [
    AssistantMessageStream,
    AssistantMessageStream
  ];
}

type AssistantMessageTiming = {
  streamStartTime: number;
  firstTokenTime?: number;
  totalStreamTime?: number;
  tokenCount?: number;
  tokensPerSecond?: number;
  totalChunks: number;
  toolCallCount: number;
};

type AssistantMetaStreamChunk = (AssistantStreamChunk & {
  type: "part-finish" | "text-delta";
  meta: PartInit;
}) | (AssistantStreamChunk & {
  type: "result" | "tool-call-args-text-finish";
  meta: PartInit & {
    type: "tool-call";
  };
}) | (AssistantStreamChunk & {
  type: Exclude<AssistantStreamChunk["type"], "part-finish" | "result" | "text-delta" | "tool-call-args-text-finish">;
});

declare class AssistantMetaTransformStream extends TransformStream<AssistantStreamChunk, AssistantMetaStreamChunk> {
  constructor();
}

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
  readonly isPreliminary?: boolean;
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

type AssistantStreamController = {
  appendText(textDelta: string): void;
  appendReasoning(reasoningDelta: string, options?: ReasoningPartInit): void;
  appendSource(options: SourcePart): void;
  appendFile(options: FilePart): void;
  appendData(options: DataPart): void;
  addTextPart(): TextStreamController;
  addReasoningPart(options?: ReasoningPartInit): TextStreamController;
  addToolCallPart(options: string): ToolCallStreamController;
  addToolCallPart(options: ToolCallPartInit): ToolCallStreamController;
  enqueue(chunk: AssistantStreamChunk): void;
  merge(stream: AssistantStream): void;
  close(): void;
  withParentId(parentId: string): AssistantStreamController;
};

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

type AssistantStreamOptions = {
  strict?: boolean | undefined;
};

declare class AssistantTransformStream<I> extends TransformStream<I, AssistantStreamChunk> {
  constructor(transformer: AssistantTransformer<I>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<AssistantStreamChunk>);
}

type AssistantTransformer<I> = {
  strict?: boolean | undefined;
  flush?: AssistantTransformerFlushCallback;
  start?: AssistantTransformerStartCallback;
  transform?: AssistantTransformerTransformCallback<I>;
};

type AssistantTransformerFlushCallback = (controller: AssistantStreamController) => void | PromiseLike<void>;

type AssistantTransformerStartCallback = (controller: AssistantStreamController) => void | PromiseLike<void>;

type AssistantTransformerTransformCallback<I> = (chunk: I, controller: AssistantStreamController) => void | PromiseLike<void>;

declare class AssistantTransportDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor(options?: {
    strict?: boolean | undefined;
  });
}

declare class AssistantTransportEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

type AssistantTransportStateOperation = {
  readonly type: "set";
  readonly path: readonly string[];
  readonly value: ReadonlyJSONValue;
} | {
  readonly type: "append-text";
  readonly path: readonly string[];
  readonly value: string;
};

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type AttachmentLike = {
  content: readonly MessagePartLike[];
};

type BackendTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "backend";
  description?: undefined;
  parameters?: undefined;
  disabled?: undefined;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: undefined;
};

type BackendToolDeclaration<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "backend";
  description?: string | undefined;
  parameters?: StandardSchemaV1<TArgs> | JSONSchema7 | undefined;
  disabled?: boolean;
  execute?: ToolExecuteFunction<TArgs, TResult>;
  toModelOutput?: ToolModelOutputFunction<TArgs, TResult>;
  experimental_onSchemaValidationError?: OnSchemaValidationErrorFunction<TResult>;
  providerOptions?: ProviderOptions;
};

type CreateResumableAssistantStreamResponseOptions = {
  readonly context: ResumableStreamContext;
  readonly streamId: string;
  readonly callback: (controller: AssistantStreamController) => PromiseLike<void> | void;
  readonly encoder?: () => AssistantStreamEncoder;
  readonly headers?: HeadersInit;
};

type CreateResumeAssistantStreamResponseOptions = {
  readonly context: ResumableStreamContext;
  readonly streamId: string;
  readonly encoder?: () => AssistantStreamEncoder;
  readonly headers?: HeadersInit;
  readonly missingResponse?: () => Response;
};

type DataPart = {
  type: "data";
  name: string;
  data: ReadonlyJSONValue;
  parentId?: string;
};

declare class DataStreamDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor(options?: DataStreamOptions);
}

declare class DataStreamEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

type DataStreamOptions = {
  strict?: boolean | undefined;
};

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

type FieldState = "complete" | "partial";

type FilePart = {
  type: "file";
  data: string;
  mimeType: string;
  parentId?: string;
};

type FinishReason = "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";

type FrontendTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "frontend";
  description?: string | undefined;
  parameters: StandardSchemaV1<TArgs> | JSONSchema7;
  disabled?: boolean;
  execute?: ToolExecuteFunction<TArgs, TResult>;
  toModelOutput?: ToolModelOutputFunction<TArgs, TResult>;
  experimental_onSchemaValidationError?: OnSchemaValidationErrorFunction<TResult>;
  providerOptions?: ProviderOptions;
};

type GenericAssistantMessage = {
  role: "assistant";
  content: (GenericTextPart | GenericToolCallPart)[];
};

type GenericFilePart = {
  type: "file";
  data: string | URL;
  mediaType: string;
  filename?: string;
};

type GenericMessage = GenericSystemMessage | GenericUserMessage | GenericAssistantMessage | GenericToolMessage;

type GenericSystemMessage = {
  role: "system";
  content: string;
};

type GenericTextPart = {
  type: "text";
  text: string;
};

type GenericToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};

type GenericToolMessage = {
  role: "tool";
  content: GenericToolResultPart[];
};

type GenericToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
};

type GenericUserMessage = {
  role: "user";
  content: (GenericTextPart | GenericFilePart)[];
};

type GorpStreamChunk = {
  readonly snapshot: ReadonlyJSONValue;
  readonly operations: readonly GorpStreamOperation[];
};

declare class GorpStreamDeltaTracker {
  #private;
  constructor(initialValue?: ReadonlyJSONValue);
  get state(): ReadonlyJSONValue;
  append(operations: readonly GorpStreamOperation[]): void;
  isChangedAt(path: readonly string[]): boolean;
  getChangedKeys(path: readonly string[]): string[];
}

type GorpStreamOperation = AssistantTransportStateOperation;

declare class GorpStreamResponse extends Response {
  constructor(body: ReadableStream<GorpStreamChunk>);
}

type HumanTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "human";
  description?: string | undefined;
  parameters: StandardSchemaV1<TArgs> | JSONSchema7;
  disabled?: boolean;
  display?: "standalone";
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: ProviderOptions;
};

type InMemoryResumableStreamStoreOptions = {
  readonly defaultTtlMs?: number;
  readonly now?: () => number;
  readonly maxChunkBytes?: number;
  readonly maxEntriesPerStream?: number;
  readonly maxStreams?: number;
  readonly gcIntervalMs?: number;
};

type IoRedisLike = Redis | Cluster;

type McpServerConfig = {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  redirect?: "error" | "follow";
  connectionTimeout?: number | undefined;
} | {
  type: "stdio";
  command: string;
  args?: readonly string[];
  env?: Record<string, string>;
  cwd?: string;
  connectionTimeout?: number | undefined;
};

type McpTool = ToolBase<Record<string, unknown>, unknown> & {
  type: "mcp";
  server: McpServerConfig;
  description?: undefined;
  parameters?: undefined;
  disabled?: boolean;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: undefined;
};

type MessagePartLike = {
  type: string;
  text?: string;
  image?: string;
  data?: string;
  mimeType?: string;
  filename?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  state?: string;
  result?: unknown;
  isError?: boolean;
  isPreliminary?: boolean;
  approval?: {
    approved?: boolean;
    resolution?: string;
    [key: string]: unknown;
  };
  interrupt?: unknown;
};

type NodeRedisFields = Record<string, string | Buffer>;

interface NodeRedisLike {
  set(key: string, value: string, options: {
    NX: true;
    EX: number;
  }): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(keys: string | string[]): Promise<unknown>;
  sendCommand<T = unknown>(args: ReadonlyArray<string | Buffer>, options?: {
    typeMapping?: Record<number, unknown>;
  }): Promise<T>;
  multi(): NodeRedisMultiCommand;
}

interface NodeRedisMultiCommand {
  xAdd(key: string, id: string, fields: NodeRedisFields): NodeRedisMultiCommand;
  expire(key: string, seconds: number): NodeRedisMultiCommand;
  execAsPipeline(): Promise<unknown>;
}

type ObjectKey<T> = keyof T & (string | number);

type ObjectStreamChunk = GorpStreamChunk;

declare const ObjectStreamResponse: typeof GorpStreamResponse;

type ObjectStreamResponse = GorpStreamResponse;

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

declare const PARTIAL_JSON_OBJECT_META_SYMBOL: unique symbol;

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

type PartialJsonObjectMeta = {
  state: "complete" | "partial";
  partialPath: string[];
};

declare class PipeableTransformStream<I, O> extends TransformStream<I, O> {
  constructor(transform: (readable: ReadableStream<I>) => ReadableStream<O>);
}

type PipelineCommand = {
  readonly type: "xAdd";
  readonly key: string;
  readonly fields: Record<string, string | Uint8Array>;
} | {
  readonly type: "expire";
  readonly key: string;
  readonly ttlSec: number;
};

declare class PlainTextDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor();
}

declare class PlainTextEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

type ProviderOptions = Record<string, Record<string, unknown>>;

type ProviderTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "provider";
  providerId: `${string}.${string}`;
  parameters?: StandardSchemaV1<TArgs> | JSONSchema7 | undefined;
  args: Record<string, unknown>;
  supportsDeferredResults?: boolean;
  description?: undefined;
  disabled?: boolean;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: ProviderOptions;
};

declare const RESUMABLE_STREAM_ID_HEADER = "x-resumable-stream-id";

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReasoningPart = {
  type: "reasoning";
  text: string;
  status: TextStatus;
  unstable_summary?: string;
  parentId?: string;
};

type ReasoningPartInit = {
  unstable_summary?: string;
};

type RedisAppendOptions = {
  readonly metaKey: string;
  readonly expectedMeta: string;
  readonly dataKey: string;
  readonly fields: Record<string, string | Uint8Array>;
  readonly ttlSec: number;
};

type RedisDeleteOptions = {
  readonly metaKey: string;
  readonly expectedMeta: string;
  readonly dataKeys: readonly string[];
};

type RedisFinalizeOptions = {
  readonly metaKey: string;
  readonly expectedMeta: string;
  readonly nextMeta: string;
  readonly dataKey: string;
  readonly fields: Record<string, string>;
  readonly ttlSec: number;
};

interface RedisLikeClient {
  setNX(key: string, value: string, ttlSec: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  del(keys: string[]): Promise<void>;
  xRange(key: string, start: string, end: string): Promise<Array<{
    id: string;
    fields: Record<string, string | Uint8Array>;
  }>>;
  pipeline(commands: readonly PipelineCommand[]): Promise<void>;
  appendIfUnchanged?(options: RedisAppendOptions): Promise<boolean>;
  finalizeIfUnchanged(options: RedisFinalizeOptions): Promise<boolean>;
  deleteIfUnchanged?(options: RedisDeleteOptions): Promise<boolean>;
}

type RedisResumableStreamStoreOptions = {
  readonly keyPrefix?: string;
  readonly defaultTtlMs?: number;
  readonly pollIntervalMs?: number;
  readonly maxChunkBytes?: number;
};

type ResumableStreamAcquireOptions = {
  readonly ttlMs?: number;
};

type ResumableStreamAcquisition = {
  readonly role: "producer";
  readonly lease: ResumableStreamLease;
} | {
  readonly role: "consumer";
};

interface ResumableStreamContext {
  run(streamId: string, makeStream: () => ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>>;
  resume(streamId: string): Promise<ReadableStream<Uint8Array> | null>;
  requireResume(streamId: string): Promise<ReadableStream<Uint8Array>>;
  status(streamId: string): Promise<ResumableStreamStatus>;
  delete(streamId: string): Promise<void>;
}

type ResumableStreamContextOptions = {
  readonly store: ResumableStreamStore;
  readonly ttlMs?: number;
  readonly waitUntil?: (promise: Promise<unknown>) => void;
  readonly onAcquire?: (streamId: string, role: ResumableStreamRole) => void;
  readonly onAppend?: (streamId: string, byteLength: number) => void;
  readonly onFinalize?: (streamId: string, status: "done" | "error", error?: string) => void;
  readonly onError?: (streamId: string, error: unknown) => void;
};

type ResumableStreamEntry = {
  readonly cursor: string;
  readonly chunk: Uint8Array;
};

declare class ResumableStreamError extends Error {
  readonly code: ResumableStreamErrorCode;
  constructor(code: ResumableStreamErrorCode, message: string);
}

type ResumableStreamErrorCode = "exists" | "finalized" | "invalid-id" | "missing";

type ResumableStreamLease = {
  readonly token: string;
};

type ResumableStreamRole = "consumer" | "producer";

type ResumableStreamStatus = "done" | "error" | "missing" | "streaming";

interface ResumableStreamStore {
  acquire(streamId: string, options?: ResumableStreamAcquireOptions): Promise<ResumableStreamRole>;
  acquireLease?(streamId: string, options?: ResumableStreamAcquireOptions): Promise<ResumableStreamAcquisition>;
  append(streamId: string, chunk: Uint8Array, lease?: ResumableStreamLease): Promise<void>;
  finalize(streamId: string, status: "done" | "error", error?: string, lease?: ResumableStreamLease): Promise<boolean | void>;
  read(streamId: string, cursor: string, signal: AbortSignal): AsyncIterable<ResumableStreamEntry>;
  status(streamId: string): Promise<ResumableStreamStatus>;
  delete(streamId: string): Promise<void>;
}

type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

declare class SSEEventDecoder {
  #private;
  constructor(options?: {
    trailing?: "dispatch" | "drop";
  });
  push(text: string): SSEEvent[];
  flush(): SSEEvent | null;
}

type SourcePart = {
  type: "source";
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
  parentId?: string;
};

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextPart = {
  type: "text";
  text: string;
  status: TextStatus;
  parentId?: string;
};

type TextStatus = {
  type: "running";
} | {
  type: "complete";
  reason: "stop" | "unknown";
} | {
  type: "incomplete";
  reason: "cancelled" | "content-filter" | "length" | "other";
};

type TextStreamController = {
  append(textDelta: string): void;
  close(): void;
};

type ThreadMessageLike = {
  role: "assistant" | "system" | "user";
  content: readonly MessagePartLike[];
  attachments?: readonly AttachmentLike[];
};

type ToToolsJSONSchemaOptions = {
  filter?: (name: string, tool: Tool) => boolean;
};

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolBase<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = {
  streamCall?: ToolStreamCallFunction<TArgs, TResult>;
  display?: ToolDisplay;
  overwrite?: boolean;
};

interface ToolCallArgsReader<TArgs extends Record<string, unknown>> {
  get<PathT extends TypePath<TArgs>>(...fieldPath: PathT): Promise<TypeAtPath<TArgs, PathT>>;
  streamValues<PathT extends TypePath<TArgs>>(...fieldPath: PathT): AsyncIterableStream<DeepPartial<TypeAtPath<TArgs, PathT>>>;
  streamText<PathT extends TypePath<TArgs>>(...fieldPath: PathT): TypeAtPath<TArgs, PathT> extends string & (infer U) ? AsyncIterableStream<U> : never;
  forEach<PathT extends TypePath<TArgs>>(...fieldPath: PathT): NonNullable<TypeAtPath<TArgs, PathT>> extends Array<infer U> ? AsyncIterableStream<U> : never;
}

type ToolCallPart = ToolCallPartWithoutResult | ToolCallPartWithResult;

type ToolCallPartBase = {
  type: "tool-call";
  status: ToolCallStatus;
  toolCallId: string;
  toolName: string;
  argsText: string;
  args: ReadonlyJSONObject;
  timing?: ToolCallTiming;
  artifact?: ReadonlyJSONValue;
  result?: ReadonlyJSONValue;
  modelContent?: readonly ToolModelContentPart[];
  isError?: boolean;
  isPreliminary?: boolean;
  parentId?: string;
};

type ToolCallPartInit = {
  toolCallId?: string;
  toolName: string;
  argsText?: string;
  args?: ReadonlyJSONObject;
  response?: ToolResponseLike<ReadonlyJSONValue>;
};

type ToolCallPartWithResult = ToolCallPartBase & {
  state: "call" | "partial-call" | "result";
  result: ReadonlyJSONValue;
  artifact?: ReadonlyJSONValue;
  modelContent?: readonly ToolModelContentPart[];
  isError?: boolean;
};

type ToolCallPartWithoutResult = ToolCallPartBase & {
  state: "call" | "partial-call";
  result?: undefined;
  modelContent?: undefined;
};

interface ToolCallReader<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  args: ToolCallArgsReader<TArgs>;
  response: ToolCallResponseReader<TResult>;
  result: {
    get: () => Promise<TResult>;
  };
}

interface ToolCallResponseReader<TResult> {
  get: () => Promise<ToolResponse<TResult>>;
}

type ToolCallStatus = {
  type: "running";
  isArgsComplete: boolean;
} | {
  type: "requires-action";
  reason: "tool-call-result";
} | {
  type: "complete";
  reason: "stop" | "unknown";
} | {
  type: "incomplete";
  reason: "cancelled" | "content-filter" | "length" | "other";
};

type ToolCallStreamController = {
  argsText: TextStreamController;
  setResponse(response: ToolResponseLike<ReadonlyJSONValue>): void;
  close(): void;
};

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type ToolCallback = (toolCall: {
  toolCallId: string;
  toolName: string;
  args: ReadonlyJSONObject;
}) => Promise<ToolResponse<ReadonlyJSONValue>> | ToolResponse<ReadonlyJSONValue> | undefined;

type ToolDeclaration<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendToolDeclaration<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolDisplay = "inline" | "standalone";

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
};

type ToolExecutionOptions = {
  execute: ToolCallback;
  streamCall: ToolStreamCallback;
  onExecutionStart?: ((toolCallId: string, toolName: string) => void) | undefined;
  onExecutionEnd?: ((toolCallId: string, toolName: string) => void) | undefined;
};

declare class ToolExecutionStream extends PipeableTransformStream<AssistantStreamChunk, AssistantStreamChunk> {
  constructor(options: ToolExecutionOptions);
}

type ToolJSONSchema = {
  description?: string;
  parameters: JSONSchema7;
  providerOptions?: ProviderOptions;
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

type ToolModelOutputFunction<TArgs, TResult> = (options: {
  toolCallId: string;
  input: TArgs;
  output: TResult;
}) => readonly ToolModelContentPart[] | Promise<readonly ToolModelContentPart[]>;

declare class ToolResponse<TResult> {
  get [TOOL_RESPONSE_SYMBOL](): boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly result: TResult;
  readonly isError: boolean;
  readonly isPreliminary?: boolean;
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;
  constructor(options: ToolResponseLike<TResult>);
  static [Symbol.hasInstance](obj: unknown): obj is ToolResponse<ReadonlyJSONValue>;
  static toResponse(result: any | ToolResponse<any>): ToolResponse<any>;
}

type ToolResponseLike<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
  isPreliminary?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
};

type ToolResultStreamOptions = {
  onExecutionStart?: (toolCallId: string, toolName: string) => void;
  onExecutionEnd?: (toolCallId: string, toolName: string) => void;
};

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

type ToolStreamCallback = <TArgs extends ReadonlyJSONObject = ReadonlyJSONObject, TResult extends ReadonlyJSONValue = ReadonlyJSONValue>(toolCall: {
  reader: ToolCallReader<TArgs, TResult>;
  toolCallId: string;
  toolName: string;
}) => void;

type ToolWithoutType<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (Omit<FrontendTool<TArgs, TResult>, "type"> | Omit<BackendTool<TArgs, TResult>, "type"> | Omit<HumanTool<TArgs, TResult>, "type"> | Omit<ProviderTool<TArgs, TResult>, "type">) & {
  type?: undefined;
};

type TupleIndex<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

type TypeAtPath<T, P extends readonly any[]> = P extends [
  infer Head,
  ...infer Rest
] ? Head extends keyof T ? TypeAtPath<T[Head], Rest> : never : T;

type TypePath<T> = [
] | (0 extends 1 & T ? any[] : T extends object ? T extends readonly any[] ? number extends T["length"] ? {
  [K in TupleIndex<T>]: [
    AsNumber<K>,
    ...TypePath<T[K]>
  ];
}[TupleIndex<T>] : [
  number,
  ...TypePath<T[number]>
] : {
  [K in ObjectKey<T>]: [
    K,
    ...TypePath<T[K]>
  ];
}[ObjectKey<T>] : [
]);

type UIMessageStreamChunk = {
  type: "start";
  messageId: string;
} | {
  type: "text-start";
  id: string;
} | {
  type: "text-delta";
  textDelta: string;
} | {
  type: "text-end";
} | {
  type: "reasoning-start";
  id: string;
} | {
  type: "reasoning-delta";
  delta: string;
} | {
  type: "reasoning-end";
} | {
  type: "source";
  source: {
    sourceType: "url";
    id: string;
    url: string;
    title?: string;
  };
} | {
  type: "file";
  file: {
    mimeType: string;
    data: string;
  };
} | {
  type: "tool-call-start";
  id: string;
  toolCallId: string;
  toolName: string;
} | {
  type: "tool-call-delta";
  argsText: string;
} | {
  type: "tool-call-end";
} | {
  type: "tool-result";
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError?: boolean;
  isPreliminary?: boolean;
  messages?: ReadonlyJSONValue;
} | {
  type: "start-step";
  messageId?: string;
} | {
  type: "finish-step";
  finishReason: FinishReason;
  usage: Usage;
  isContinued: boolean;
} | {
  type: "finish";
  finishReason: FinishReason;
  usage: Usage;
} | {
  type: "error";
  errorText: string;
} | UIMessageStreamDataChunk;

type UIMessageStreamDataChunk = {
  type: `data-${string}`;
  id?: string;
  data: ReadonlyJSONValue;
  transient?: boolean;
};

declare class UIMessageStreamDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor(options?: UIMessageStreamDecoderOptions);
}

type UIMessageStreamDecoderOptions = {
  onData?: (data: {
    type: string;
    name: string;
    data: unknown;
    transient?: boolean;
  }) => void;
};

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

declare function asAsyncIterableStream<T>(source: ReadableStream<T>): AsyncIterableStream<T>;

declare function createAssistantStream(callback: (controller: AssistantStreamController) => PromiseLike<void> | void, options?: AssistantStreamOptions): AssistantStream;

declare function createAssistantStreamController(options?: AssistantStreamOptions): readonly [
  AssistantStream,
  AssistantStreamController
];

declare function createAssistantStreamResponse(callback: (controller: AssistantStreamController) => PromiseLike<void> | void): Response;

declare function createInMemoryResumableStreamStore(options?: InMemoryResumableStreamStoreOptions): ResumableStreamStore & {
  dispose: () => void;
};

declare const createInitialMessage: (_param1?: {
  unstable_state?: ReadonlyJSONValue;
}) => AssistantMessage;

declare function createIoredisResumableStreamStore(client: IoRedisLike, options?: RedisResumableStreamStoreOptions): ResumableStreamStore;

declare const createObjectStream: (_param2: {
  execute: (controller: {
    readonly abortSignal: AbortSignal;
    enqueue(operations: readonly GorpStreamOperation[]): void;
  }) => void | PromiseLike<void>;
  defaultValue?: ReadonlyJSONValue;
}) => ReadableStream<GorpStreamChunk>;

declare function createRedisResumableStreamStore(client: NodeRedisLike, options?: RedisResumableStreamStoreOptions): ResumableStreamStore;

declare function createResumableAssistantStreamResponse(options: CreateResumableAssistantStreamResponseOptions): Promise<Response>;

declare function createResumableStreamContext(options: ResumableStreamContextOptions): ResumableStreamContext;

declare function createResumeAssistantStreamResponse(options: CreateResumeAssistantStreamResponseOptions): Promise<Response>;

declare const fromObjectStreamResponse: (response: Response) => ReadableStream<GorpStreamChunk>;

declare const getPartialJsonObjectFieldState: (obj: Record<string, unknown>, fieldPath: (string | number)[]) => FieldState;

declare const getPartialJsonObjectMeta: (obj: Record<symbol, unknown>) => PartialJsonObjectMeta | undefined;

declare namespace entry_resumable_exports {
  export { CreateResumableAssistantStreamResponseOptions, CreateResumeAssistantStreamResponseOptions, InMemoryResumableStreamStoreOptions, RESUMABLE_STREAM_ID_HEADER, RedisAppendOptions, RedisDeleteOptions, RedisFinalizeOptions, RedisLikeClient, RedisResumableStreamStoreOptions, ResumableStreamAcquireOptions, ResumableStreamAcquisition, ResumableStreamContext, ResumableStreamContextOptions, ResumableStreamEntry, ResumableStreamError, ResumableStreamErrorCode, ResumableStreamLease, ResumableStreamRole, ResumableStreamStatus, ResumableStreamStore, createInMemoryResumableStreamStore, createResumableAssistantStreamResponse, createResumableStreamContext, createResumeAssistantStreamResponse };
}

declare namespace entry_root_exports {
  export { AssistantMessage, AssistantMessageAccumulator, AssistantMessageStream, AssistantMessageTiming, AssistantStream, AssistantStreamChunk, AssistantStreamController, AssistantTransportDecoder, GorpStreamDeltaTracker as AssistantTransportDeltaTracker, AssistantTransportEncoder, AssistantTransportStateOperation, DataPart, DataStreamDecoder, DataStreamEncoder, GenericAssistantMessage, GenericFilePart, GenericMessage, GenericSystemMessage, GenericTextPart, GenericToolCallPart, GenericToolMessage, GenericToolResultPart, GenericUserMessage, McpServerConfig, ObjectStreamChunk, ObjectStreamResponse, PlainTextDecoder, PlainTextEncoder, ProviderOptions, TextStreamController, ToToolsJSONSchemaOptions, Tool, ToolCallReader, ToolCallStreamController, ToolCallTiming, ToolDeclaration, ToolExecutionStream, ToolJSONSchema, ToolModelContentPart, ToolModelOutputFunction, ToolResponse, ToolResponseLike, ToolResultStreamOptions, UIMessageStreamChunk, UIMessageStreamDataChunk, UIMessageStreamDecoder, UIMessageStreamDecoderOptions, createAssistantStream, createAssistantStreamController, createAssistantStreamResponse, createObjectStream, fromObjectStreamResponse, toGenericMessages, toJSONSchema, toPartialJSONSchema, toToolsJSONSchema, createInitialMessage as unstable_createInitialMessage, unstable_runPendingTools, toolResultStream as unstable_toolResultStream };
}

declare namespace entry_resumable_ioredis_exports {
  export { IoRedisLike, createIoredisResumableStreamStore };
}

declare const parsePartialJsonObject: (json: string) => (ReadonlyJSONObject & {
  [PARTIAL_JSON_OBJECT_META_SYMBOL]: PartialJsonObjectMeta;
}) | undefined;

declare namespace entry_resumable_redis_exports {
  export { NodeRedisLike, createRedisResumableStreamStore };
}

declare function toGenericMessages(messages: readonly ThreadMessageLike[]): GenericMessage[];

declare function toJSONSchema(schema: StandardSchemaV1 | JSONSchema7): JSONSchema7;

declare function toPartialJSONSchema(schema: JSONSchema7): JSONSchema7;

declare function toToolsJSONSchema(tools: Record<string, Tool> | undefined, options?: ToToolsJSONSchemaOptions): Record<string, ToolJSONSchema>;

declare function toolResultStream(tools: Record<string, Tool> | (() => Record<string, Tool> | undefined) | undefined, abortSignal: AbortSignal | (() => AbortSignal), human: (toolCallId: string, payload: unknown) => Promise<unknown>, options?: ToolResultStreamOptions): ToolExecutionStream;

declare function unstable_runPendingTools(message: AssistantMessage, tools: Record<string, Tool> | undefined, abortSignal: AbortSignal, human: (toolCallId: string, payload: unknown) => Promise<unknown>): Promise<AssistantMessage>;

declare namespace entry_utils_exports {
  export { AssistantMetaTransformStream, AssistantTransformStream, AsyncIterableStream, ReadonlyJSONArray, ReadonlyJSONObject, ReadonlyJSONValue, SSEEvent, SSEEventDecoder, asAsyncIterableStream, getPartialJsonObjectFieldState, getPartialJsonObjectMeta, parsePartialJsonObject };
}

export { entry_resumable_exports as entry_resumable, entry_resumable_ioredis_exports as entry_resumable_ioredis, entry_resumable_redis_exports as entry_resumable_redis, entry_root_exports as entry_root, entry_utils_exports as entry_utils };
