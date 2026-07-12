import { StandardSchemaV1 } from "@standard-schema/spec";

import Deque from "denque";

import { SrvRecord } from "dns";

import { EventEmitter } from "events";

import { IpcNetConnectOpts, Socket, TcpNetConnectOpts } from "net";

import { Readable, ReadableOptions } from "stream";

import { ConnectionOptions, TLSSocket } from "tls";

declare abstract class AbstractConnector {
  firstError?: Error;
  protected connecting: boolean;
  protected stream: NetStream;
  private disconnectTimeout;
  constructor(disconnectTimeout: number);
  check(info: any): boolean;
  disconnect(): void;
  abstract connect(_: ErrorEmitter): Promise<NetStream>;
}

declare type AddSet = CommandNameFlags["ENTER_SUBSCRIBER_MODE"][number];

interface AddressFromResponse {
  port: string;
  ip: string;
  flags?: string | undefined;
}

declare type ArgumentTransformer = (args: any[]) => any[];

declare type ArgumentType = string | Buffer | number | (string | Buffer | number | any[])[];

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
  [Symbol.asyncIterator](): {
    next(): Promise<IteratorResult<AssistantMessage, undefined>>;
  };
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
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;
} | {
  readonly type: "error";
  readonly error: string;
} | {
  readonly type: "update-state";
  readonly operations: ObjectStreamOperation[];
});

type AssistantStreamController = {
  appendText(textDelta: string): void;
  appendReasoning(reasoningDelta: string): void;
  appendSource(options: SourcePart): void;
  appendFile(options: FilePart): void;
  appendData(options: DataPart): void;
  addTextPart(): TextStreamController;
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

declare class AssistantTransformStream<I> extends TransformStream<I, AssistantStreamChunk> {
  constructor(transformer: AssistantTransformer<I>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<AssistantStreamChunk>);
}

type AssistantTransformer<I> = {
  flush?: AssistantTransformerFlushCallback;
  start?: AssistantTransformerStartCallback;
  transform?: AssistantTransformerTransformCallback<I>;
};

type AssistantTransformerFlushCallback = (controller: AssistantStreamController) => void | PromiseLike<void>;

type AssistantTransformerStartCallback = (controller: AssistantStreamController) => void | PromiseLike<void>;

type AssistantTransformerTransformCallback<I> = (chunk: I, controller: AssistantStreamController) => void | PromiseLike<void>;

declare class AssistantTransportDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor();
}

declare class AssistantTransportEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

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

interface BatchOperationContext {
  batchMode: "MULTI";
  batchSize: number;
  database: number;
  serverAddress: string;
  serverPort: number | undefined;
}

declare type Callback<T = any> = (err?: Error | null, result?: T) => void;

interface ChainableCommander extends RedisCommander<{
  type: "pipeline";
}> {
  length: number;
}

declare type ClientContext = {
  type: keyof ResultTypes<unknown, unknown>;
};

declare class Cluster extends Commander {
  options: ClusterOptions;
  slots: NodeKey[][];
  status: ClusterStatus;
  _groupsIds: {
    [key: string]: number;
  };
  _groupsBySlot: number[];
  isCluster: boolean;
  private startupNodes;
  private connectionPool;
  private manuallyClosing;
  private retryAttempts;
  private delayQueue;
  private offlineQueue;
  private subscriber;
  private shardedSubscribers;
  private slotsTimer;
  private reconnectTimeout;
  private isRefreshing;
  private _refreshSlotsCacheCallbacks;
  private _autoPipelines;
  private _runningAutoPipelines;
  private _readyDelayedCallbacks;
  private subscriberGroupEmitter;
  private connectionEpoch;
  constructor(startupNodes: ClusterNode[], options?: ClusterOptions);
  connect(): Promise<void>;
  disconnect(reconnect?: boolean): void;
  quit(callback?: Callback<"OK">): Promise<"OK">;
  duplicate(overrideStartupNodes?: any[], overrideOptions?: {}): Cluster;
  nodes(role?: NodeRole): Redis[];
  delayUntilReady(callback: Callback): void;
  get autoPipelineQueueSize(): number;
  refreshSlotsCache(callback?: Callback<void>): void;
  sendCommand(command: Command, stream?: WriteableStream, node?: any): unknown;
  sscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  sscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  hscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  hscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  zscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  zscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  handleError(error: Error, ttl: {
    value?: any;
  }, handlers: any): void;
  private resetOfflineQueue;
  private clearNodesRefreshInterval;
  private resetNodesRefreshInterval;
  private setStatus;
  private handleCloseEvent;
  private flushQueue;
  private executeOfflineCommands;
  private natMapper;
  private getInfoFromNode;
  private invokeReadyDelayedCallbacks;
  private readyCheck;
  private resolveSrv;
  private dnsLookup;
  private resolveStartupNodeHostnames;
  private createScanStream;
  private createShardedSubscriberGroup;
}

interface Cluster extends EventEmitter {
}

interface Cluster extends Transaction {
}

declare type ClusterNode = string | number | {
  host?: string | undefined;
  port?: number | undefined;
};

declare type ClusterNodeRetryStrategy = RetryStrategy;

interface ClusterOptions extends CommanderOptions {
  clusterRetryStrategy?: ((times: number, reason?: Error) => number | void | null) | null | undefined;
  enableOfflineQueue?: boolean | undefined;
  enableReadyCheck?: boolean | undefined;
  scaleReads?: NodeRole | Function | undefined;
  maxRedirections?: number | undefined;
  retryDelayOnFailover?: number | undefined;
  retryDelayOnClusterDown?: number | undefined;
  retryDelayOnTryAgain?: number | undefined;
  retryDelayOnMoved?: number | undefined;
  slotsRefreshTimeout?: number | undefined;
  slotsRefreshInterval?: number | undefined;
  shardedSubscribers?: boolean | undefined;
  clusterNodeRetryStrategy?: ClusterNodeRetryStrategy;
  redisOptions?: Omit<RedisOptions, "enableOfflineQueue" | "host" | "path" | "port" | "readOnly" | "retryStrategy" | "sentinels"> | undefined;
  lazyConnect?: boolean | undefined;
  useSRVRecords?: boolean | undefined;
  resolveSrv?: DNSResolveSrvFunction | undefined;
  dnsLookup?: DNSLookupFunction | undefined;
  natMap?: NatMap | undefined;
  enableAutoPipelining?: boolean | undefined;
  autoPipeliningIgnoredCommands?: string[] | undefined;
  scripts?: Record<string, {
    lua: string;
    numberOfKeys?: number;
    readOnly?: boolean;
  }> | undefined;
}

declare type ClusterStatus = "close" | "connect" | "connecting" | "disconnecting" | "end" | "ready" | "reconnecting" | "wait";

declare class Command implements Respondable {
  name: string;
  static FLAGS: {
    [key in keyof CommandNameFlags]: CommandNameFlags[key];
  };
  private static flagMap?;
  private static _transformer;
  static checkFlag<T extends keyof CommandNameFlags>(flagName: T, commandName: string): commandName is CommandNameFlags[T][number];
  static setArgumentTransformer(name: string, func: ArgumentTransformer): void;
  static setReplyTransformer(name: string, func: ReplyTransformer): void;
  private static getFlagMap;
  ignore?: boolean;
  isReadOnly?: boolean;
  args: CommandParameter[];
  inTransaction: boolean;
  pipelineIndex?: number;
  isTraced: boolean;
  isResolved: boolean;
  reject: (err: Error) => void;
  resolve: (result: any) => void;
  promise: Promise<any>;
  private replyEncoding;
  private errorStack;
  private bufferMode;
  private callback;
  private transformed;
  private _commandTimeoutTimer?;
  private _blockingTimeoutTimer?;
  private _blockingDeadline?;
  private slot?;
  private keys?;
  constructor(name: string, args?: Array<ArgumentType>, options?: CommandOptions, callback?: Callback);
  getSlot(): number;
  getKeys(): Array<string | Buffer>;
  toWritable(_socket: object): string | Buffer;
  stringifyArguments(): void;
  transformReply(result: Buffer | Buffer[]): string | string[] | Buffer | Buffer[];
  setTimeout(ms: number): void;
  setBlockingTimeout(ms: number): void;
  extractBlockingTimeout(): number | null | undefined;
  private _clearTimers;
  private initPromise;
  private _iterateKeys;
  private _convertValue;
}

interface CommandItem {
  command: Respondable;
  stream: WriteableStream;
  select: number;
}

interface CommandNameFlags {
  VALID_IN_SUBSCRIBER_MODE: [
    "subscribe",
    "psubscribe",
    "unsubscribe",
    "punsubscribe",
    "ssubscribe",
    "sunsubscribe",
    "ping",
    "quit"
  ];
  VALID_IN_MONITOR_MODE: [
    "monitor",
    "auth"
  ];
  ENTER_SUBSCRIBER_MODE: [
    "subscribe",
    "psubscribe",
    "ssubscribe"
  ];
  EXIT_SUBSCRIBER_MODE: [
    "unsubscribe",
    "punsubscribe",
    "sunsubscribe"
  ];
  WILL_DISCONNECT: [
    "quit"
  ];
  HANDSHAKE_COMMANDS: [
    "auth",
    "select",
    "client",
    "readonly",
    "info"
  ];
  IGNORE_RECONNECT_ON_ERROR: [
    "client"
  ];
  BLOCKING_COMMANDS: [
    "blpop",
    "brpop",
    "brpoplpush",
    "blmove",
    "bzpopmin",
    "bzpopmax",
    "bzmpop",
    "blmpop",
    "xread",
    "xreadgroup"
  ];
  LAST_ARG_TIMEOUT_COMMANDS: [
    "blpop",
    "brpop",
    "brpoplpush",
    "blmove",
    "bzpopmin",
    "bzpopmax"
  ];
  FIRST_ARG_TIMEOUT_COMMANDS: [
    "bzmpop",
    "blmpop"
  ];
  BLOCK_OPTION_COMMANDS: [
    "xread",
    "xreadgroup"
  ];
}

interface CommandOptions {
  replyEncoding?: BufferEncoding | null;
  errorStack?: Error;
  keyPrefix?: string;
  readOnly?: boolean;
}

declare type CommandParameter = string | Buffer | number | any[];

declare class Commander<Context extends ClientContext = {
  type: "default";
}> {
  options: CommanderOptions;
  scriptsSet: {};
  addedBuiltinSet: Set<string>;
  getBuiltinCommands(): string[];
  createBuiltinCommand(commandName: string): {
    string: any;
    buffer: any;
  };
  addBuiltinCommand(commandName: string): void;
  defineCommand(name: string, definition: {
    lua: string;
    numberOfKeys?: number;
    readOnly?: boolean;
  }): void;
  sendCommand(command: Command, stream?: WriteableStream, node?: unknown): unknown;
}

interface Commander<Context> extends RedisCommander<Context> {
}

interface CommanderOptions {
  keyPrefix?: string | undefined;
  showFriendlyErrorStack?: boolean | undefined;
}

interface CommonRedisOptions extends CommanderOptions {
  Connector?: ConnectorConstructor | undefined;
  retryStrategy?: RetryStrategy;
  commandTimeout?: number | undefined;
  blockingTimeout?: number | undefined;
  blockingTimeoutGrace?: number | undefined;
  socketTimeout?: number | undefined;
  keepAlive?: number | undefined;
  noDelay?: boolean | undefined;
  connectionName?: string | undefined;
  disableClientInfo?: boolean | undefined;
  clientInfoTag?: string | undefined;
  username?: string | undefined;
  password?: string | undefined;
  db?: number | undefined;
  autoResubscribe?: boolean | undefined;
  autoResendUnfulfilledCommands?: boolean | undefined;
  reconnectOnError?: ReconnectOnError | null | undefined;
  readOnly?: boolean | undefined;
  stringNumbers?: boolean | undefined;
  connectTimeout?: number | undefined;
  monitor?: boolean | undefined;
  maxRetriesPerRequest?: number | null | undefined;
  maxLoadingRetryTime?: number | undefined;
  enableAutoPipelining?: boolean | undefined;
  autoPipeliningIgnoredCommands?: string[] | undefined;
  offlineQueue?: boolean | undefined;
  commandQueue?: boolean | undefined;
  enableOfflineQueue?: boolean | undefined;
  enableReadyCheck?: boolean | undefined;
  lazyConnect?: boolean | undefined;
  scripts?: Record<string, {
    lua: string;
    numberOfKeys?: number | undefined;
    readOnly?: boolean | undefined;
  }> | undefined;
}

interface Condition {
  select: number;
  auth?: string | [
    string,
    string
  ];
  subscriber: false | SubscriptionSet;
}

interface ConnectorConstructor {
  new (options: unknown): AbstractConnector;
}

type CreateObjectStreamOptions = {
  execute: (controller: ObjectStreamController) => void | PromiseLike<void>;
  defaultValue?: ReadonlyJSONValue;
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

declare type DNSLookupFunction = (hostname: string, callback: (err: NodeJS.ErrnoException | null | undefined, address: string, family?: number) => void) => void;

declare type DNSResolveSrvFunction = (hostname: string, callback: (err: NodeJS.ErrnoException | null | undefined, records?: SrvRecord[]) => void) => void;

interface DataHandledable extends EventEmitter {
  stream: NetStream;
  status: string;
  condition: Condition | null;
  commandQueue: Deque<CommandItem>;
  disconnect(reconnect: boolean): void;
  recoverFromFatalError(commandError: Error, err: Error, options: FlushQueueOptions): void;
  handleReconnection(err: Error, item: CommandItem): void;
}

type DataPart = {
  type: "data";
  name: string;
  data: ReadonlyJSONValue;
  parentId?: string;
};

declare class DataStreamDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor();
}

declare class DataStreamEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

declare type DelSet = CommandNameFlags["EXIT_SUBSCRIBER_MODE"][number];

declare type ErrorEmitter = (type: string, err: Error) => void;

type FieldState = "complete" | "partial";

type FilePart = {
  type: "file";
  data: string;
  mimeType: string;
  parentId?: string;
};

type FinishReason = "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";

declare type FlushQueueOptions = {
  offlineQueue?: boolean;
  commandQueue?: boolean;
};

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

declare type IpcOptions = Pick<IpcNetConnectOpts, "path">;

interface JSONSchema7 {
  $id?: string | undefined;
  $ref?: string | undefined;
  $schema?: JSONSchema7Version | undefined;
  $comment?: string | undefined;
  $defs?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  type?: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined;
  enum?: JSONSchema7Type[] | undefined;
  const?: JSONSchema7Type | undefined;
  multipleOf?: number | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: number | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: number | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
  items?: JSONSchema7Definition | JSONSchema7Definition[] | undefined;
  additionalItems?: JSONSchema7Definition | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  contains?: JSONSchema7Definition | undefined;
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: string[] | undefined;
  properties?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  patternProperties?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  additionalProperties?: JSONSchema7Definition | undefined;
  dependencies?: {
    [key: string]: JSONSchema7Definition | string[];
  } | undefined;
  propertyNames?: JSONSchema7Definition | undefined;
  if?: JSONSchema7Definition | undefined;
  then?: JSONSchema7Definition | undefined;
  else?: JSONSchema7Definition | undefined;
  allOf?: JSONSchema7Definition[] | undefined;
  anyOf?: JSONSchema7Definition[] | undefined;
  oneOf?: JSONSchema7Definition[] | undefined;
  not?: JSONSchema7Definition | undefined;
  format?: string | undefined;
  contentMediaType?: string | undefined;
  contentEncoding?: string | undefined;
  definitions?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  title?: string | undefined;
  description?: string | undefined;
  default?: JSONSchema7Type | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: JSONSchema7Type | undefined;
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

type JSONSchema7Definition = JSONSchema7 | boolean;

interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

type JSONSchema7Type = string | number | boolean | JSONSchema7Object | JSONSchema7Array | null;

type JSONSchema7TypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7Version = string;

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
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
};

declare type NatMap = {
  [key: string]: {
    host: string;
    port: number;
  };
} | NatMapFunction;

declare type NatMapFunction = (key: string) => {
  host: string;
  port: number;
} | null;

declare type NetStream = Socket | TLSSocket;

declare type NodeKey = string;

type NodeRedisFields = Record<string, string | Buffer>;

interface NodeRedisLike {
  set(key: string, value: string, options: {
    NX: true;
    EX: number;
  }): Promise<string | null>;
  set(key: string, value: string, options: {
    EX: number;
  }): Promise<string | null>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<unknown>;
  exists(key: string): Promise<number>;
  del(keys: string | string[]): Promise<unknown>;
  xAdd(key: string, id: string, fields: NodeRedisFields): Promise<string>;
  sendCommand<T = unknown>(args: ReadonlyArray<string | Buffer>, options?: {
    typeMapping?: Record<number, unknown>;
  }): Promise<T>;
  multi(): NodeRedisMultiCommand;
}

interface NodeRedisMultiCommand {
  xAdd(key: string, id: string, fields: NodeRedisFields): NodeRedisMultiCommand;
  expire(key: string, seconds: number): NodeRedisMultiCommand;
  set(key: string, value: string, options: {
    EX: number;
  }): NodeRedisMultiCommand;
  execAsPipeline(): Promise<unknown>;
  exec(): Promise<unknown>;
}

declare type NodeRole = "all" | "master" | "slave";

type ObjectKey<T> = keyof T & (string | number);

type ObjectStreamChunk = {
  readonly snapshot: ReadonlyJSONValue;
  readonly operations: readonly ObjectStreamOperation[];
};

type ObjectStreamController = {
  readonly abortSignal: AbortSignal;
  enqueue(operations: readonly ObjectStreamOperation[]): void;
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

declare class ObjectStreamResponse extends Response {
  constructor(body: ReadableStream<ObjectStreamChunk>);
}

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

interface Options extends ReadableOptions {
  key?: string;
  match?: string;
  type?: string;
  command: string;
  redis: any;
  count?: string | number;
  noValues?: boolean;
}

declare const PARTIAL_JSON_OBJECT_META_SYMBOL: unique symbol;

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
} | {
  readonly type: "set";
  readonly key: string;
  readonly value: string;
  readonly ttlSec: number;
};

interface PipelineWriteableStream {
  isPipeline: true;
  write(data: string | Buffer): unknown;
  destination: {
    redis: {
      stream: NetStream;
    };
  };
}

declare class PlainTextDecoder extends PipeableTransformStream<Uint8Array<ArrayBuffer>, AssistantStreamChunk> {
  constructor();
}

declare class PlainTextEncoder extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>> implements AssistantStreamEncoder {
  headers: Headers;
  constructor();
}

declare type PreferredSlaves = ((slaves: AddressFromResponse[]) => AddressFromResponse | null) | Array<{
  port: string;
  ip: string;
  prio?: number | undefined;
}> | {
  port: string;
  ip: string;
  prio?: number | undefined;
};

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
  parentId?: string;
};

declare type ReconnectOnError = (err: Error) => boolean | 1 | 2;

declare class Redis extends Commander implements DataHandledable {
  static Cluster: typeof Cluster;
  static Command: typeof Command;
  private static defaultOptions;
  static createClient(...args: ConstructorParameters<typeof Redis>): Redis;
  options: RedisOptions;
  status: RedisStatus;
  stream: NetStream;
  isCluster: boolean;
  condition: Condition | null;
  commandQueue: Deque<CommandItem>;
  private connector;
  private reconnectTimeout;
  private offlineQueue;
  private connectionEpoch;
  private retryAttempts;
  private manuallyClosing;
  private socketTimeoutTimer;
  private _autoPipelines;
  private _runningAutoPipelines;
  constructor(port: number, host: string, options: RedisOptions);
  constructor(path: string, options: RedisOptions);
  constructor(port: number, options: RedisOptions);
  constructor(port: number, host: string);
  constructor(options: RedisOptions);
  constructor(port: number);
  constructor(path: string);
  constructor();
  get autoPipelineQueueSize(): number;
  connect(callback?: Callback<void>): Promise<void>;
  private _connect;
  disconnect(reconnect?: boolean): void;
  end(): void;
  duplicate(override?: Partial<RedisOptions>): Redis;
  get mode(): "monitor" | "normal" | "subscriber";
  monitor(callback?: Callback<Redis>): Promise<Redis>;
  sendCommand(command: Command, stream?: WriteableStream): unknown;
  private getBlockingTimeoutInMs;
  private getConfiguredBlockingTimeout;
  private setSocketTimeout;
  scanStream(options?: ScanStreamOptions): ScanStream;
  scanBufferStream(options?: ScanStreamOptions): ScanStream;
  sscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  sscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  hscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  hscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  zscanStream(key: string, options?: ScanStreamOptions): ScanStream;
  zscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
  silentEmit(eventName: string, arg?: unknown): boolean;
  recoverFromFatalError(_commandError: Error, err: Error, options: FlushQueueOptions): void;
  handleReconnection(err: Error, item: CommandItem): void;
  _getServerAddress(): {
    address: string;
    port: number | undefined;
  };
  private _buildCommandContext;
  _buildBatchContext(batchSize: number): BatchOperationContext;
  private _getDescription;
  private resetCommandQueue;
  private resetOfflineQueue;
  private parseOptions;
  private setStatus;
  private createScanStream;
  private flushQueue;
  private _readyCheck;
}

interface Redis extends EventEmitter {
  on(event: "message", cb: (channel: string, message: string) => void): this;
  once(event: "message", cb: (channel: string, message: string) => void): this;
  on(event: "messageBuffer", cb: (channel: Buffer, message: Buffer) => void): this;
  once(event: "messageBuffer", cb: (channel: Buffer, message: Buffer) => void): this;
  on(event: "pmessage", cb: (pattern: string, channel: string, message: string) => void): this;
  once(event: "pmessage", cb: (pattern: string, channel: string, message: string) => void): this;
  on(event: "pmessageBuffer", cb: (pattern: string, channel: Buffer, message: Buffer) => void): this;
  once(event: "pmessageBuffer", cb: (pattern: string, channel: Buffer, message: Buffer) => void): this;
  on(event: "error", cb: (error: Error) => void): this;
  once(event: "error", cb: (error: Error) => void): this;
  on(event: RedisStatus, cb: () => void): this;
  once(event: RedisStatus, cb: () => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
}

interface Redis extends Transaction {
}

interface RedisCommander<Context extends ClientContext = {
  type: "default";
}> {
  call(command: string, callback?: Callback<unknown>): Result<unknown, Context>;
  call(command: string, args: (string | Buffer | number)[], callback?: Callback<unknown>): Result<unknown, Context>;
  call(...args: [
    command: string,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  call(...args: [
    command: string,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  callBuffer(command: string, callback?: Callback<unknown>): Result<unknown, Context>;
  callBuffer(command: string, args: (string | Buffer | number)[], callback?: Callback<unknown>): Result<unknown, Context>;
  callBuffer(...args: [
    command: string,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  callBuffer(...args: [
    command: string,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  acl(subcommand: "CAT", callback?: Callback<unknown>): Result<unknown, Context>;
  acl(subcommand: "CAT", categoryname: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  acl(...args: [
    subcommand: "DELUSER",
    ...usernames: (string | Buffer)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  acl(...args: [
    subcommand: "DELUSER",
    ...usernames: (string | Buffer)[]
  ]): Result<number, Context>;
  acl(subcommand: "DRYRUN", username: string | Buffer, command: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  aclBuffer(subcommand: "DRYRUN", username: string | Buffer, command: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  acl(...args: [
    subcommand: "DRYRUN",
    username: string | Buffer,
    command: string | Buffer,
    ...args: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  aclBuffer(...args: [
    subcommand: "DRYRUN",
    username: string | Buffer,
    command: string | Buffer,
    ...args: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  acl(...args: [
    subcommand: "DRYRUN",
    username: string | Buffer,
    command: string | Buffer,
    ...args: (string | Buffer | number)[]
  ]): Result<string, Context>;
  aclBuffer(...args: [
    subcommand: "DRYRUN",
    username: string | Buffer,
    command: string | Buffer,
    ...args: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  acl(subcommand: "GENPASS", callback?: Callback<string>): Result<string, Context>;
  aclBuffer(subcommand: "GENPASS", callback?: Callback<Buffer>): Result<Buffer, Context>;
  acl(subcommand: "GENPASS", bits: number | string, callback?: Callback<string>): Result<string, Context>;
  aclBuffer(subcommand: "GENPASS", bits: number | string, callback?: Callback<Buffer>): Result<Buffer, Context>;
  acl(subcommand: "GETUSER", username: string | Buffer, callback?: Callback<string[] | null>): Result<string[] | null, Context>;
  aclBuffer(subcommand: "GETUSER", username: string | Buffer, callback?: Callback<Buffer[] | null>): Result<Buffer[] | null, Context>;
  acl(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  acl(subcommand: "LIST", callback?: Callback<string[]>): Result<string[], Context>;
  aclBuffer(subcommand: "LIST", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  acl(subcommand: "LOAD", callback?: Callback<"OK">): Result<"OK", Context>;
  acl(subcommand: "LOG", callback?: Callback<unknown>): Result<unknown, Context>;
  acl(subcommand: "LOG", count: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  acl(subcommand: "LOG", reset: "RESET", callback?: Callback<unknown>): Result<unknown, Context>;
  acl(subcommand: "SAVE", callback?: Callback<"OK">): Result<"OK", Context>;
  acl(subcommand: "SETUSER", username: string | Buffer, callback?: Callback<"OK">): Result<"OK", Context>;
  acl(...args: [
    subcommand: "SETUSER",
    username: string | Buffer,
    ...rules: (string | Buffer)[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  acl(...args: [
    subcommand: "SETUSER",
    username: string | Buffer,
    ...rules: (string | Buffer)[]
  ]): Result<"OK", Context>;
  acl(subcommand: "USERS", callback?: Callback<string[]>): Result<string[], Context>;
  aclBuffer(subcommand: "USERS", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  acl(subcommand: "WHOAMI", callback?: Callback<string>): Result<string, Context>;
  aclBuffer(subcommand: "WHOAMI", callback?: Callback<Buffer>): Result<Buffer, Context>;
  append(key: RedisKey, value: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  arcount(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  ardel(...args: [
    key: RedisKey,
    ...indices: (number | string)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  ardel(...args: [
    key: RedisKey,
    ...indices: (number | string)[]
  ]): Result<number, Context>;
  ardelrange(...args: [
    key: RedisKey,
    ...ranges: (string | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  ardelrange(...args: [
    key: RedisKey,
    ...ranges: (string | number)[]
  ]): Result<number, Context>;
  arget(key: RedisKey, index: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  argetBuffer(key: RedisKey, index: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  argetrange(key: RedisKey, start: number | string, end: number | string, callback?: Callback<(string | null)[]>): Result<(string | null)[], Context>;
  argetrangeBuffer(key: RedisKey, start: number | string, end: number | string, callback?: Callback<(Buffer | null)[]>): Result<(Buffer | null)[], Context>;
  argrep(key: RedisKey, start: number | string, end: number | string, predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE', value: RedisValue, callback: Callback<number[]>): Result<number[], Context>;
  argrep(...args: [
    key: RedisKey,
    start: number | string,
    end: number | string,
    predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE',
    value: RedisValue,
    ...args: RedisValue[],
    callback: Callback<number[] | Array<[
      index: number,
      value: string
    ]>>
  ]): Result<number[] | Array<[
    index: number,
    value: string
  ]>, Context>;
  argrep<T extends RedisValue[]>(...args: [
    key: RedisKey,
    start: number | string,
    end: number | string,
    predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE',
    value: RedisValue,
    ...args: T
  ]): Result<'WITHVALUES' extends T[number] ? Array<[
    index: number,
    value: string
  ]> : number[], Context>;
  argrepBuffer(key: RedisKey, start: number | string, end: number | string, predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE', value: RedisValue, callback: Callback<number[]>): Result<number[], Context>;
  argrepBuffer(...args: [
    key: RedisKey,
    start: number | string,
    end: number | string,
    predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE',
    value: RedisValue,
    ...args: RedisValue[],
    callback: Callback<number[] | Array<[
      index: number,
      value: Buffer
    ]>>
  ]): Result<number[] | Array<[
    index: number,
    value: Buffer
  ]>, Context>;
  argrepBuffer<T extends RedisValue[]>(...args: [
    key: RedisKey,
    start: number | string,
    end: number | string,
    predicate: 'EXACT' | 'GLOB' | 'MATCH' | 'RE',
    value: RedisValue,
    ...args: T
  ]): Result<'WITHVALUES' extends T[number] ? Array<[
    index: number,
    value: Buffer
  ]> : number[], Context>;
  arinfo(key: RedisKey, callback?: Callback<(string | number)[]>): Result<(string | number)[], Context>;
  arinfoBuffer(key: RedisKey, callback?: Callback<(Buffer | number)[]>): Result<(Buffer | number)[], Context>;
  arinfo(key: RedisKey, full: 'FULL', callback?: Callback<(string | number)[]>): Result<(string | number)[], Context>;
  arinfoBuffer(key: RedisKey, full: 'FULL', callback?: Callback<(Buffer | number)[]>): Result<(Buffer | number)[], Context>;
  arinsert(...args: [
    key: RedisKey,
    ...values: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  arinsert(...args: [
    key: RedisKey,
    ...values: (string | Buffer | number)[]
  ]): Result<number, Context>;
  arlastitems(key: RedisKey, count: number | string, callback?: Callback<(string | null)[]>): Result<(string | null)[], Context>;
  arlastitemsBuffer(key: RedisKey, count: number | string, callback?: Callback<(Buffer | null)[]>): Result<(Buffer | null)[], Context>;
  arlastitems(key: RedisKey, count: number | string, rev: 'REV', callback?: Callback<(string | null)[]>): Result<(string | null)[], Context>;
  arlastitemsBuffer(key: RedisKey, count: number | string, rev: 'REV', callback?: Callback<(Buffer | null)[]>): Result<(Buffer | null)[], Context>;
  arlen(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  armget(...args: [
    key: RedisKey,
    ...indices: (number | string)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  armgetBuffer(...args: [
    key: RedisKey,
    ...indices: (number | string)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  armget(...args: [
    key: RedisKey,
    ...indices: (number | string)[]
  ]): Result<(string | null)[], Context>;
  armgetBuffer(...args: [
    key: RedisKey,
    ...indices: (number | string)[]
  ]): Result<(Buffer | null)[], Context>;
  armset(...args: [
    key: RedisKey,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  armset(...args: [
    key: RedisKey,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  arnext(key: RedisKey, callback?: Callback<number | null>): Result<number | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, sum: 'SUM', callback?: Callback<string | null>): Result<string | null, Context>;
  aropBuffer(key: RedisKey, start: number | string, end: number | string, sum: 'SUM', callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, min: 'MIN', callback?: Callback<string | null>): Result<string | null, Context>;
  aropBuffer(key: RedisKey, start: number | string, end: number | string, min: 'MIN', callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, max: 'MAX', callback?: Callback<string | null>): Result<string | null, Context>;
  aropBuffer(key: RedisKey, start: number | string, end: number | string, max: 'MAX', callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, and: 'AND', callback?: Callback<number | null>): Result<number | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, or: 'OR', callback?: Callback<number | null>): Result<number | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, xor: 'XOR', callback?: Callback<number | null>): Result<number | null, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, match: 'MATCH', value: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  arop(key: RedisKey, start: number | string, end: number | string, used: 'USED', callback?: Callback<number>): Result<number, Context>;
  arring(...args: [
    key: RedisKey,
    size: number | string,
    ...values: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  arring(...args: [
    key: RedisKey,
    size: number | string,
    ...values: (string | Buffer | number)[]
  ]): Result<number, Context>;
  arscan(key: RedisKey, start: number | string, end: number | string, callback?: Callback<Array<[
    index: number,
    value: string
  ]>>): Result<Array<[
    index: number,
    value: string
  ]>, Context>;
  arscanBuffer(key: RedisKey, start: number | string, end: number | string, callback?: Callback<Array<[
    index: number,
    value: Buffer
  ]>>): Result<Array<[
    index: number,
    value: Buffer
  ]>, Context>;
  arscan(key: RedisKey, start: number | string, end: number | string, limitToken: 'LIMIT', limit: number | string, callback?: Callback<Array<[
    index: number,
    value: string
  ]>>): Result<Array<[
    index: number,
    value: string
  ]>, Context>;
  arscanBuffer(key: RedisKey, start: number | string, end: number | string, limitToken: 'LIMIT', limit: number | string, callback?: Callback<Array<[
    index: number,
    value: Buffer
  ]>>): Result<Array<[
    index: number,
    value: Buffer
  ]>, Context>;
  arseek(key: RedisKey, index: number | string, callback?: Callback<number>): Result<number, Context>;
  arset(...args: [
    key: RedisKey,
    index: number | string,
    ...values: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  arset(...args: [
    key: RedisKey,
    index: number | string,
    ...values: (string | Buffer | number)[]
  ]): Result<number, Context>;
  asking(callback?: Callback<"OK">): Result<"OK", Context>;
  auth(password: string | Buffer, callback?: Callback<"OK">): Result<"OK", Context>;
  auth(username: string | Buffer, password: string | Buffer, callback?: Callback<"OK">): Result<"OK", Context>;
  bgrewriteaof(callback?: Callback<string>): Result<string, Context>;
  bgrewriteaofBuffer(callback?: Callback<Buffer>): Result<Buffer, Context>;
  bgsave(callback?: Callback<"OK">): Result<"OK", Context>;
  bgsave(schedule: "SCHEDULE", callback?: Callback<"OK">): Result<"OK", Context>;
  bitcount(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  bitcount(key: RedisKey, start: number | string, end: number | string, callback?: Callback<number>): Result<number, Context>;
  bitcount(key: RedisKey, start: number | string, end: number | string, byte: "BYTE", callback?: Callback<number>): Result<number, Context>;
  bitcount(key: RedisKey, start: number | string, end: number | string, bit: "BIT", callback?: Callback<number>): Result<number, Context>;
  bitfield(key: RedisKey, encodingOffsetToken: "GET", encoding: string | Buffer, offset: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, encodingOffsetValueToken: "SET", encoding: string | Buffer, offset: number | string, value: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, encodingOffsetIncrementToken: "INCRBY", encoding: string | Buffer, offset: number | string, increment: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", wrap: "WRAP", encodingOffsetValueToken: "SET", encoding: string | Buffer, offset: number | string, value: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", wrap: "WRAP", encodingOffsetIncrementToken: "INCRBY", encoding: string | Buffer, offset: number | string, increment: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", sat: "SAT", encodingOffsetValueToken: "SET", encoding: string | Buffer, offset: number | string, value: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", sat: "SAT", encodingOffsetIncrementToken: "INCRBY", encoding: string | Buffer, offset: number | string, increment: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", fail: "FAIL", encodingOffsetValueToken: "SET", encoding: string | Buffer, offset: number | string, value: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield(key: RedisKey, overflow: "OVERFLOW", fail: "FAIL", encodingOffsetIncrementToken: "INCRBY", encoding: string | Buffer, offset: number | string, increment: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  bitfield_ro(...args: [
    key: RedisKey,
    encodingOffsetToken: "GET",
    ...encodingOffsets: (string | Buffer | number)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  bitfield_ro(...args: [
    key: RedisKey,
    encodingOffsetToken: "GET",
    ...encodingOffsets: (string | Buffer | number)[]
  ]): Result<unknown[], Context>;
  bitop(...args: [
    operation: string | Buffer,
    destkey: RedisKey,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  bitop(...args: [
    operation: string | Buffer,
    destkey: RedisKey,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  bitop(...args: [
    operation: string | Buffer,
    destkey: RedisKey,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  bitop(...args: [
    operation: string | Buffer,
    destkey: RedisKey,
    keys: RedisKey[]
  ]): Result<number, Context>;
  bitpos(key: RedisKey, bit: number | string, callback?: Callback<number>): Result<number, Context>;
  bitpos(key: RedisKey, bit: number | string, start: number | string, callback?: Callback<number>): Result<number, Context>;
  bitpos(key: RedisKey, bit: number | string, start: number | string, end: number | string, callback?: Callback<number>): Result<number, Context>;
  bitpos(key: RedisKey, bit: number | string, start: number | string, end: number | string, byte: "BYTE", callback?: Callback<number>): Result<number, Context>;
  bitpos(key: RedisKey, bit: number | string, start: number | string, end: number | string, bit1: "BIT", callback?: Callback<number>): Result<number, Context>;
  blmove(source: RedisKey, destination: RedisKey, left: "LEFT", left1: "LEFT", timeout: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  blmoveBuffer(source: RedisKey, destination: RedisKey, left: "LEFT", left1: "LEFT", timeout: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  blmove(source: RedisKey, destination: RedisKey, left: "LEFT", right: "RIGHT", timeout: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  blmoveBuffer(source: RedisKey, destination: RedisKey, left: "LEFT", right: "RIGHT", timeout: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  blmove(source: RedisKey, destination: RedisKey, right: "RIGHT", left: "LEFT", timeout: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  blmoveBuffer(source: RedisKey, destination: RedisKey, right: "RIGHT", left: "LEFT", timeout: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  blmove(source: RedisKey, destination: RedisKey, right: "RIGHT", right1: "RIGHT", timeout: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  blmoveBuffer(source: RedisKey, destination: RedisKey, right: "RIGHT", right1: "RIGHT", timeout: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  blmpopBuffer(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  blpop(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      string,
      string
    ] | null>
  ]): Result<[
    string,
    string
  ] | null, Context>;
  blpopBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      Buffer,
      Buffer
    ] | null>
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  blpop(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      string,
      string
    ] | null>
  ]): Result<[
    string,
    string
  ] | null, Context>;
  blpopBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      Buffer,
      Buffer
    ] | null>
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  blpop(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    string,
    string
  ] | null, Context>;
  blpopBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  blpop(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    string,
    string
  ] | null, Context>;
  blpopBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  brpop(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      string,
      string
    ] | null>
  ]): Result<[
    string,
    string
  ] | null, Context>;
  brpopBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      Buffer,
      Buffer
    ] | null>
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  brpop(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      string,
      string
    ] | null>
  ]): Result<[
    string,
    string
  ] | null, Context>;
  brpopBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      Buffer,
      Buffer
    ] | null>
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  brpop(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    string,
    string
  ] | null, Context>;
  brpopBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  brpop(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    string,
    string
  ] | null, Context>;
  brpopBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    Buffer,
    Buffer
  ] | null, Context>;
  brpoplpush(source: RedisKey, destination: RedisKey, timeout: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  brpoplpushBuffer(source: RedisKey, destination: RedisKey, timeout: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN"
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN"
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX"
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX"
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  bzmpop(...args: [
    timeout: number | string,
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  bzpopmax(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: string,
      member: string,
      score: string
    ] | null>
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopmaxBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: Buffer,
      member: Buffer,
      score: Buffer
    ] | null>
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmax(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: string,
      member: string,
      score: string
    ] | null>
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopmaxBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: Buffer,
      member: Buffer,
      score: Buffer
    ] | null>
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmax(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopmaxBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmax(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopmaxBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmin(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: string,
      member: string,
      score: string
    ] | null>
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopminBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: Buffer,
      member: Buffer,
      score: Buffer
    ] | null>
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmin(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: string,
      member: string,
      score: string
    ] | null>
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopminBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string,
    callback: Callback<[
      key: Buffer,
      member: Buffer,
      score: Buffer
    ] | null>
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmin(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopminBuffer(...args: [
    ...keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  bzpopmin(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: string,
    member: string,
    score: string
  ] | null, Context>;
  bzpopminBuffer(...args: [
    keys: RedisKey[],
    timeout: number | string
  ]): Result<[
    key: Buffer,
    member: Buffer,
    score: Buffer
  ] | null, Context>;
  client(subcommand: "CACHING", yes: "YES", callback?: Callback<"OK">): Result<"OK", Context>;
  client(subcommand: "CACHING", no: "NO", callback?: Callback<"OK">): Result<"OK", Context>;
  client(subcommand: "GETNAME", callback?: Callback<string | null>): Result<string | null, Context>;
  clientBuffer(subcommand: "GETNAME", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  client(subcommand: "GETREDIR", callback?: Callback<number>): Result<number, Context>;
  client(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "ID", callback?: Callback<number>): Result<number, Context>;
  client(subcommand: "INFO", callback?: Callback<string>): Result<string, Context>;
  clientBuffer(subcommand: "INFO", callback?: Callback<Buffer>): Result<Buffer, Context>;
  client(...args: [
    subcommand: "KILL",
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "KILL",
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  client(subcommand: "LIST", callback?: Callback<unknown>): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    idToken: "ID",
    ...clientIds: (number | string)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    idToken: "ID",
    ...clientIds: (number | string)[]
  ]): Result<unknown, Context>;
  client(subcommand: "LIST", type: "TYPE", normal: "NORMAL", callback?: Callback<unknown>): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    normal: "NORMAL",
    idToken: "ID",
    ...clientIds: (number | string)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    normal: "NORMAL",
    idToken: "ID",
    ...clientIds: (number | string)[]
  ]): Result<unknown, Context>;
  client(subcommand: "LIST", type: "TYPE", master: "MASTER", callback?: Callback<unknown>): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    master: "MASTER",
    idToken: "ID",
    ...clientIds: (number | string)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    master: "MASTER",
    idToken: "ID",
    ...clientIds: (number | string)[]
  ]): Result<unknown, Context>;
  client(subcommand: "LIST", type: "TYPE", replica: "REPLICA", callback?: Callback<unknown>): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    replica: "REPLICA",
    idToken: "ID",
    ...clientIds: (number | string)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    replica: "REPLICA",
    idToken: "ID",
    ...clientIds: (number | string)[]
  ]): Result<unknown, Context>;
  client(subcommand: "LIST", type: "TYPE", pubsub: "PUBSUB", callback?: Callback<unknown>): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    pubsub: "PUBSUB",
    idToken: "ID",
    ...clientIds: (number | string)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "LIST",
    type: "TYPE",
    pubsub: "PUBSUB",
    idToken: "ID",
    ...clientIds: (number | string)[]
  ]): Result<unknown, Context>;
  client(subcommand: "NO-EVICT", on: "ON", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "NO-EVICT", off: "OFF", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "PAUSE", timeout: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  client(subcommand: "PAUSE", timeout: number | string, write: "WRITE", callback?: Callback<"OK">): Result<"OK", Context>;
  client(subcommand: "PAUSE", timeout: number | string, all: "ALL", callback?: Callback<"OK">): Result<"OK", Context>;
  client(subcommand: "REPLY", on: "ON", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "REPLY", off: "OFF", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "REPLY", skip: "SKIP", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "SETNAME", connectionName: string | Buffer, callback?: Callback<"OK">): Result<"OK", Context>;
  client(...args: [
    subcommand: "TRACKING",
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  client(...args: [
    subcommand: "TRACKING",
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  client(subcommand: "TRACKINGINFO", callback?: Callback<string>): Result<string, Context>;
  clientBuffer(subcommand: "TRACKINGINFO", callback?: Callback<Buffer>): Result<Buffer, Context>;
  client(subcommand: "UNBLOCK", clientId: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "UNBLOCK", clientId: number | string, timeout: "TIMEOUT", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "UNBLOCK", clientId: number | string, error: "ERROR", callback?: Callback<unknown>): Result<unknown, Context>;
  client(subcommand: "UNPAUSE", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(...args: [
    subcommand: "ADDSLOTS",
    ...slots: (number | string)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "ADDSLOTS",
    slots: (number | string)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "ADDSLOTS",
    ...slots: (number | string)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "ADDSLOTS",
    slots: (number | string)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "ADDSLOTSRANGE",
    ...startSlotEndSlots: (string | number)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "ADDSLOTSRANGE",
    ...startSlotEndSlots: (string | number)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(subcommand: "BUMPEPOCH", callback?: Callback<"BUMPED" | "STILL">): Result<"BUMPED" | "STILL", Context>;
  cluster(subcommand: "COUNT-FAILURE-REPORTS", nodeId: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  cluster(subcommand: "COUNTKEYSINSLOT", slot: number | string, callback?: Callback<number>): Result<number, Context>;
  cluster(...args: [
    subcommand: "DELSLOTS",
    ...slots: (number | string)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "DELSLOTS",
    slots: (number | string)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "DELSLOTS",
    ...slots: (number | string)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "DELSLOTS",
    slots: (number | string)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "DELSLOTSRANGE",
    ...startSlotEndSlots: (string | number)[],
    callback: Callback<[
      startSlotRange: number,
      endSlotRange: number,
      ...nodes: [
        host: string,
        port: number,
        nodeId: string,
        info: unknown[]
      ][]
    ][]>
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(...args: [
    subcommand: "DELSLOTSRANGE",
    ...startSlotEndSlots: (string | number)[]
  ]): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(subcommand: "FAILOVER", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "FAILOVER", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "FAILOVER", takeover: "TAKEOVER", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "FLUSHSLOTS", callback?: Callback<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][]>): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  cluster(subcommand: "FORGET", nodeId: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "GETKEYSINSLOT", slot: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  cluster(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  cluster(subcommand: "INFO", callback?: Callback<string>): Result<string, Context>;
  cluster(subcommand: "KEYSLOT", key: string | Buffer, callback?: Callback<number>): Result<number, Context>;
  cluster(subcommand: "LINKS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  cluster(subcommand: "MEET", ip: string | Buffer, port: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "MYID", callback?: Callback<string>): Result<string, Context>;
  cluster(subcommand: "NODES", callback?: Callback<unknown>): Result<unknown, Context>;
  cluster(subcommand: "REPLICAS", nodeId: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  cluster(subcommand: "REPLICATE", nodeId: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "RESET", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "RESET", hard: "HARD", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "RESET", soft: "SOFT", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SAVECONFIG", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SET-CONFIG-EPOCH", configEpoch: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SETSLOT", slot: number | string, nodeIdToken: "IMPORTING", nodeId: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SETSLOT", slot: number | string, nodeIdToken: "MIGRATING", nodeId: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SETSLOT", slot: number | string, nodeIdToken: "NODE", nodeId: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SETSLOT", slot: number | string, stable: "STABLE", callback?: Callback<"OK">): Result<"OK", Context>;
  cluster(subcommand: "SHARDS", callback?: Callback<unknown>): Result<unknown, Context>;
  cluster(subcommand: "SLAVES", nodeId: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  cluster(subcommand: "SLOTS", callback?: Callback<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][]>): Result<[
    startSlotRange: number,
    endSlotRange: number,
    ...nodes: [
      host: string,
      port: number,
      nodeId: string,
      info: unknown[]
    ][]
  ][], Context>;
  command(subcommand: "COUNT", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "DOCS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(...args: [
    subcommand: "DOCS",
    ...commandNames: (string | Buffer)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  command(...args: [
    subcommand: "DOCS",
    ...commandNames: (string | Buffer)[]
  ]): Result<unknown[], Context>;
  command(subcommand: "GETKEYS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "GETKEYSANDFLAGS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "HELP", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "INFO", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(...args: [
    subcommand: "INFO",
    ...commandNames: (string | Buffer)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  command(...args: [
    subcommand: "INFO",
    ...commandNames: (string | Buffer)[]
  ]): Result<unknown[], Context>;
  command(subcommand: "LIST", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "LIST", filterby: "FILTERBY", moduleNameToken: "MODULE", moduleName: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "LIST", filterby: "FILTERBY", categoryToken: "ACLCAT", category: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  command(subcommand: "LIST", filterby: "FILTERBY", patternToken: "PATTERN", pattern: string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  config(...args: [
    subcommand: "GET",
    ...parameters: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  config(...args: [
    subcommand: "GET",
    ...parameters: (string | Buffer)[]
  ]): Result<unknown, Context>;
  config(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  config(subcommand: "RESETSTAT", callback?: Callback<unknown>): Result<unknown, Context>;
  config(subcommand: "REWRITE", callback?: Callback<unknown>): Result<unknown, Context>;
  config(...args: [
    subcommand: "SET",
    ...parameterValues: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  config(...args: [
    subcommand: "SET",
    ...parameterValues: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  copy(source: RedisKey, destination: RedisKey, callback?: Callback<number>): Result<number, Context>;
  copy(source: RedisKey, destination: RedisKey, replace: "REPLACE", callback?: Callback<number>): Result<number, Context>;
  copy(source: RedisKey, destination: RedisKey, destinationDbToken: "DB", destinationDb: number | string, callback?: Callback<number>): Result<number, Context>;
  copy(source: RedisKey, destination: RedisKey, destinationDbToken: "DB", destinationDb: number | string, replace: "REPLACE", callback?: Callback<number>): Result<number, Context>;
  dbsize(callback?: Callback<number>): Result<number, Context>;
  debug(subcommand: string, callback?: Callback<unknown>): Result<unknown, Context>;
  debug(...args: [
    subcommand: string,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  debug(...args: [
    subcommand: string,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  decr(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  decrby(key: RedisKey, decrement: number | string, callback?: Callback<number>): Result<number, Context>;
  del(...args: [
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  del(...args: [
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  del(...args: [
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  del(...args: [
    keys: RedisKey[]
  ]): Result<number, Context>;
  discard(callback?: Callback<"OK">): Result<"OK", Context>;
  dump(key: RedisKey, callback?: Callback<string>): Result<string, Context>;
  dumpBuffer(key: RedisKey, callback?: Callback<Buffer>): Result<Buffer, Context>;
  echo(message: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  echoBuffer(message: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  eval(script: string | Buffer, numkeys: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  eval(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  eval_ro(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  eval_ro(...args: [
    script: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  evalsha(sha1: string | Buffer, numkeys: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  evalsha(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  evalsha_ro(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  evalsha_ro(...args: [
    sha1: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  exec(callback?: Callback<[
    error: Error | null,
    result: unknown
  ][] | null>): Promise<[
    error: Error | null,
    result: unknown
  ][] | null>;
  exists(...args: [
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  exists(...args: [
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  exists(...args: [
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  exists(...args: [
    keys: RedisKey[]
  ]): Result<number, Context>;
  expire(key: RedisKey, seconds: number | string, callback?: Callback<number>): Result<number, Context>;
  expire(key: RedisKey, seconds: number | string, nx: "NX", callback?: Callback<number>): Result<number, Context>;
  expire(key: RedisKey, seconds: number | string, xx: "XX", callback?: Callback<number>): Result<number, Context>;
  expire(key: RedisKey, seconds: number | string, gt: "GT", callback?: Callback<number>): Result<number, Context>;
  expire(key: RedisKey, seconds: number | string, lt: "LT", callback?: Callback<number>): Result<number, Context>;
  expireat(key: RedisKey, unixTimeSeconds: number | string, callback?: Callback<number>): Result<number, Context>;
  expireat(key: RedisKey, unixTimeSeconds: number | string, nx: "NX", callback?: Callback<number>): Result<number, Context>;
  expireat(key: RedisKey, unixTimeSeconds: number | string, xx: "XX", callback?: Callback<number>): Result<number, Context>;
  expireat(key: RedisKey, unixTimeSeconds: number | string, gt: "GT", callback?: Callback<number>): Result<number, Context>;
  expireat(key: RedisKey, unixTimeSeconds: number | string, lt: "LT", callback?: Callback<number>): Result<number, Context>;
  expiretime(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  failover(callback?: Callback<"OK">): Result<"OK", Context>;
  failover(millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  failover(abort: "ABORT", millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, abort: "ABORT", millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, force: "FORCE", millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  failover(targetToken: "TO", host: string | Buffer, port: number | string, force: "FORCE", abort: "ABORT", millisecondsToken: "TIMEOUT", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  fcall(...args: [
    function: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  fcall(...args: [
    function: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  fcall_ro(...args: [
    function: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  fcall_ro(...args: [
    function: string | Buffer,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  flushall(callback?: Callback<"OK">): Result<"OK", Context>;
  flushall(async: "ASYNC", callback?: Callback<"OK">): Result<"OK", Context>;
  flushall(sync: "SYNC", callback?: Callback<"OK">): Result<"OK", Context>;
  flushdb(callback?: Callback<"OK">): Result<"OK", Context>;
  flushdb(async: "ASYNC", callback?: Callback<"OK">): Result<"OK", Context>;
  flushdb(sync: "SYNC", callback?: Callback<"OK">): Result<"OK", Context>;
  function(subcommand: "DELETE", libraryName: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "DELETE", libraryName: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "DUMP", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "DUMP", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "FLUSH", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "FLUSH", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "FLUSH", async: "ASYNC", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "FLUSH", async: "ASYNC", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "FLUSH", sync: "SYNC", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "FLUSH", sync: "SYNC", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  function(subcommand: "KILL", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "KILL", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "LIST", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  function(subcommand: "LIST", withcode: "WITHCODE", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  function(subcommand: "LIST", libraryNamePatternToken: "LIBRARYNAME", libraryNamePattern: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  function(subcommand: "LIST", libraryNamePatternToken: "LIBRARYNAME", libraryNamePattern: string | Buffer, withcode: "WITHCODE", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  function(subcommand: "LOAD", functionCode: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "LOAD", functionCode: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "LOAD", replace: "REPLACE", functionCode: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "LOAD", replace: "REPLACE", functionCode: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "RESTORE", serializedValue: string | Buffer | number, callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "RESTORE", serializedValue: string | Buffer | number, callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "RESTORE", serializedValue: string | Buffer | number, flush: "FLUSH", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "RESTORE", serializedValue: string | Buffer | number, flush: "FLUSH", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "RESTORE", serializedValue: string | Buffer | number, append: "APPEND", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "RESTORE", serializedValue: string | Buffer | number, append: "APPEND", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "RESTORE", serializedValue: string | Buffer | number, replace: "REPLACE", callback?: Callback<string>): Result<string, Context>;
  functionBuffer(subcommand: "RESTORE", serializedValue: string | Buffer | number, replace: "REPLACE", callback?: Callback<Buffer>): Result<Buffer, Context>;
  function(subcommand: "STATS", callback?: Callback<unknown>): Result<unknown, Context>;
  geoadd(...args: [
    key: RedisKey,
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    nx: "NX",
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    nx: "NX",
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    xx: "XX",
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    xx: "XX",
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geoadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    ...longitudeLatitudeMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  geodist(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, callback?: Callback<string | null>): Result<string | null, Context>;
  geodistBuffer(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  geodist(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, m: "M", callback?: Callback<string | null>): Result<string | null, Context>;
  geodistBuffer(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, m: "M", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  geodist(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, km: "KM", callback?: Callback<string | null>): Result<string | null, Context>;
  geodistBuffer(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, km: "KM", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  geodist(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, ft: "FT", callback?: Callback<string | null>): Result<string | null, Context>;
  geodistBuffer(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, ft: "FT", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  geodist(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, mi: "MI", callback?: Callback<string | null>): Result<string | null, Context>;
  geodistBuffer(key: RedisKey, member1: string | Buffer | number, member2: string | Buffer | number, mi: "MI", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  geohash(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  geohashBuffer(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  geohash(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  geohashBuffer(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  geohash(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<string[], Context>;
  geohashBuffer(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<Buffer[], Context>;
  geohash(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<string[], Context>;
  geohashBuffer(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<Buffer[], Context>;
  geopos(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<([
      longitude: string,
      latitude: string
    ] | null)[]>
  ]): Result<([
    longitude: string,
    latitude: string
  ] | null)[], Context>;
  geopos(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<([
      longitude: string,
      latitude: string
    ] | null)[]>
  ]): Result<([
    longitude: string,
    latitude: string
  ] | null)[], Context>;
  geopos(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<([
    longitude: string,
    latitude: string
  ] | null)[], Context>;
  geopos(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<([
    longitude: string,
    latitude: string
  ] | null)[], Context>;
  georadius(...args: [
    key: RedisKey,
    longitude: number | string,
    latitude: number | string,
    radius: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  georadius(...args: [
    key: RedisKey,
    longitude: number | string,
    latitude: number | string,
    radius: number | string,
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  georadius_ro(...args: [
    key: RedisKey,
    longitude: number | string,
    latitude: number | string,
    radius: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  georadius_ro(...args: [
    key: RedisKey,
    longitude: number | string,
    latitude: number | string,
    radius: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  georadiusbymember(...args: [
    key: RedisKey,
    member: string | Buffer | number,
    radius: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  georadiusbymember(...args: [
    key: RedisKey,
    member: string | Buffer | number,
    radius: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  georadiusbymember_ro(...args: [
    key: RedisKey,
    member: string | Buffer | number,
    radius: number | string,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  georadiusbymember_ro(...args: [
    key: RedisKey,
    member: string | Buffer | number,
    radius: number | string,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  geosearch(...args: [
    key: RedisKey,
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  geosearch(...args: [
    key: RedisKey,
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  geosearchstore(...args: [
    destination: RedisKey,
    source: RedisKey,
    ...args: RedisValue[],
    callback: Callback<number>
  ]): Result<number, Context>;
  geosearchstore(...args: [
    destination: RedisKey,
    source: RedisKey,
    ...args: RedisValue[]
  ]): Result<number, Context>;
  get(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  getBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getbit(key: RedisKey, offset: number | string, callback?: Callback<number>): Result<number, Context>;
  getdel(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  getdelBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, secondsToken: "EX", seconds: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, secondsToken: "EX", seconds: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, millisecondsToken: "PX", milliseconds: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, millisecondsToken: "PX", milliseconds: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getex(key: RedisKey, persist: "PERSIST", callback?: Callback<string | null>): Result<string | null, Context>;
  getexBuffer(key: RedisKey, persist: "PERSIST", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  getrange(key: RedisKey, start: number | string, end: number | string, callback?: Callback<string>): Result<string, Context>;
  getrangeBuffer(key: RedisKey, start: number | string, end: number | string, callback?: Callback<Buffer>): Result<Buffer, Context>;
  getset(key: RedisKey, value: string | Buffer | number, callback?: Callback<string | null>): Result<string | null, Context>;
  getsetBuffer(key: RedisKey, value: string | Buffer | number, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  hdel(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hdel(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[]
  ]): Result<number, Context>;
  hello(callback?: Callback<unknown[]>): Result<unknown[], Context>;
  hello(protover: number | string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  hello(protover: number | string, clientnameToken: "SETNAME", clientname: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  hello(protover: number | string, usernamePasswordToken: "AUTH", username: string | Buffer, password: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  hello(protover: number | string, usernamePasswordToken: "AUTH", username: string | Buffer, password: string | Buffer, clientnameToken: "SETNAME", clientname: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  hexists(key: RedisKey, field: string | Buffer, callback?: Callback<number>): Result<number, Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpire(...args: [
    key: RedisKey,
    seconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpireat(...args: [
    key: RedisKey,
    unixTimeSeconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hexpiretime(...args: [
    key: RedisKey,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hexpiretime(...args: [
    key: RedisKey,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hget(key: RedisKey, field: string | Buffer, callback?: Callback<string | null>): Result<string | null, Context>;
  hgetBuffer(key: RedisKey, field: string | Buffer, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  hgetall(key: RedisKey, callback?: Callback<Record<string, string>>): Result<Record<string, string>, Context>;
  hgetallBuffer(key: RedisKey, callback?: Callback<Record<string, Buffer>>): Result<Record<string, Buffer>, Context>;
  hgetdel(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetdelBuffer(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetdel(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetdelBuffer(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    persist: "PERSIST",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    persist: "PERSIST",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hgetex(...args: [
    key: RedisKey,
    persist: "PERSIST",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hgetexBuffer(...args: [
    key: RedisKey,
    persist: "PERSIST",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hincrby(key: RedisKey, field: string | Buffer, increment: number | string, callback?: Callback<number>): Result<number, Context>;
  hincrbyfloat(key: RedisKey, field: string | Buffer, increment: number | string, callback?: Callback<string>): Result<string, Context>;
  hincrbyfloatBuffer(key: RedisKey, field: string | Buffer, increment: number | string, callback?: Callback<Buffer>): Result<Buffer, Context>;
  hkeys(key: RedisKey, callback?: Callback<string[]>): Result<string[], Context>;
  hkeysBuffer(key: RedisKey, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  hlen(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  hmget(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  hmgetBuffer(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  hmget(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[]
  ]): Result<(string | null)[], Context>;
  hmgetBuffer(...args: [
    key: RedisKey,
    ...fields: (string | Buffer)[]
  ]): Result<(Buffer | null)[], Context>;
  hmset(key: RedisKey, object: object, callback?: Callback<"OK">): Result<"OK", Context>;
  hmset(key: RedisKey, map: Map<string | Buffer | number, string | Buffer | number>, callback?: Callback<"OK">): Result<"OK", Context>;
  hmset(...args: [
    key: RedisKey,
    ...fieldValues: (string | Buffer | number)[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  hmset(...args: [
    key: RedisKey,
    ...fieldValues: (string | Buffer | number)[]
  ]): Result<"OK", Context>;
  hpersist(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpersist(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    nx: 'NX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    xx: 'XX',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    gt: 'GT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpire(...args: [
    key: RedisKey,
    milliseconds: number | string,
    lt: 'LT',
    fieldsToken: 'FIELDS',
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    nx: "NX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    nx: "NX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    xx: "XX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    xx: "XX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    gt: "GT",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    gt: "GT",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    lt: "LT",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpireat(...args: [
    key: RedisKey,
    unixTimeMilliseconds: number | string,
    lt: "LT",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpexpiretime(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpexpiretime(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hpttl(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  hpttl(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hrandfield(key: RedisKey, callback?: Callback<string | unknown[] | null>): Result<string | unknown[] | null, Context>;
  hrandfieldBuffer(key: RedisKey, callback?: Callback<Buffer | unknown[] | null>): Result<Buffer | unknown[] | null, Context>;
  hrandfield(key: RedisKey, count: number | string, callback?: Callback<string | unknown[] | null>): Result<string | unknown[] | null, Context>;
  hrandfieldBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer | unknown[] | null>): Result<Buffer | unknown[] | null, Context>;
  hrandfield(key: RedisKey, count: number | string, withvalues: "WITHVALUES", callback?: Callback<string | unknown[] | null>): Result<string | unknown[] | null, Context>;
  hrandfieldBuffer(key: RedisKey, count: number | string, withvalues: "WITHVALUES", callback?: Callback<Buffer | unknown[] | null>): Result<Buffer | unknown[] | null, Context>;
  hscan(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  hscanBuffer(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  hscan(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  hscanBuffer(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  hscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  hscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  hscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  hscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  hset(key: RedisKey, object: object, callback?: Callback<number>): Result<number, Context>;
  hset(key: RedisKey, map: Map<string | Buffer | number, string | Buffer | number>, callback?: Callback<number>): Result<number, Context>;
  hset(...args: [
    key: RedisKey,
    ...fieldValues: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hset(...args: [
    key: RedisKey,
    ...fieldValues: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fnx: "FNX",
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    secondsToken: "EX",
    seconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    millisecondsToken: "PX",
    milliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    unixTimeSecondsToken: "EXAT",
    unixTimeSeconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    unixTimeMillisecondsToken: "PXAT",
    unixTimeMilliseconds: number | string,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  hsetex(...args: [
    key: RedisKey,
    fxx: "FXX",
    keepttl: "KEEPTTL",
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...data: (string | Buffer | number)[]
  ]): Result<number, Context>;
  hsetnx(key: RedisKey, field: string | Buffer, value: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  hstrlen(key: RedisKey, field: string | Buffer, callback?: Callback<number>): Result<number, Context>;
  httl(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  httl(...args: [
    key: RedisKey,
    fieldsToken: "FIELDS",
    numfields: number | string,
    ...fields: (string | Buffer)[]
  ]): Result<number[], Context>;
  hvals(key: RedisKey, callback?: Callback<string[]>): Result<string[], Context>;
  hvalsBuffer(key: RedisKey, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  incr(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  incrby(key: RedisKey, increment: number | string, callback?: Callback<number>): Result<number, Context>;
  incrbyfloat(key: RedisKey, increment: number | string, callback?: Callback<string>): Result<string, Context>;
  increx(...args: [
    key: RedisKey,
    ...args: (RedisValue)[],
    callback: Callback<[
      value: number,
      increment: number
    ] | [
      value: string,
      increment: string
    ]>
  ]): Result<[
    value: number,
    increment: number
  ] | [
    value: string,
    increment: string
  ], Context>;
  increxBuffer(...args: [
    key: RedisKey,
    ...args: (RedisValue)[],
    callback: Callback<[
      value: number,
      increment: number
    ] | [
      value: Buffer,
      increment: Buffer
    ]>
  ]): Result<[
    value: number,
    increment: number
  ] | [
    value: Buffer,
    increment: Buffer
  ], Context>;
  increx(...args: [
    key: RedisKey,
    ...args: (RedisValue)[]
  ]): Result<[
    value: number,
    increment: number
  ] | [
    value: string,
    increment: string
  ], Context>;
  increxBuffer(...args: [
    key: RedisKey,
    ...args: (RedisValue)[]
  ]): Result<[
    value: number,
    increment: number
  ] | [
    value: Buffer,
    increment: Buffer
  ], Context>;
  info(callback?: Callback<string>): Result<string, Context>;
  info(...args: [
    ...sections: (string | Buffer)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  info(...args: [
    ...sections: (string | Buffer)[]
  ]): Result<string, Context>;
  keys(pattern: string, callback?: Callback<string[]>): Result<string[], Context>;
  keysBuffer(pattern: string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  lastsave(callback?: Callback<number>): Result<number, Context>;
  latency(subcommand: "DOCTOR", callback?: Callback<string>): Result<string, Context>;
  latency(subcommand: "GRAPH", event: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  latency(subcommand: "HELP", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  latency(subcommand: "HISTOGRAM", callback?: Callback<unknown>): Result<unknown, Context>;
  latency(...args: [
    subcommand: "HISTOGRAM",
    ...commands: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  latency(...args: [
    subcommand: "HISTOGRAM",
    ...commands: (string | Buffer)[]
  ]): Result<unknown, Context>;
  latency(subcommand: "HISTORY", event: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  latency(subcommand: "LATEST", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  latency(subcommand: "RESET", callback?: Callback<number>): Result<number, Context>;
  latency(...args: [
    subcommand: "RESET",
    ...events: (string | Buffer)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  latency(...args: [
    subcommand: "RESET",
    ...events: (string | Buffer)[]
  ]): Result<number, Context>;
  lcs(key1: RedisKey, key2: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, lenToken: "MINMATCHLEN", len: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, lenToken: "MINMATCHLEN", len: number | string, withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, idx: "IDX", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, idx: "IDX", withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, idx: "IDX", lenToken: "MINMATCHLEN", len: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, idx: "IDX", lenToken: "MINMATCHLEN", len: number | string, withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", lenToken: "MINMATCHLEN", len1: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", lenToken: "MINMATCHLEN", len1: number | string, withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", idx: "IDX", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", idx: "IDX", withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", idx: "IDX", lenToken: "MINMATCHLEN", len1: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  lcs(key1: RedisKey, key2: RedisKey, len: "LEN", idx: "IDX", lenToken: "MINMATCHLEN", len1: number | string, withmatchlen: "WITHMATCHLEN", callback?: Callback<unknown>): Result<unknown, Context>;
  lindex(key: RedisKey, index: number | string, callback?: Callback<string | null>): Result<string | null, Context>;
  lindexBuffer(key: RedisKey, index: number | string, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  linsert(key: RedisKey, before: "BEFORE", pivot: string | Buffer | number, element: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  linsert(key: RedisKey, after: "AFTER", pivot: string | Buffer | number, element: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  llen(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  lmove(source: RedisKey, destination: RedisKey, left: "LEFT", left1: "LEFT", callback?: Callback<string>): Result<string, Context>;
  lmoveBuffer(source: RedisKey, destination: RedisKey, left: "LEFT", left1: "LEFT", callback?: Callback<Buffer>): Result<Buffer, Context>;
  lmove(source: RedisKey, destination: RedisKey, left: "LEFT", right: "RIGHT", callback?: Callback<string>): Result<string, Context>;
  lmoveBuffer(source: RedisKey, destination: RedisKey, left: "LEFT", right: "RIGHT", callback?: Callback<Buffer>): Result<Buffer, Context>;
  lmove(source: RedisKey, destination: RedisKey, right: "RIGHT", left: "LEFT", callback?: Callback<string>): Result<string, Context>;
  lmoveBuffer(source: RedisKey, destination: RedisKey, right: "RIGHT", left: "LEFT", callback?: Callback<Buffer>): Result<Buffer, Context>;
  lmove(source: RedisKey, destination: RedisKey, right: "RIGHT", right1: "RIGHT", callback?: Callback<string>): Result<string, Context>;
  lmoveBuffer(source: RedisKey, destination: RedisKey, right: "RIGHT", right1: "RIGHT", callback?: Callback<Buffer>): Result<Buffer, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    left: "LEFT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT"
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: string,
      members: string[]
    ] | null>
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<[
      key: Buffer,
      members: Buffer[]
    ] | null>
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: string,
    members: string[]
  ] | null, Context>;
  lmpopBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    right: "RIGHT",
    countToken: "COUNT",
    count: number | string
  ]): Result<[
    key: Buffer,
    members: Buffer[]
  ] | null, Context>;
  lolwut(callback?: Callback<string>): Result<string, Context>;
  lolwut(versionToken: "VERSION", version: number | string, callback?: Callback<string>): Result<string, Context>;
  lpop(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  lpopBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  lpop(key: RedisKey, count: number | string, callback?: Callback<string[] | null>): Result<string[] | null, Context>;
  lpopBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[] | null>): Result<Buffer[] | null, Context>;
  lpos(key: RedisKey, element: string | Buffer | number, callback?: Callback<number | null>): Result<number | null, Context>;
  lpos(key: RedisKey, element: string | Buffer | number, lenToken: "MAXLEN", len: number | string, callback?: Callback<number | null>): Result<number | null, Context>;
  lpos(key: RedisKey, element: string | Buffer | number, numMatchesToken: "COUNT", numMatches: number | string, callback?: Callback<number[]>): Result<number[], Context>;
  lpos(key: RedisKey, element: string | Buffer | number, numMatchesToken: "COUNT", numMatches: number | string, lenToken: "MAXLEN", len: number | string, callback?: Callback<number[]>): Result<number[], Context>;
  lpos(key: RedisKey, element: string | Buffer | number, rankToken: "RANK", rank: number | string, callback?: Callback<number | null>): Result<number | null, Context>;
  lpos(key: RedisKey, element: string | Buffer | number, rankToken: "RANK", rank: number | string, lenToken: "MAXLEN", len: number | string, callback?: Callback<number | null>): Result<number | null, Context>;
  lpos(key: RedisKey, element: string | Buffer | number, rankToken: "RANK", rank: number | string, numMatchesToken: "COUNT", numMatches: number | string, callback?: Callback<number[]>): Result<number[], Context>;
  lpos(key: RedisKey, element: string | Buffer | number, rankToken: "RANK", rank: number | string, numMatchesToken: "COUNT", numMatches: number | string, lenToken: "MAXLEN", len: number | string, callback?: Callback<number[]>): Result<number[], Context>;
  lpush(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  lpush(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[]
  ]): Result<number, Context>;
  lpushx(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  lpushx(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[]
  ]): Result<number, Context>;
  lrange(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  lrangeBuffer(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  lrem(key: RedisKey, count: number | string, element: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  lset(key: RedisKey, index: number | string, element: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  ltrim(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  memory(subcommand: "DOCTOR", callback?: Callback<string>): Result<string, Context>;
  memory(subcommand: "HELP", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  memory(subcommand: "MALLOC-STATS", callback?: Callback<string>): Result<string, Context>;
  memory(subcommand: "PURGE", callback?: Callback<"OK">): Result<"OK", Context>;
  memory(subcommand: "STATS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  memory(subcommand: "USAGE", key: RedisKey, callback?: Callback<number | null>): Result<number | null, Context>;
  memory(subcommand: "USAGE", key: RedisKey, countToken: "SAMPLES", count: number | string, callback?: Callback<number | null>): Result<number | null, Context>;
  mget(...args: [
    ...keys: RedisKey[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  mgetBuffer(...args: [
    ...keys: RedisKey[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  mget(...args: [
    keys: RedisKey[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  mgetBuffer(...args: [
    keys: RedisKey[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  mget(...args: [
    ...keys: RedisKey[]
  ]): Result<(string | null)[], Context>;
  mgetBuffer(...args: [
    ...keys: RedisKey[]
  ]): Result<(Buffer | null)[], Context>;
  mget(...args: [
    keys: RedisKey[]
  ]): Result<(string | null)[], Context>;
  mgetBuffer(...args: [
    keys: RedisKey[]
  ]): Result<(Buffer | null)[], Context>;
  migrate(...args: [
    host: string | Buffer,
    port: number | string,
    ...args: RedisValue[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  migrate(...args: [
    host: string | Buffer,
    port: number | string,
    ...args: RedisValue[]
  ]): Result<"OK", Context>;
  module(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  module(subcommand: "LIST", callback?: Callback<unknown>): Result<unknown, Context>;
  module(subcommand: "LOAD", path: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOAD",
    path: string | Buffer,
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOAD",
    path: string | Buffer,
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  module(subcommand: "LOADEX", path: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    argsToken: "ARGS",
    ...args: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    argsToken: "ARGS",
    ...args: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    configsToken: "CONFIG",
    ...configs: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    configsToken: "CONFIG",
    ...configs: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    configsToken: "CONFIG",
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  module(...args: [
    subcommand: "LOADEX",
    path: string | Buffer,
    configsToken: "CONFIG",
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  module(subcommand: "UNLOAD", name: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  move(key: RedisKey, db: number | string, callback?: Callback<number>): Result<number, Context>;
  mset(object: object, callback?: Callback<"OK">): Result<"OK", Context>;
  mset(map: Map<string | Buffer | number, string | Buffer | number>, callback?: Callback<"OK">): Result<"OK", Context>;
  mset(...args: [
    ...keyValues: (RedisKey | string | Buffer | number)[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  mset(...args: [
    ...keyValues: (RedisKey | string | Buffer | number)[]
  ]): Result<"OK", Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[]
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    secondsToken: 'EX',
    seconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    secondsToken: 'EX',
    seconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    millisecondsToken: 'PX',
    milliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    millisecondsToken: 'PX',
    milliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    keepttl: 'KEEPTTL',
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    keepttl: 'KEEPTTL'
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX'
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    secondsToken: 'EX',
    seconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    secondsToken: 'EX',
    seconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    millisecondsToken: 'PX',
    milliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    millisecondsToken: 'PX',
    milliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    keepttl: 'KEEPTTL',
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    nx: 'NX',
    keepttl: 'KEEPTTL'
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX'
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    secondsToken: 'EX',
    seconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    secondsToken: 'EX',
    seconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    millisecondsToken: 'PX',
    milliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    millisecondsToken: 'PX',
    milliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    unixTimeSecondsToken: 'EXAT',
    unixTimeSeconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    unixTimeMillisecondsToken: 'PXAT',
    unixTimeMilliseconds: number | string
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    keepttl: 'KEEPTTL',
    callback: Callback<number>
  ]): Result<number, Context>;
  msetex(...args: [
    numkeys: number | string,
    ...data: (RedisKey | string | Buffer | number)[],
    xx: 'XX',
    keepttl: 'KEEPTTL'
  ]): Result<number, Context>;
  msetnx(object: object, callback?: Callback<"OK">): Result<"OK", Context>;
  msetnx(map: Map<string | Buffer | number, string | Buffer | number>, callback?: Callback<"OK">): Result<"OK", Context>;
  msetnx(...args: [
    ...keyValues: (RedisKey | string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  msetnx(...args: [
    ...keyValues: (RedisKey | string | Buffer | number)[]
  ]): Result<number, Context>;
  object(subcommand: "ENCODING", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  object(subcommand: "FREQ", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  object(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  object(subcommand: "IDLETIME", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  object(subcommand: "REFCOUNT", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  persist(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  pexpire(key: RedisKey, milliseconds: number | string, callback?: Callback<number>): Result<number, Context>;
  pexpire(key: RedisKey, milliseconds: number | string, nx: "NX", callback?: Callback<number>): Result<number, Context>;
  pexpire(key: RedisKey, milliseconds: number | string, xx: "XX", callback?: Callback<number>): Result<number, Context>;
  pexpire(key: RedisKey, milliseconds: number | string, gt: "GT", callback?: Callback<number>): Result<number, Context>;
  pexpire(key: RedisKey, milliseconds: number | string, lt: "LT", callback?: Callback<number>): Result<number, Context>;
  pexpireat(key: RedisKey, unixTimeMilliseconds: number | string, callback?: Callback<number>): Result<number, Context>;
  pexpireat(key: RedisKey, unixTimeMilliseconds: number | string, nx: "NX", callback?: Callback<number>): Result<number, Context>;
  pexpireat(key: RedisKey, unixTimeMilliseconds: number | string, xx: "XX", callback?: Callback<number>): Result<number, Context>;
  pexpireat(key: RedisKey, unixTimeMilliseconds: number | string, gt: "GT", callback?: Callback<number>): Result<number, Context>;
  pexpireat(key: RedisKey, unixTimeMilliseconds: number | string, lt: "LT", callback?: Callback<number>): Result<number, Context>;
  pexpiretime(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  pfadd(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  pfadd(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  pfadd(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[]
  ]): Result<number, Context>;
  pfcount(...args: [
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  pfcount(...args: [
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  pfcount(...args: [
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  pfcount(...args: [
    keys: RedisKey[]
  ]): Result<number, Context>;
  pfdebug(subcommand: string | Buffer, key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  pfmerge(...args: [
    destkey: RedisKey,
    ...sourcekeys: RedisKey[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  pfmerge(...args: [
    destkey: RedisKey,
    sourcekeys: RedisKey[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  pfmerge(...args: [
    destkey: RedisKey,
    ...sourcekeys: RedisKey[]
  ]): Result<"OK", Context>;
  pfmerge(...args: [
    destkey: RedisKey,
    sourcekeys: RedisKey[]
  ]): Result<"OK", Context>;
  pfselftest(callback?: Callback<unknown>): Result<unknown, Context>;
  ping(callback?: Callback<"PONG">): Result<"PONG", Context>;
  ping(message: string | Buffer, callback?: Callback<string>): Result<string, Context>;
  pingBuffer(message: string | Buffer, callback?: Callback<Buffer>): Result<Buffer, Context>;
  psetex(key: RedisKey, milliseconds: number | string, value: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  psubscribe(...args: [
    ...patterns: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  psubscribe(...args: [
    ...patterns: string[]
  ]): Result<unknown, Context>;
  psync(replicationid: string | Buffer | number, offset: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  pttl(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  publish(channel: string | Buffer, message: string | Buffer, callback?: Callback<number>): Result<number, Context>;
  pubsub(subcommand: "CHANNELS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "CHANNELS", pattern: string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "HELP", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "NUMPAT", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "NUMSUB", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(...args: [
    subcommand: "NUMSUB",
    ...channels: (string | Buffer)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  pubsub(...args: [
    subcommand: "NUMSUB",
    ...channels: (string | Buffer)[]
  ]): Result<unknown[], Context>;
  pubsub(subcommand: "SHARDCHANNELS", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "SHARDCHANNELS", pattern: string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(subcommand: "SHARDNUMSUB", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  pubsub(...args: [
    subcommand: "SHARDNUMSUB",
    ...shardchannels: (string | Buffer)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  pubsub(...args: [
    subcommand: "SHARDNUMSUB",
    ...shardchannels: (string | Buffer)[]
  ]): Result<unknown[], Context>;
  punsubscribe(callback?: Callback<unknown>): Result<unknown, Context>;
  punsubscribe(...args: [
    ...patterns: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  punsubscribe(...args: [
    ...patterns: string[]
  ]): Result<unknown, Context>;
  quit(callback?: Callback<"OK">): Result<"OK", Context>;
  randomkey(callback?: Callback<string | null>): Result<string | null, Context>;
  randomkeyBuffer(callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  readonly(callback?: Callback<"OK">): Result<"OK", Context>;
  readwrite(callback?: Callback<"OK">): Result<"OK", Context>;
  rename(key: RedisKey, newkey: RedisKey, callback?: Callback<"OK">): Result<"OK", Context>;
  renamenx(key: RedisKey, newkey: RedisKey, callback?: Callback<number>): Result<number, Context>;
  replconf(callback?: Callback<unknown>): Result<unknown, Context>;
  replicaof(host: string | Buffer, port: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  reset(callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  restore(key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  ["restore-asking"](key: RedisKey, ttl: number | string, serializedValue: string | Buffer | number, replace: "REPLACE", absttl: "ABSTTL", secondsToken: "IDLETIME", seconds: number | string, frequencyToken: "FREQ", frequency: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  role(callback?: Callback<unknown[]>): Result<unknown[], Context>;
  rpop(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  rpopBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  rpop(key: RedisKey, count: number | string, callback?: Callback<string[] | null>): Result<string[] | null, Context>;
  rpopBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[] | null>): Result<Buffer[] | null, Context>;
  rpoplpush(source: RedisKey, destination: RedisKey, callback?: Callback<string>): Result<string, Context>;
  rpoplpushBuffer(source: RedisKey, destination: RedisKey, callback?: Callback<Buffer>): Result<Buffer, Context>;
  rpush(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  rpush(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[]
  ]): Result<number, Context>;
  rpushx(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  rpushx(...args: [
    key: RedisKey,
    ...elements: (string | Buffer | number)[]
  ]): Result<number, Context>;
  sadd(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sadd(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sadd(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  sadd(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  save(callback?: Callback<"OK">): Result<"OK", Context>;
  scan(cursor: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, countToken: "COUNT", count: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, countToken: "COUNT", count: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, patternToken: "MATCH", pattern: string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, patternToken: "MATCH", pattern: string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scan(cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  scanBuffer(cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, typeToken: "TYPE", type: string | Buffer, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  scard(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  script(subcommand: "DEBUG", yes: "YES", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "DEBUG", sync: "SYNC", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "DEBUG", no: "NO", callback?: Callback<unknown>): Result<unknown, Context>;
  script(...args: [
    subcommand: "EXISTS",
    ...sha1s: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  script(...args: [
    subcommand: "EXISTS",
    ...sha1s: (string | Buffer)[]
  ]): Result<unknown, Context>;
  script(subcommand: "FLUSH", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "FLUSH", async: "ASYNC", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "FLUSH", sync: "SYNC", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "KILL", callback?: Callback<unknown>): Result<unknown, Context>;
  script(subcommand: "LOAD", script: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  sdiff(...args: [
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sdiffBuffer(...args: [
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sdiff(...args: [
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sdiffBuffer(...args: [
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sdiff(...args: [
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  sdiffBuffer(...args: [
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sdiff(...args: [
    keys: RedisKey[]
  ]): Result<string[], Context>;
  sdiffBuffer(...args: [
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sdiffstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sdiffstore(...args: [
    destination: RedisKey,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sdiffstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  sdiffstore(...args: [
    destination: RedisKey,
    keys: RedisKey[]
  ]): Result<number, Context>;
  select(index: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, secondsToken: "EX", seconds: number | string, xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, millisecondsToken: "PX", milliseconds: number | string, xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeSecondsToken: "EXAT", unixTimeSeconds: number | string, xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, unixTimeMillisecondsToken: "PXAT", unixTimeMilliseconds: number | string, xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", callback?: Callback<"OK">): Result<"OK", Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", nx: "NX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", nx: "NX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", nx: "NX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", xx: "XX", callback?: Callback<"OK" | null>): Result<"OK" | null, Context>;
  set(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", xx: "XX", get: "GET", callback?: Callback<string | null>): Result<string | null, Context>;
  setBuffer(key: RedisKey, value: string | Buffer | number, keepttl: "KEEPTTL", xx: "XX", get: "GET", callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  setbit(key: RedisKey, offset: number | string, value: number | string, callback?: Callback<number>): Result<number, Context>;
  setex(key: RedisKey, seconds: number | string, value: string | Buffer | number, callback?: Callback<"OK">): Result<"OK", Context>;
  setnx(key: RedisKey, value: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  setrange(key: RedisKey, offset: number | string, value: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  shutdown(callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(now: "NOW", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(now: "NOW", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(now: "NOW", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(now: "NOW", force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", now: "NOW", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", now: "NOW", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", now: "NOW", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(nosave: "NOSAVE", now: "NOW", force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", now: "NOW", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", now: "NOW", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", now: "NOW", force: "FORCE", callback?: Callback<"OK">): Result<"OK", Context>;
  shutdown(save: "SAVE", now: "NOW", force: "FORCE", abort: "ABORT", callback?: Callback<"OK">): Result<"OK", Context>;
  sinter(...args: [
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sinterBuffer(...args: [
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sinter(...args: [
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sinterBuffer(...args: [
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sinter(...args: [
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  sinterBuffer(...args: [
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sinter(...args: [
    keys: RedisKey[]
  ]): Result<string[], Context>;
  sinterBuffer(...args: [
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string
  ]): Result<number, Context>;
  sintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string
  ]): Result<number, Context>;
  sinterstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sinterstore(...args: [
    destination: RedisKey,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sinterstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  sinterstore(...args: [
    destination: RedisKey,
    keys: RedisKey[]
  ]): Result<number, Context>;
  sismember(key: RedisKey, member: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  slaveof(host: string | Buffer, port: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  slowlog(subcommand: "GET", callback?: Callback<unknown>): Result<unknown, Context>;
  slowlog(subcommand: "GET", count: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  slowlog(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  slowlog(subcommand: "LEN", callback?: Callback<unknown>): Result<unknown, Context>;
  slowlog(subcommand: "RESET", callback?: Callback<unknown>): Result<unknown, Context>;
  smembers(key: RedisKey, callback?: Callback<string[]>): Result<string[], Context>;
  smembersBuffer(key: RedisKey, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  smismember(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  smismember(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<number[]>
  ]): Result<number[], Context>;
  smismember(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<number[], Context>;
  smismember(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<number[], Context>;
  smove(source: RedisKey, destination: RedisKey, member: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  sort(...args: [
    key: RedisKey,
    ...args: RedisValue[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort(...args: [
    key: RedisKey,
    ...args: RedisValue[]
  ]): Result<unknown, Context>;
  sort_ro(key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, asc: "ASC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, asc: "ASC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, desc: "DESC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, desc: "DESC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[]
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, asc: "ASC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, asc: "ASC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, desc: "DESC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, offsetCountToken: "LIMIT", offset: number | string, count: number | string, desc: "DESC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[]
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    asc: "ASC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken: "GET",
    ...patterns: string[],
    desc: "DESC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, asc: "ASC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, asc: "ASC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, desc: "DESC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, desc: "DESC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[]
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, asc: "ASC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, asc: "ASC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, desc: "DESC", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(key: RedisKey, patternToken: "BY", pattern: string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, desc: "DESC", alpha: "ALPHA", callback?: Callback<unknown>): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[]
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    asc: "ASC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC"
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    alpha: "ALPHA",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sort_ro(...args: [
    key: RedisKey,
    patternToken: "BY",
    pattern: string,
    offsetCountToken: "LIMIT",
    offset: number | string,
    count: number | string,
    patternToken1: "GET",
    ...pattern1s: string[],
    desc: "DESC",
    alpha: "ALPHA"
  ]): Result<unknown, Context>;
  spop(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  spopBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  spop(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  spopBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  spublish(shardchannel: string | Buffer, message: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  srandmember(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  srandmemberBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  srandmember(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  srandmemberBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  srem(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  srem(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  srem(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  srem(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  sscan(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  sscanBuffer(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  sscan(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  sscanBuffer(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  sscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  sscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  sscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  sscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  ssubscribe(...args: [
    ...shardchannels: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  ssubscribe(...args: [
    ...shardchannels: (string | Buffer)[]
  ]): Result<unknown, Context>;
  strlen(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  subscribe(...args: [
    ...channels: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  subscribe(...args: [
    ...channels: (string | Buffer)[]
  ]): Result<unknown, Context>;
  substr(key: RedisKey, start: number | string, end: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  sunion(...args: [
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sunionBuffer(...args: [
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sunion(...args: [
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  sunionBuffer(...args: [
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  sunion(...args: [
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  sunionBuffer(...args: [
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sunion(...args: [
    keys: RedisKey[]
  ]): Result<string[], Context>;
  sunionBuffer(...args: [
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  sunionstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sunionstore(...args: [
    destination: RedisKey,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  sunionstore(...args: [
    destination: RedisKey,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  sunionstore(...args: [
    destination: RedisKey,
    keys: RedisKey[]
  ]): Result<number, Context>;
  sunsubscribe(callback?: Callback<unknown>): Result<unknown, Context>;
  sunsubscribe(...args: [
    ...shardchannels: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  sunsubscribe(...args: [
    ...shardchannels: (string | Buffer)[]
  ]): Result<unknown, Context>;
  swapdb(index1: number | string, index2: number | string, callback?: Callback<"OK">): Result<"OK", Context>;
  sync(callback?: Callback<unknown>): Result<unknown, Context>;
  time(callback?: Callback<number[]>): Result<number[], Context>;
  touch(...args: [
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  touch(...args: [
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  touch(...args: [
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  touch(...args: [
    keys: RedisKey[]
  ]): Result<number, Context>;
  ttl(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  type(key: RedisKey, callback?: Callback<string>): Result<string, Context>;
  unlink(...args: [
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  unlink(...args: [
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  unlink(...args: [
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  unlink(...args: [
    keys: RedisKey[]
  ]): Result<number, Context>;
  unsubscribe(callback?: Callback<unknown>): Result<unknown, Context>;
  unsubscribe(...args: [
    ...channels: (string | Buffer)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  unsubscribe(...args: [
    ...channels: (string | Buffer)[]
  ]): Result<unknown, Context>;
  unwatch(callback?: Callback<"OK">): Result<"OK", Context>;
  vadd(...args: [
    key: RedisKey,
    ...args: (RedisValue)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  vadd(...args: [
    key: RedisKey,
    ...args: (RedisValue)[]
  ]): Result<number, Context>;
  vcard(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  vdim(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  vemb(key: RedisKey, element: string | Buffer | number, callback?: Callback<string[] | null>): Result<string[] | null, Context>;
  vembBuffer(key: RedisKey, element: string | Buffer | number, callback?: Callback<Buffer[] | null>): Result<Buffer[] | null, Context>;
  vemb(key: RedisKey, element: string | Buffer | number, raw: 'RAW', callback?: Callback<string[] | null>): Result<string[] | null, Context>;
  vembBuffer(key: RedisKey, element: string | Buffer | number, raw: 'RAW', callback?: Callback<Buffer[] | null>): Result<Buffer[] | null, Context>;
  vgetattr(key: RedisKey, element: string | Buffer | number, callback?: Callback<string | null>): Result<string | null, Context>;
  vgetattrBuffer(key: RedisKey, element: string | Buffer | number, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  vinfo(key: RedisKey, callback?: Callback<(string | number)[] | null>): Result<(string | number)[] | null, Context>;
  vinfoBuffer(key: RedisKey, callback?: Callback<(Buffer | number)[] | null>): Result<(Buffer | number)[] | null, Context>;
  vismember(key: RedisKey, element: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  vlinks(key: RedisKey, element: string | Buffer | number, callback?: Callback<string[][] | null>): Result<string[][] | null, Context>;
  vlinksBuffer(key: RedisKey, element: string | Buffer | number, callback?: Callback<Buffer[][] | null>): Result<Buffer[][] | null, Context>;
  vlinks(key: RedisKey, element: string | Buffer | number, withscores: 'WITHSCORES', callback?: Callback<string[][] | null>): Result<string[][] | null, Context>;
  vlinksBuffer(key: RedisKey, element: string | Buffer | number, withscores: 'WITHSCORES', callback?: Callback<Buffer[][] | null>): Result<Buffer[][] | null, Context>;
  vrandmember(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  vrandmemberBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  vrandmember(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  vrandmemberBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  vrange(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, callback?: Callback<string[]>): Result<string[], Context>;
  vrangeBuffer(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  vrange(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  vrangeBuffer(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  vrem(key: RedisKey, element: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  vsetattr(key: RedisKey, element: string | Buffer | number, json: string | Buffer, callback?: Callback<number>): Result<number, Context>;
  vsim(...args: [
    key: RedisKey,
    ...args: (RedisValue)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  vsimBuffer(...args: [
    key: RedisKey,
    ...args: (RedisValue)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  vsim(...args: [
    key: RedisKey,
    ...args: (RedisValue)[]
  ]): Result<(string | null)[], Context>;
  vsimBuffer(...args: [
    key: RedisKey,
    ...args: (RedisValue)[]
  ]): Result<(Buffer | null)[], Context>;
  wait(numreplicas: number | string, timeout: number | string, callback?: Callback<number>): Result<number, Context>;
  watch(...args: [
    ...keys: RedisKey[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  watch(...args: [
    keys: RedisKey[],
    callback: Callback<"OK">
  ]): Result<"OK", Context>;
  watch(...args: [
    ...keys: RedisKey[]
  ]): Result<"OK", Context>;
  watch(...args: [
    keys: RedisKey[]
  ]): Result<"OK", Context>;
  xack(...args: [
    key: RedisKey,
    group: string | Buffer,
    ...ids: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  xack(...args: [
    key: RedisKey,
    group: string | Buffer,
    ...ids: (string | Buffer | number)[]
  ]): Result<number, Context>;
  xadd(...args: [
    key: RedisKey,
    ...args: RedisValue[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  xaddBuffer(...args: [
    key: RedisKey,
    ...args: RedisValue[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  xadd(...args: [
    key: RedisKey,
    ...args: RedisValue[]
  ]): Result<string | null, Context>;
  xaddBuffer(...args: [
    key: RedisKey,
    ...args: RedisValue[]
  ]): Result<Buffer | null, Context>;
  xautoclaim(key: RedisKey, group: string | Buffer, consumer: string | Buffer, minIdleTime: string | Buffer | number, start: string | Buffer | number, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xautoclaim(key: RedisKey, group: string | Buffer, consumer: string | Buffer, minIdleTime: string | Buffer | number, start: string | Buffer | number, justid: "JUSTID", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xautoclaim(key: RedisKey, group: string | Buffer, consumer: string | Buffer, minIdleTime: string | Buffer | number, start: string | Buffer | number, countToken: "COUNT", count: number | string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xautoclaim(key: RedisKey, group: string | Buffer, consumer: string | Buffer, minIdleTime: string | Buffer | number, start: string | Buffer | number, countToken: "COUNT", count: number | string, justid: "JUSTID", callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[]
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE"
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID",
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xclaim(...args: [
    key: RedisKey,
    group: string | Buffer,
    consumer: string | Buffer,
    minIdleTime: string | Buffer | number,
    ...ids: (string | Buffer | number)[],
    msToken: "IDLE",
    ms: number | string,
    unixTimeMillisecondsToken: "TIME",
    unixTimeMilliseconds: number | string,
    countToken: "RETRYCOUNT",
    count: number | string,
    force: "FORCE",
    justid: "JUSTID"
  ]): Result<unknown[], Context>;
  xdel(...args: [
    key: RedisKey,
    ...ids: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  xdel(...args: [
    key: RedisKey,
    ...ids: (string | Buffer | number)[]
  ]): Result<number, Context>;
  xdelex(...args: [
    key: RedisKey,
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    keepref: "KEEPREF",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    keepref: "KEEPREF",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    delref: "DELREF",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    delref: "DELREF",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    acked: "ACKED",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  xdelex(...args: [
    key: RedisKey,
    acked: "ACKED",
    idsToken: "IDS",
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, mkstream: "MKSTREAM", callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, mkstream: "MKSTREAM", entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, newId: "$", callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, newId: "$", entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, newId: "$", mkstream: "MKSTREAM", callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATE", key: RedisKey, groupname: string | Buffer, newId: "$", mkstream: "MKSTREAM", entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "CREATECONSUMER", key: RedisKey, groupname: string | Buffer, consumername: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "DELCONSUMER", key: RedisKey, groupname: string | Buffer, consumername: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "DESTROY", key: RedisKey, groupname: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "SETID", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "SETID", key: RedisKey, groupname: string | Buffer, id: string | Buffer | number, entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "SETID", key: RedisKey, groupname: string | Buffer, newId: "$", callback?: Callback<unknown>): Result<unknown, Context>;
  xgroup(subcommand: "SETID", key: RedisKey, groupname: string | Buffer, newId: "$", entriesReadToken: "ENTRIESREAD", entriesRead: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "CONSUMERS", key: RedisKey, groupname: string | Buffer, callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "GROUPS", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "HELP", callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "STREAM", key: RedisKey, callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "STREAM", key: RedisKey, fullToken: "FULL", callback?: Callback<unknown>): Result<unknown, Context>;
  xinfo(subcommand: "STREAM", key: RedisKey, fullToken: "FULL", countToken: "COUNT", count: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xlen(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE'
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    silent: 'SILENT',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE'
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE'
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fail: 'FAIL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE'
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[]
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    force: 'FORCE'
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE',
    callback: Callback<number>
  ]): Result<number, Context>;
  xnack(...args: [
    key: RedisKey,
    group: string | Buffer,
    fatal: 'FATAL',
    idsToken: 'IDS',
    numids: number | string,
    ...ids: (string | Buffer | number)[],
    countToken: 'RETRYCOUNT',
    count: number | string,
    force: 'FORCE'
  ]): Result<number, Context>;
  xpending(key: RedisKey, group: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xpending(key: RedisKey, group: string | Buffer, start: string | Buffer | number, end: string | Buffer | number, count: number | string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xpending(key: RedisKey, group: string | Buffer, start: string | Buffer | number, end: string | Buffer | number, count: number | string, consumer: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xpending(key: RedisKey, group: string | Buffer, minIdleTimeToken: "IDLE", minIdleTime: number | string, start: string | Buffer | number, end: string | Buffer | number, count: number | string, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xpending(key: RedisKey, group: string | Buffer, minIdleTimeToken: "IDLE", minIdleTime: number | string, start: string | Buffer | number, end: string | Buffer | number, count: number | string, consumer: string | Buffer, callback?: Callback<unknown[]>): Result<unknown[], Context>;
  xrange(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, callback?: Callback<[
    id: string,
    fields: string[]
  ][]>): Result<[
    id: string,
    fields: string[]
  ][], Context>;
  xrangeBuffer(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, callback?: Callback<[
    id: Buffer,
    fields: Buffer[]
  ][]>): Result<[
    id: Buffer,
    fields: Buffer[]
  ][], Context>;
  xrange(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, countToken: "COUNT", count: number | string, callback?: Callback<[
    id: string,
    fields: string[]
  ][]>): Result<[
    id: string,
    fields: string[]
  ][], Context>;
  xrangeBuffer(key: RedisKey, start: string | Buffer | number, end: string | Buffer | number, countToken: "COUNT", count: number | string, callback?: Callback<[
    id: Buffer,
    fields: Buffer[]
  ][]>): Result<[
    id: Buffer,
    fields: Buffer[]
  ][], Context>;
  xread(...args: [
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: string,
      items: [
        id: string,
        fields: string[]
      ][]
    ][] | null>
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: Buffer,
      items: [
        id: Buffer,
        fields: Buffer[]
      ][]
    ][] | null>
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: string,
      items: [
        id: string,
        fields: string[]
      ][]
    ][] | null>
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: Buffer,
      items: [
        id: Buffer,
        fields: Buffer[]
      ][]
    ][] | null>
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: string,
      items: [
        id: string,
        fields: string[]
      ][]
    ][] | null>
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: Buffer,
      items: [
        id: Buffer,
        fields: Buffer[]
      ][]
    ][] | null>
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: string,
      items: [
        id: string,
        fields: string[]
      ][]
    ][] | null>
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<[
      key: Buffer,
      items: [
        id: Buffer,
        fields: Buffer[]
      ][]
    ][] | null>
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xread(...args: [
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: string,
    items: [
      id: string,
      fields: string[]
    ][]
  ][] | null, Context>;
  xreadBuffer(...args: [
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<[
    key: Buffer,
    items: [
      id: Buffer,
      fields: Buffer[]
    ][]
  ][] | null, Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[],
    callback: Callback<unknown[]>
  ]): Result<unknown[], Context>;
  xreadgroup(...args: [
    groupConsumerToken: "GROUP",
    group: string | Buffer,
    consumer: string | Buffer,
    countToken: "COUNT",
    count: number | string,
    millisecondsToken: "BLOCK",
    milliseconds: number | string,
    noack: "NOACK",
    streamsToken: "STREAMS",
    ...args: RedisValue[]
  ]): Result<unknown[], Context>;
  xrevrange(key: RedisKey, end: string | Buffer | number, start: string | Buffer | number, callback?: Callback<[
    id: string,
    fields: string[]
  ][]>): Result<[
    id: string,
    fields: string[]
  ][], Context>;
  xrevrangeBuffer(key: RedisKey, end: string | Buffer | number, start: string | Buffer | number, callback?: Callback<[
    id: Buffer,
    fields: Buffer[]
  ][]>): Result<[
    id: Buffer,
    fields: Buffer[]
  ][], Context>;
  xrevrange(key: RedisKey, end: string | Buffer | number, start: string | Buffer | number, countToken: "COUNT", count: number | string, callback?: Callback<[
    id: string,
    fields: string[]
  ][]>): Result<[
    id: string,
    fields: string[]
  ][], Context>;
  xrevrangeBuffer(key: RedisKey, end: string | Buffer | number, start: string | Buffer | number, countToken: "COUNT", count: number | string, callback?: Callback<[
    id: Buffer,
    fields: Buffer[]
  ][]>): Result<[
    id: Buffer,
    fields: Buffer[]
  ][], Context>;
  xsetid(key: RedisKey, lastId: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  xsetid(key: RedisKey, lastId: string | Buffer | number, maxDeletedEntryIdToken: "MAXDELETEDID", maxDeletedEntryId: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  xsetid(key: RedisKey, lastId: string | Buffer | number, entriesAddedToken: "ENTRIESADDED", entriesAdded: number | string, callback?: Callback<unknown>): Result<unknown, Context>;
  xsetid(key: RedisKey, lastId: string | Buffer | number, entriesAddedToken: "ENTRIESADDED", entriesAdded: number | string, maxDeletedEntryIdToken: "MAXDELETEDID", maxDeletedEntryId: string | Buffer | number, callback?: Callback<unknown>): Result<unknown, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, maxlen: "MAXLEN", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", equal: "=", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, keepref: "KEEPREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, delref: "DELREF", callback?: Callback<number>): Result<number, Context>;
  xtrim(key: RedisKey, minid: "MINID", approximately: "~", threshold: string | Buffer | number, countToken: "LIMIT", count: number | string, acked: "ACKED", callback?: Callback<number>): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string>
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer>
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    nx: "NX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    gt: "GT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<string | null>
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[],
    callback: Callback<Buffer | null>
  ]): Result<Buffer | null, Context>;
  zadd(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<string | null, Context>;
  zaddBuffer(...args: [
    key: RedisKey,
    xx: "XX",
    lt: "LT",
    ch: "CH",
    incr: "INCR",
    ...scoreMembers: (string | Buffer | number)[]
  ]): Result<Buffer | null, Context>;
  zcard(key: RedisKey, callback?: Callback<number>): Result<number, Context>;
  zcount(key: RedisKey, min: number | string, max: number | string, callback?: Callback<number>): Result<number, Context>;
  zdiff(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zdiff(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zdiffBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zdiffstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zdiffstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zdiffstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  zdiffstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<number, Context>;
  zincrby(key: RedisKey, increment: number | string, member: string | Buffer | number, callback?: Callback<string>): Result<string, Context>;
  zincrbyBuffer(key: RedisKey, increment: number | string, member: string | Buffer | number, callback?: Callback<Buffer>): Result<Buffer, Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zinter(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zinterBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string,
    callback: Callback<number>
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string
  ]): Result<number, Context>;
  zintercard(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    limitToken: "LIMIT",
    limit: number | string
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zinterstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
  zlexcount(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN"
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN"
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    min: "MIN",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX"
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX"
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string,
    callback: Callback<unknown>
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  zmpop(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    max: "MAX",
    countToken: "COUNT",
    count: number | string
  ]): Result<unknown, Context>;
  zmscore(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  zmscoreBuffer(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  zmscore(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<(string | null)[]>
  ]): Result<(string | null)[], Context>;
  zmscoreBuffer(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<(Buffer | null)[]>
  ]): Result<(Buffer | null)[], Context>;
  zmscore(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<(string | null)[], Context>;
  zmscoreBuffer(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<(Buffer | null)[], Context>;
  zmscore(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<(string | null)[], Context>;
  zmscoreBuffer(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<(Buffer | null)[], Context>;
  zpopmax(key: RedisKey, callback?: Callback<string[]>): Result<string[], Context>;
  zpopmaxBuffer(key: RedisKey, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zpopmax(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zpopmaxBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zpopmin(key: RedisKey, callback?: Callback<string[]>): Result<string[], Context>;
  zpopminBuffer(key: RedisKey, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zpopmin(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zpopminBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrandmember(key: RedisKey, callback?: Callback<string | null>): Result<string | null, Context>;
  zrandmemberBuffer(key: RedisKey, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  zrandmember(key: RedisKey, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrandmemberBuffer(key: RedisKey, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrandmember(key: RedisKey, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrandmemberBuffer(key: RedisKey, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrange(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangeBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebylex(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<string[]>): Result<string[], Context>;
  zrangebylexBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebylex(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangebylexBuffer(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebyscore(key: RedisKey, min: number | string, max: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangebyscoreBuffer(key: RedisKey, min: number | string, max: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebyscore(key: RedisKey, min: number | string, max: number | string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangebyscoreBuffer(key: RedisKey, min: number | string, max: number | string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebyscore(key: RedisKey, min: number | string, max: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrangebyscoreBuffer(key: RedisKey, min: number | string, max: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangebyscore(key: RedisKey, min: number | string, max: number | string, withscores: "WITHSCORES", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrangebyscoreBuffer(key: RedisKey, min: number | string, max: number | string, withscores: "WITHSCORES", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, byscore: "BYSCORE", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", callback?: Callback<number>): Result<number, Context>;
  zrangestore(dst: RedisKey, src: RedisKey, min: string | Buffer | number, max: string | Buffer | number, bylex: "BYLEX", rev: "REV", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<number>): Result<number, Context>;
  zrank(key: RedisKey, member: string | Buffer | number, callback?: Callback<number | null>): Result<number | null, Context>;
  zrem(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zrem(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zrem(...args: [
    key: RedisKey,
    ...members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zrem(...args: [
    key: RedisKey,
    members: (string | Buffer | number)[]
  ]): Result<number, Context>;
  zremrangebylex(key: RedisKey, min: string | Buffer | number, max: string | Buffer | number, callback?: Callback<number>): Result<number, Context>;
  zremrangebyrank(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<number>): Result<number, Context>;
  zremrangebyscore(key: RedisKey, min: number | string, max: number | string, callback?: Callback<number>): Result<number, Context>;
  zrevrange(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangeBuffer(key: RedisKey, start: number | string, stop: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrange(key: RedisKey, start: number | string, stop: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangeBuffer(key: RedisKey, start: number | string, stop: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebylex(key: RedisKey, max: string | Buffer | number, min: string | Buffer | number, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebylexBuffer(key: RedisKey, max: string | Buffer | number, min: string | Buffer | number, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebylex(key: RedisKey, max: string | Buffer | number, min: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebylexBuffer(key: RedisKey, max: string | Buffer | number, min: string | Buffer | number, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebyscore(key: RedisKey, max: number | string, min: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebyscoreBuffer(key: RedisKey, max: number | string, min: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebyscore(key: RedisKey, max: number | string, min: number | string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebyscoreBuffer(key: RedisKey, max: number | string, min: number | string, offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebyscore(key: RedisKey, max: number | string, min: number | string, withscores: "WITHSCORES", callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebyscoreBuffer(key: RedisKey, max: number | string, min: number | string, withscores: "WITHSCORES", callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrangebyscore(key: RedisKey, max: number | string, min: number | string, withscores: "WITHSCORES", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<string[]>): Result<string[], Context>;
  zrevrangebyscoreBuffer(key: RedisKey, max: number | string, min: number | string, withscores: "WITHSCORES", offsetCountToken: "LIMIT", offset: number | string, count: number | string, callback?: Callback<Buffer[]>): Result<Buffer[], Context>;
  zrevrank(key: RedisKey, member: string | Buffer | number, callback?: Callback<number | null>): Result<number | null, Context>;
  zscan(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  zscanBuffer(key: RedisKey, cursor: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  zscan(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  zscanBuffer(key: RedisKey, cursor: number | string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  zscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  zscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  zscan(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: string,
    elements: string[]
  ]>): Result<[
    cursor: string,
    elements: string[]
  ], Context>;
  zscanBuffer(key: RedisKey, cursor: number | string, patternToken: "MATCH", pattern: string, countToken: "COUNT", count: number | string, callback?: Callback<[
    cursor: Buffer,
    elements: Buffer[]
  ]>): Result<[
    cursor: Buffer,
    elements: Buffer[]
  ], Context>;
  zscore(key: RedisKey, member: string | Buffer | number, callback?: Callback<string | null>): Result<string | null, Context>;
  zscoreBuffer(key: RedisKey, member: string | Buffer | number, callback?: Callback<Buffer | null>): Result<Buffer | null, Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<string[]>
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES",
    callback: Callback<Buffer[]>
  ]): Result<Buffer[], Context>;
  zunion(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<string[], Context>;
  zunionBuffer(...args: [
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    withscores: "WITHSCORES"
  ]): Result<Buffer[], Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[]
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[]
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    keys: RedisKey[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[]
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    sum: "SUM"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    min: "MIN"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    max: "MAX"
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT",
    callback: Callback<number>
  ]): Result<number, Context>;
  zunionstore(...args: [
    destination: RedisKey,
    numkeys: number | string,
    ...args: RedisValue[],
    aggregate: "AGGREGATE",
    count: "COUNT"
  ]): Result<number, Context>;
}

declare type RedisKey = string | Buffer;

interface RedisLikeClient {
  setNX(key: string, value: string, ttlSec: number): Promise<boolean>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  get(key: string): Promise<string | null>;
  expire(key: string, ttlSec: number): Promise<void>;
  exists(key: string): Promise<boolean>;
  del(keys: string[]): Promise<void>;
  xAdd(key: string, fields: Record<string, string | Uint8Array>): Promise<string>;
  xRange(key: string, start: string, end: string): Promise<Array<{
    id: string;
    fields: Record<string, string | Uint8Array>;
  }>>;
  pipeline(commands: readonly PipelineCommand[]): Promise<void>;
}

declare type RedisOptions = CommonRedisOptions & SentinelConnectionOptions & StandaloneConnectionOptions;

type RedisResumableStreamStoreOptions = {
  readonly keyPrefix?: string;
  readonly defaultTtlMs?: number;
  readonly pollIntervalMs?: number;
  readonly maxChunkBytes?: number;
};

declare type RedisStatus = "close" | "connect" | "connecting" | "end" | "ready" | "reconnecting" | "wait";

declare type RedisValue = string | Buffer | number;

declare type ReplyTransformer = (reply: any) => any;

interface Respondable {
  name: string;
  args: CommandParameter[];
  resolve(result: any): void;
  reject(error: Error): void;
}

declare type Result<T, Context extends ClientContext> = ResultTypes<T, Context>[Context["type"]];

interface ResultTypes<Result, Context> {
  default: Promise<Result>;
  pipeline: ChainableCommander;
}

type ResumableStreamAcquireOptions = {
  readonly ttlMs?: number;
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

type ResumableStreamRole = "consumer" | "producer";

type ResumableStreamStatus = "done" | "error" | "missing" | "streaming";

interface ResumableStreamStore {
  acquire(streamId: string, options?: ResumableStreamAcquireOptions): Promise<ResumableStreamRole>;
  append(streamId: string, chunk: Uint8Array): Promise<void>;
  finalize(streamId: string, status: "done" | "error", error?: string): Promise<void>;
  read(streamId: string, cursor: string, signal: AbortSignal): AsyncIterable<ResumableStreamEntry>;
  status(streamId: string): Promise<ResumableStreamStatus>;
  delete(streamId: string): Promise<void>;
}

declare type RetryStrategy = ((times: number) => number | void | null) | null | undefined;

declare class ScanStream extends Readable {
  private opt;
  private _redisCursor;
  private _redisDrained;
  constructor(opt: Options);
  _read(): void;
  close(): void;
}

interface ScanStreamOptions {
  match?: string;
  type?: string;
  count?: number;
  noValues?: boolean;
}

interface SentinelAddress {
  port: number;
  host: string;
  family?: number;
}

interface SentinelConnectionOptions {
  name?: string | undefined;
  role?: "master" | "slave" | undefined;
  tls?: ConnectionOptions | undefined;
  sentinelUsername?: string | undefined;
  sentinelPassword?: string | undefined;
  sentinels?: Array<Partial<SentinelAddress>> | undefined;
  sentinelRetryStrategy?: ((retryAttempts: number) => number | void | null) | undefined;
  sentinelReconnectStrategy?: ((retryAttempts: number) => number | void | null) | undefined;
  preferredSlaves?: PreferredSlaves | undefined;
  connectTimeout?: number | undefined;
  disconnectTimeout?: number | undefined;
  sentinelCommandTimeout?: number | undefined;
  enableTLSForSentinelMode?: boolean | undefined;
  sentinelTLS?: ConnectionOptions | undefined;
  natMap?: NatMap | undefined;
  updateSentinels?: boolean | undefined;
  sentinelMaxConnections?: number | undefined;
  failoverDetector?: boolean | undefined;
}

type SourcePart = {
  type: "source";
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
  parentId?: string;
};

declare type StandaloneConnectionOptions = Partial<TcpOptions & IpcOptions> & {
  disconnectTimeout?: number | undefined;
  tls?: ConnectionOptions | undefined;
};

declare class SubscriptionSet {
  private set;
  add(set: AddSet, channel: string): void;
  del(set: DelSet, channel: string): void;
  channels(set: AddSet | DelSet): string[];
  isEmpty(): boolean;
}

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

declare type TcpOptions = Pick<TcpNetConnectOpts, "family" | "host" | "port">;

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
  state: "result";
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

interface Transaction {
  pipeline(commands?: unknown[][]): ChainableCommander;
  multi(options: {
    pipeline: false;
  }): Promise<"OK">;
  multi(): ChainableCommander;
  multi(options: {
    pipeline: true;
  }): ChainableCommander;
  multi(commands?: unknown[][]): ChainableCommander;
}

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
  messageId?: string;
  messageMetadata?: ReadonlyJSONValue;
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
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
} | {
  type: "file";
  url: string;
  mediaType: string;
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
  messages?: ReadonlyJSONValue;
} | {
  type: "start-step";
  messageId?: string;
} | {
  type: "finish-step";
  finishReason?: FinishReason;
  usage?: Usage;
  isContinued?: boolean;
} | {
  type: "finish";
  finishReason?: FinishReason;
  usage?: Usage;
  messageMetadata?: ReadonlyJSONValue;
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

declare type WriteableStream = NetStream | PipelineWriteableStream;

declare function asAsyncIterableStream<T>(source: ReadableStream<T>): AsyncIterableStream<T>;

declare function createAssistantStream(callback: (controller: AssistantStreamController) => PromiseLike<void> | void): AssistantStream;

declare function createAssistantStreamController(): readonly [
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

declare const createObjectStream: (_param2: CreateObjectStreamOptions) => ReadableStream<ObjectStreamChunk>;

declare function createRedisResumableStreamStore(client: NodeRedisLike, options?: RedisResumableStreamStoreOptions): ResumableStreamStore;

declare function createResumableAssistantStreamResponse(options: CreateResumableAssistantStreamResponseOptions): Promise<Response>;

declare function createResumableStreamContext(options: ResumableStreamContextOptions): ResumableStreamContext;

declare function createResumeAssistantStreamResponse(options: CreateResumeAssistantStreamResponseOptions): Promise<Response>;

declare const fromObjectStreamResponse: (response: Response) => ReadableStream<ObjectStreamChunk>;

declare const getPartialJsonObjectFieldState: (obj: Record<string, unknown>, fieldPath: (string | number)[]) => FieldState;

declare const getPartialJsonObjectMeta: (obj: Record<symbol, unknown>) => PartialJsonObjectMeta | undefined;

declare namespace entry_resumable_exports {
  export { CreateResumableAssistantStreamResponseOptions, CreateResumeAssistantStreamResponseOptions, InMemoryResumableStreamStoreOptions, RESUMABLE_STREAM_ID_HEADER, RedisLikeClient, RedisResumableStreamStoreOptions, ResumableStreamAcquireOptions, ResumableStreamContext, ResumableStreamContextOptions, ResumableStreamEntry, ResumableStreamError, ResumableStreamErrorCode, ResumableStreamRole, ResumableStreamStatus, ResumableStreamStore, createInMemoryResumableStreamStore, createResumableAssistantStreamResponse, createResumableStreamContext, createResumeAssistantStreamResponse };
}

declare namespace entry_root_exports {
  export { AssistantMessage, AssistantMessageAccumulator, AssistantMessageStream, AssistantMessageTiming, AssistantStream, AssistantStreamChunk, AssistantStreamController, AssistantTransportDecoder, AssistantTransportEncoder, DataPart, DataStreamDecoder, DataStreamEncoder, GenericAssistantMessage, GenericFilePart, GenericMessage, GenericSystemMessage, GenericTextPart, GenericToolCallPart, GenericToolMessage, GenericToolResultPart, GenericUserMessage, McpServerConfig, ObjectStreamChunk, ObjectStreamResponse, PlainTextDecoder, PlainTextEncoder, ProviderOptions, TextStreamController, ToToolsJSONSchemaOptions, Tool, ToolCallReader, ToolCallStreamController, ToolCallTiming, ToolDeclaration, ToolExecutionStream, ToolJSONSchema, ToolModelContentPart, ToolModelOutputFunction, ToolResponse, ToolResponseLike, ToolResultStreamOptions, UIMessageStreamChunk, UIMessageStreamDataChunk, UIMessageStreamDecoder, UIMessageStreamDecoderOptions, createAssistantStream, createAssistantStreamController, createAssistantStreamResponse, createObjectStream, fromObjectStreamResponse, toGenericMessages, toJSONSchema, toPartialJSONSchema, toToolsJSONSchema, createInitialMessage as unstable_createInitialMessage, unstable_runPendingTools, toolResultStream as unstable_toolResultStream };
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
  export { AssistantMetaTransformStream, AssistantTransformStream, AsyncIterableStream, ReadonlyJSONArray, ReadonlyJSONObject, ReadonlyJSONValue, asAsyncIterableStream, getPartialJsonObjectFieldState, getPartialJsonObjectMeta, parsePartialJsonObject };
}

export { entry_resumable_exports as entry_resumable, entry_resumable_ioredis_exports as entry_resumable_ioredis, entry_resumable_redis_exports as entry_resumable_redis, entry_root_exports as entry_root, entry_utils_exports as entry_utils };
