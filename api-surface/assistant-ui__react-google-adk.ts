import { ComponentType, PropsWithChildren } from "react";

import { StandardSchemaV1 } from "@standard-schema/spec";

type AdkSdkEvent = {
  id?: string;
  invocationId?: string;
  author?: string;
  branch?: string;
  partial?: boolean;
  turnComplete?: boolean;
  interrupted?: boolean;
  finishReason?: string;
  timestamp?: number;
  content?: {
    role?: string;
    parts?: Array<Record<string, unknown>>;
  };
  actions?: Record<string, unknown>;
  longRunningToolIds?: string[];
  errorCode?: string;
  errorMessage?: string;
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
  customMetadata?: Record<string, unknown>;
};

type AdkEventStreamOptions = {
  onError?: (error: unknown) => void;
};

declare const adkEventStream: (events: AsyncGenerator<AdkSdkEvent, void, undefined>, options?: AdkEventStreamOptions) => Response;

type AdkRunner = {
  runAsync(options: Record<string, unknown>): AsyncGenerator<any, void, undefined>;
};

type CreateAdkApiRouteOptions = {
  runner: AdkRunner;
  userId: string | ((req: Request) => string | Promise<string>);
  sessionId: string | ((req: Request) => string | Promise<string>);
  onError?: AdkEventStreamOptions["onError"];
};

declare function createAdkApiRoute(options: CreateAdkApiRouteOptions): (req: Request) => Promise<Response>;

type PendingAttachmentStatus = {
  type: "running";
  reason: "uploading";
  progress: number;
} | {
  type: "requires-action";
  reason: "composer-send";
} | {
  type: "incomplete";
  reason: "error" | "upload-paused";
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type Attachment = PendingAttachment | CompleteAttachment;

type CreateAttachment = {
  id?: string;
  type?: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string;
  content: ThreadUserMessagePart[];
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type JSONSchema7TypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7Type = string | number | boolean | JSONSchema7Object | JSONSchema7Array | null;

interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

type JSONSchema7Version = string;

type JSONSchema7Definition = JSONSchema7 | boolean;

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

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type TupleIndex<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

type ObjectKey<T> = keyof T & (string | number);

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

type TypeAtPath<T, P extends readonly any[]> = P extends [
  infer Head,
  ...infer Rest
] ? Head extends keyof T ? TypeAtPath<T[Head], Rest> : never : T;

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type ToolResponseLike<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
};

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

interface ToolCallArgsReader<TArgs extends Record<string, unknown>> {
  get<PathT extends TypePath<TArgs>>(...fieldPath: PathT): Promise<TypeAtPath<TArgs, PathT>>;
  streamValues<PathT extends TypePath<TArgs>>(...fieldPath: PathT): AsyncIterableStream<DeepPartial<TypeAtPath<TArgs, PathT>>>;
  streamText<PathT extends TypePath<TArgs>>(...fieldPath: PathT): TypeAtPath<TArgs, PathT> extends string & (infer U) ? AsyncIterableStream<U> : never;
  forEach<PathT extends TypePath<TArgs>>(...fieldPath: PathT): NonNullable<TypeAtPath<TArgs, PathT>> extends Array<infer U> ? AsyncIterableStream<U> : never;
}

interface ToolCallResponseReader<TResult> {
  get: () => Promise<ToolResponse<TResult>>;
}

interface ToolCallReader<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  args: ToolCallArgsReader<TArgs>;
  response: ToolCallResponseReader<TResult>;
  result: {
    get: () => Promise<TResult>;
  };
}

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
};

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ProviderOptions = Record<string, Record<string, unknown>>;

type ToolDisplay = "inline" | "standalone";

type ToolBase<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = {
  streamCall?: ToolStreamCallFunction<TArgs, TResult>;
  display?: ToolDisplay;
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

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolWithoutType<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (Omit<FrontendTool<TArgs, TResult>, "type"> | Omit<BackendTool<TArgs, TResult>, "type"> | Omit<HumanTool<TArgs, TResult>, "type"> | Omit<ProviderTool<TArgs, TResult>, "type">) & {
  type?: undefined;
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

type AssistantStream = ReadableStream<AssistantStreamChunk>;

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

declare const AssistantStream: {
  toResponse(stream: AssistantStream, transformer: AssistantStreamEncoder): Response;
  fromResponse(response: Response, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
  toByteStream(stream: AssistantStream, transformer: ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk>): ReadableStream<Uint8Array<ArrayBuffer>>;
  fromByteStream(readable: ReadableStream<Uint8Array<ArrayBuffer>>, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
};

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly parentId?: string;
};

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly parentId?: string;
};

type SourceProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

type SourceMessagePart = {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
} | {
  readonly type: "source";
  readonly sourceType: "document";
  readonly id: string;
  readonly url?: undefined;
  readonly title: string;
  readonly mediaType: string;
  readonly filename?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
};

type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
};

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

type GenerativeUINode = string | {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly GenerativeUINode[];
  readonly key?: string;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
};

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolApprovalOptionKind = "allow-always" | "allow-once" | "reject-always" | "reject-once";

type ToolApprovalOption = {
  readonly id: string;
  readonly kind: ToolApprovalOptionKind | (string & {});
  readonly label?: string;
  readonly description?: string;
  readonly grants?: readonly string[];
  readonly confirm?: boolean | {
    title?: string;
    description?: string;
  };
};

type ToolApprovalResponse = {
  readonly approved: boolean;
  readonly reason?: string;
} | {
  readonly optionId: string;
  readonly reason?: string;
} | {
  readonly approved: boolean;
  readonly optionId: string;
  readonly reason?: string;
};

type ToolCallMessagePart<TArgs = ReadonlyJSONObject, TResult = unknown> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
  readonly argsText: string;
  readonly artifact?: unknown;
  readonly timing?: ToolCallTiming;
  readonly mcp?: ToolCallMessagePartMcpMetadata;
  readonly modelContent?: readonly ToolModelContentPart[] | undefined;
  readonly interrupt?: {
    type: "human";
    payload: unknown;
  };
  readonly approval?: {
    readonly id: string;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
    readonly options?: readonly ToolApprovalOption[];
    readonly optionId?: string;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
};

type ThreadUserMessagePart = TextMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | Unstable_AudioMessagePart;

type ThreadAssistantMessagePart = TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart | ImageMessagePart | DataMessagePart | GenerativeUIMessagePart;

type MessagePartStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
  readonly error?: unknown;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt";
} | MessagePartStatus;

type MessageStatus = {
  readonly type: "running";
} | {
  readonly type: "requires-action";
  readonly reason: "interrupt" | "tool-calls";
} | {
  readonly type: "complete";
  readonly reason: "stop" | "unknown";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other" | "tool-calls";
  readonly error?: ReadonlyJSONValue;
};

type MessageTiming = {
  readonly streamStartTime: number;
  readonly firstTokenTime?: number;
  readonly totalStreamTime?: number;
  readonly tokenCount?: number;
  readonly tokensPerSecond?: number;
  readonly totalChunks: number;
  readonly toolCallCount: number;
};

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | undefined;
};

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

type ThreadSystemMessage = MessageCommonProps & {
  readonly role: "system";
  readonly content: readonly [
    TextMessagePart
  ];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadUserMessage = MessageCommonProps & {
  readonly role: "user";
  readonly content: readonly ThreadUserMessagePart[];
  readonly attachments: readonly CompleteAttachment[];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadAssistantMessage = MessageCommonProps & {
  readonly role: "assistant";
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly status: MessageStatus;
  readonly metadata: {
    readonly unstable_state: ReadonlyJSONValue;
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly ThreadStep[];
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly custom: Record<string, unknown>;
  };
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[];
    readonly unstable_data?: readonly ReadonlyJSONValue[];
    readonly steps?: readonly ThreadStep[];
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type MessageRole = ThreadMessage["role"];

type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

type AppendMessage = Omit<ThreadMessage, "id"> & {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig | undefined;
  startRun?: boolean | undefined;
  steer?: boolean | undefined;
};

type AttachmentAdapter = {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
};

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "negative" | "positive";
};

type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};

type Unsubscribe = () => void;

declare namespace SpeechSynthesisAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "finished";
    error?: unknown;
  };
  type Utterance = {
    status: Status;
    cancel: () => void;
    subscribe: (callback: () => void) => Unsubscribe;
  };
}

type SpeechSynthesisAdapter = {
  speak: (text: string) => SpeechSynthesisAdapter.Utterance;
};

declare namespace DictationAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "stopped";
  };
  type Result = {
    transcript: string;
    isFinal?: boolean;
  };
  type Session = {
    status: Status;
    stop: () => Promise<void>;
    cancel: () => void;
    onSpeechStart: (callback: () => void) => Unsubscribe;
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe;
    onSpeech: (callback: (result: Result) => void) => Unsubscribe;
  };
}

type DictationAdapter = {
  listen: () => DictationAdapter.Session;
  disableInputDuringDictation?: boolean;
};

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare namespace RealtimeVoiceAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "finished";
    error?: unknown;
  };
  type Mode = "listening" | "speaking";
  type TranscriptItem = {
    role: "assistant" | "user";
    text: string;
    isFinal?: boolean;
  };
  type Session = {
    status: Status;
    isMuted: boolean;
    disconnect: () => void;
    mute: () => void;
    unmute: () => void;
    onStatusChange: (callback: (status: Status) => void) => Unsubscribe;
    onTranscript: (callback: (transcript: TranscriptItem) => void) => Unsubscribe;
    onModeChange: (callback: (mode: Mode) => void) => Unsubscribe;
    onVolumeChange: (callback: (volume: number) => void) => Unsubscribe;
  };
}

type RealtimeVoiceAdapter = {
  connect: (options: {
    abortSignal?: AbortSignal;
  }) => RealtimeVoiceAdapter.Session;
};

type LanguageModelV1CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  headers?: Record<string, string | undefined>;
};

type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  reasoningEffort?: string;
};

type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

type ModelContextProvider = {
  getModelContext: () => ModelContext;
  subscribe?: (callback: () => void) => Unsubscribe;
};

type ChatModelRunResult = {
  readonly content?: readonly ThreadAssistantMessagePart[] | undefined;
  readonly status?: MessageStatus | undefined;
  readonly metadata?: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  };
};

type ChatModelRunOptions = {
  readonly messages: readonly ThreadMessage[];
  readonly runConfig: RunConfig;
  readonly abortSignal: AbortSignal;
  readonly context: ModelContext;
  readonly unstable_assistantMessageId?: string | undefined;
  readonly unstable_threadId?: string | undefined;
  readonly unstable_parentId?: string | null | undefined;
  unstable_getMessage(): ThreadMessage;
};

type DataPrefixedPart = {
  readonly type: `data-${string}`;
  readonly data: any;
};

type ThreadMessageLike = {
  readonly role: "assistant" | "system" | "user";
  readonly content: string | readonly (TextMessagePart | ReasoningMessagePart | SourceMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | GenerativeUIMessagePart | Unstable_AudioMessagePart | DataPrefixedPart | {
    readonly type: "tool-call";
    readonly toolCallId?: string;
    readonly toolName: string;
    readonly args?: ReadonlyJSONObject;
    readonly argsText?: string;
    readonly artifact?: any;
    readonly result?: any | undefined;
    readonly isError?: boolean | undefined;
    readonly parentId?: string | undefined;
    readonly messages?: readonly ThreadMessage[] | undefined;
    readonly interrupt?: {
      type: "human";
      payload: unknown;
    };
    readonly timing?: ToolCallTiming;
    readonly approval?: {
      readonly id: string;
      readonly approved?: boolean;
      readonly reason?: string;
      readonly isAutomatic?: boolean;
      readonly options?: readonly ToolApprovalOption[];
      readonly optionId?: string;
      readonly resolution?: "cancelled" | "expired";
    };
  })[];
  readonly id?: string | undefined;
  readonly createdAt?: Date | undefined;
  readonly status?: MessageStatus | undefined;
  readonly attachments?: readonly (Omit<CompleteAttachment, "content"> & {
    readonly content: readonly (ThreadUserMessagePart | DataPrefixedPart)[];
  })[] | undefined;
  readonly metadata?: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly isOptimistic?: boolean | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  } | undefined;
};

type ExportedMessageRepository = {
  headId?: string | null;
  messages: Array<{
    message: ThreadMessage;
    parentId: string | null;
    runConfig?: RunConfig;
  }>;
};

declare const ExportedMessageRepository: {
  fromArray: (messages: readonly ThreadMessageLike[]) => ExportedMessageRepository;
  fromBranchableArray: (items: readonly {
    message: ThreadMessageLike;
    parentId: string | null;
  }[], options?: {
    headId?: string | null;
  }) => ExportedMessageRepository;
};

type QuoteInfo = {
  readonly text: string;
  readonly messageId: string;
};

type QueueItemState = {
  readonly id: string;
  readonly prompt: string;
};

type AttachmentAddErrorReason = "adapter-error" | "no-adapter" | "not-accepted";

type AttachmentAddErrorEvent = {
  readonly reason: AttachmentAddErrorReason;
  readonly message: string;
  readonly attachmentId?: string;
  readonly error?: Error;
};

type ComposerRuntimeEventPayload = {
  send: Record<string, never>;
  attachmentAdd: Record<string, never>;
  attachmentAddError: AttachmentAddErrorEvent;
};

type ComposerRuntimeEventType = keyof ComposerRuntimeEventPayload;

type ComposerRuntimeEventCallback<E extends ComposerRuntimeEventType> = (payload: ComposerRuntimeEventPayload[E]) => void;

type DictationState = {
  readonly status: DictationAdapter.Status;
  readonly transcript?: string;
  readonly inputDisabled?: boolean;
};

type SendOptions = {
  startRun?: boolean;
  steer?: boolean;
};

type RuntimeCapabilities = {
  readonly switchToBranch: boolean;
  readonly switchBranchDuringRun: boolean;
  readonly edit: boolean;
  readonly reload: boolean;
  readonly delete: boolean;
  readonly cancel: boolean;
  readonly unstable_copy: boolean;
  readonly speech: boolean;
  readonly dictation: boolean;
  readonly voice: boolean;
  readonly attachments: boolean;
  readonly feedback: boolean;
  readonly queue: boolean;
};

type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError: boolean;
  artifact?: ReadonlyJSONValue | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
};

type RespondToToolApprovalOptions = {
  approvalId: string;
  approved: boolean;
  optionId?: string;
  reason?: string;
};

type ThreadSuggestion = {
  prompt: string;
};

type SpeechState = {
  readonly messageId: string;
  readonly status: SpeechSynthesisAdapter.Status;
};

type VoiceSessionState = {
  readonly status: RealtimeVoiceAdapter.Status;
  readonly isMuted: boolean;
  readonly mode: RealtimeVoiceAdapter.Mode;
};

type ThreadRuntimeEventPayload = {
  runStart: Record<string, never>;
  runEnd: Record<string, never>;
  initialize: Record<string, never>;
  modelContextUpdate: Record<string, never>;
};

type ThreadRuntimeEventType = keyof ThreadRuntimeEventPayload;

type ThreadRuntimeEventCallback<E extends ThreadRuntimeEventType> = (payload: ThreadRuntimeEventPayload[E]) => void;

type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

type ResumeRunConfig = StartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

type ToolExecutionStatus = {
  type: "executing";
} | {
  type: "interrupt";
  payload: {
    type: "human";
    payload: unknown;
  };
};

type ThreadListItemRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "archiveIndex";
    readonly index: number;
  } | {
    readonly type: "threadId";
    readonly threadId: string;
  };
};

type ThreadRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "threadId";
    readonly threadId: string;
  };
};

type MessageRuntimePath = ThreadRuntimePath & {
  readonly messageSelector: {
    readonly type: "messageId";
    readonly messageId: string;
  } | {
    readonly type: "index";
    readonly index: number;
  };
};

type MessagePartRuntimePath = MessageRuntimePath & {
  readonly messagePartSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "toolCallId";
    readonly toolCallId: string;
  };
};

type AttachmentRuntimePath = ((MessageRuntimePath & {
  readonly attachmentSource: "edit-composer" | "message";
}) | (ThreadRuntimePath & {
  readonly attachmentSource: "thread-composer";
})) & {
  readonly attachmentSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "index";
    readonly index: number;
  };
};

type ComposerRuntimePath = (ThreadRuntimePath & {
  readonly composerSource: "thread";
}) | (MessageRuntimePath & {
  readonly composerSource: "edit";
});

type ThreadListItemStatus = "archived" | "deleted" | "new" | "regular";

type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type MessageAttachmentState = CompleteAttachment & {
  readonly source: "message";
};

type ThreadComposerAttachmentState = Attachment & {
  readonly source: "thread-composer";
};

type EditComposerAttachmentState = Attachment & {
  readonly source: "edit-composer";
};

type AttachmentState = ThreadComposerAttachmentState | EditComposerAttachmentState | MessageAttachmentState;

type AttachmentRuntimeSource = AttachmentState["source"];

type AttachmentRuntime<TSource extends AttachmentRuntimeSource = AttachmentRuntimeSource> = {
  readonly path: AttachmentRuntimePath & {
    attachmentSource: TSource;
  };
  readonly source: TSource;
  getState(): AttachmentState & {
    source: TSource;
  };
  remove(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
};

type BaseComposerState = {
  readonly canCancel: boolean;
  readonly canSend: boolean;
  readonly isEditing: boolean;
  readonly isEmpty: boolean;
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly attachmentAccept: string;
  readonly dictation: DictationState | undefined;
  readonly quote: QuoteInfo | undefined;
  readonly queue: readonly QueueItemState[];
};

type ThreadComposerState = BaseComposerState & {
  readonly type: "thread";
};

type EditComposerState = BaseComposerState & {
  readonly type: "edit";
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

type ComposerState = ThreadComposerState | EditComposerState;

type ComposerRuntime = {
  readonly path: ComposerRuntimePath;
  readonly type: "edit" | "thread";
  getState(): ComposerState;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  reset(): Promise<void>;
  clearAttachments(): Promise<void>;
  send(options?: SendOptions): void;
  cancel(): void;
  steerQueueItem(queueItemId: string): void;
  removeQueueItem(queueItemId: string): void;
  subscribe(callback: () => void): Unsubscribe;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe;
};

type ThreadComposerRuntime = Omit<ComposerRuntime, "getAttachmentByIndex" | "getState"> & {
  readonly path: ComposerRuntimePath & {
    composerSource: "thread";
  };
  readonly type: "thread";
  getState(): ThreadComposerState;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "thread-composer";
  };
};

type EditComposerRuntime = Omit<ComposerRuntime, "getAttachmentByIndex" | "getState"> & {
  readonly path: ComposerRuntimePath & {
    composerSource: "edit";
  };
  readonly type: "edit";
  getState(): EditComposerState;
  beginEdit(): void;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "edit-composer";
  };
};

type MessagePartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe;
};

type MessageState = ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
};

type ReloadConfig = {
  runConfig?: RunConfig;
};

type MessageRuntime = {
  readonly path: MessageRuntimePath;
  readonly composer: EditComposerRuntime;
  getState(): MessageState;
  delete(): void | Promise<void>;
  reload(config?: ReloadConfig): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(_param0: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param1: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }): void;
  unstable_getCopyText(): string;
  subscribe(callback: () => void): Unsubscribe;
  getMessagePartByIndex(idx: number): MessagePartRuntime;
  getMessagePartByToolCallId(toolCallId: string): MessagePartRuntime;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "message";
  };
};

type CreateStartRunConfig = {
  parentId: string | null;
  sourceId?: string | null | undefined;
  runConfig?: RunConfig | undefined;
};

type CreateResumeRunConfig = CreateStartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

type CreateAppendMessage = string | {
  parentId?: string | null | undefined;
  sourceId?: string | null | undefined;
  role?: AppendMessage["role"] | undefined;
  content: AppendMessage["content"];
  attachments?: AppendMessage["attachments"] | undefined;
  metadata?: AppendMessage["metadata"] | undefined;
  createdAt?: Date | undefined;
  runConfig?: AppendMessage["runConfig"] | undefined;
  startRun?: boolean | undefined;
};

type ThreadState = {
  readonly threadId: string;
  readonly metadata: ThreadListItemState;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly ThreadMessage[];
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion[];
  readonly extras: unknown;
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
};

type ThreadRuntime = {
  readonly path: ThreadRuntimePath;
  readonly composer: ThreadComposerRuntime;
  getState(): ThreadState;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(): any;
  importExternalState(state: any): void;
  subscribe(callback: () => void): Unsubscribe;
  cancelRun(): void;
  getModelContext(): ModelContext;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  getMessageByIndex(idx: number): MessageRuntime;
  getMessageById(messageId: string): MessageRuntime;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe;
  muteVoice(): void;
  unmuteVoice(): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
};

type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadItems: Readonly<Record<string, Omit<ThreadListItemState, "isMain" | "threadId">>>;
};

type ThreadListRuntime = {
  getState(): ThreadListState;
  subscribe(callback: () => void): Unsubscribe;
  readonly main: ThreadRuntime;
  getById(threadId: string): ThreadRuntime;
  readonly mainItem: ThreadListItemRuntime;
  getItemById(threadId: string): ThreadListItemRuntime;
  getItemByIndex(idx: number): ThreadListItemRuntime;
  getArchivedItemByIndex(idx: number): ThreadListItemRuntime;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  loadMore(): Promise<void>;
};

type ThreadListItemEventPayload = {
  switchedTo: Record<string, never>;
  switchedAway: Record<string, never>;
};

type ThreadListItemEventType = keyof ThreadListItemEventPayload;

type ThreadListItemEventCallback<E extends ThreadListItemEventType> = (payload: ThreadListItemEventPayload[E]) => void;

type ThreadListItemRuntime = {
  readonly path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(): Promise<void>;
  switchTo(options?: {
    unarchive?: boolean;
  }): Promise<void>;
  rename(newTitle: string): Promise<void>;
  updateCustom(custom: Record<string, unknown> | undefined): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  detach(): void;
  subscribe(callback: () => void): Unsubscribe;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe;
  __internal_getRuntime(): ThreadListItemRuntime;
};

type ExternalThreadQueueAdapter = {
  items: readonly QueueItemState[];
  enqueue: (message: AppendMessage, options: {
    steer: boolean;
  }) => void;
  steer: (queueItemId: string) => void;
  remove: (queueItemId: string) => void;
  clear: (reason: "cancel-run" | "edit" | "reload") => void;
};

type ExternalStoreThreadData<TState extends "archived" | "regular"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  title?: string | undefined;
  custom?: Record<string, unknown> | undefined;
};

type ExternalStoreThreadListAdapter = {
  threadId?: string | undefined;
  isLoading?: boolean | undefined;
  threads?: readonly ExternalStoreThreadData<"regular">[] | undefined;
  archivedThreads?: readonly ExternalStoreThreadData<"archived">[] | undefined;
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
  onSwitchToThread?: ((threadId: string) => Promise<void> | void) | undefined;
  onRename?: (threadId: string, newTitle: string) => (Promise<void> | void) | undefined;
  onUpdateCustom?: ((threadId: string, custom: Record<string, unknown> | undefined) => Promise<void> | void) | undefined;
  onArchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onUnarchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onDelete?: ((threadId: string) => Promise<void> | void) | undefined;
};

type ExternalStoreMessageConverter<T> = (message: T, idx: number) => ThreadMessageLike;

type ExternalStoreBranchChange = {
  headId: string | null;
  visibleMessageIds: readonly string[];
};

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

type ExternalStoreAdapterBase<T> = {
  isDisabled?: boolean | undefined;
  isSendDisabled?: boolean | undefined;
  isRunning?: boolean | undefined;
  isLoading?: boolean | undefined;
  messages?: readonly T[];
  messageRepository?: ExportedMessageRepository;
  suggestions?: readonly ThreadSuggestion[] | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;
  setMessages?: ((messages: readonly T[]) => void) | undefined;
  unstable_onBranchChange?: ((event: ExternalStoreBranchChange) => void) | undefined;
  onImport?: ((messages: readonly ThreadMessage[]) => void) | undefined;
  onExportExternalState?: (() => any) | undefined;
  onLoadExternalState?: ((state: any) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  queue?: ExternalThreadQueueAdapter | undefined;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onDelete?: ((messageId: string) => Promise<void> | void) | undefined;
  onReload?: ((parentId: string | null, config: StartRunConfig) => Promise<void>) | undefined;
  onResume?: ((config: ResumeRunConfig) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => Promise<void> | void) | undefined;
  onResumeToolCall?: ((options: {
    toolCallId: string;
    payload: unknown;
  }) => void) | undefined;
  onRespondToToolApproval?: ((options: RespondToToolApprovalOptions) => Promise<void> | void) | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    threadList?: ExternalStoreThreadListAdapter | undefined;
  } | undefined;
  unstable_capabilities?: {
    copy?: boolean | undefined;
  } | undefined;
  unstable_enableToolInvocations?: boolean | undefined;
  setToolStatuses?: ((statuses: Record<string, ToolExecutionStatus>) => void) | undefined;
};

type ExternalStoreAdapter<T = ThreadMessage> = ExternalStoreAdapterBase<T> & (T extends ThreadMessage ? object : ExternalStoreMessageConverterAdapter<T>);

type AssistantRuntime = {
  readonly threads: ThreadListRuntime;
  readonly thread: ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
};

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

type RemoteThreadMetadata = {
  readonly status: "archived" | "regular";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
  nextCursor?: string | undefined;
};

type RemoteThreadListPageOptions = {
  after?: string | undefined;
};

type RemoteThreadListAdapter = {
  list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse>;
  rename(remoteId: string, newTitle: string): Promise<void>;
  updateCustom?(remoteId: string, custom: Record<string, unknown> | undefined): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(remoteId: string, unstable_messages: readonly ThreadMessage[]): Promise<AssistantStream>;
  fetch(threadId: string): Promise<RemoteThreadMetadata>;
  unstable_Provider?: ComponentType<PropsWithChildren> | undefined;
};

type ExternalStoreSharedOptions = Pick<ExternalStoreAdapter, "isDisabled" | "isSendDisabled" | "suggestions" | "unstable_capabilities">;

type AdkEventPart = {
  text?: string;
  thought?: boolean;
  functionCall?: {
    name: string;
    id?: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    id?: string;
    response: unknown;
  };
  executableCode?: {
    code: string;
    language?: string;
  };
  codeExecutionResult?: {
    output: string;
    outcome?: string;
  };
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    fileUri: string;
    mimeType?: string;
  };
};

type AdkEventActions = {
  stateDelta?: Record<string, unknown> | undefined;
  artifactDelta?: Record<string, number> | undefined;
  transferToAgent?: string | undefined;
  escalate?: boolean | undefined;
  skipSummarization?: boolean | undefined;
  requestedAuthConfigs?: Record<string, unknown> | undefined;
  requestedToolConfirmations?: Record<string, unknown> | undefined;
};

type AdkEvent = {
  id: string;
  invocationId?: string | undefined;
  author?: string | undefined;
  branch?: string | undefined;
  partial?: boolean | undefined;
  turnComplete?: boolean | undefined;
  interrupted?: boolean | undefined;
  finishReason?: string | undefined;
  timestamp?: number | undefined;
  content?: {
    role?: string | undefined;
    parts?: AdkEventPart[] | undefined;
  } | undefined;
  actions?: AdkEventActions | undefined;
  longRunningToolIds?: string[] | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
  customMetadata?: Record<string, unknown> | undefined;
};

type AdkToolCall = {
  id: string;
  name: string;
  args: ReadonlyJSONObject;
  argsText?: string;
};

type AdkMessage = {
  id: string;
  type: "human";
  content: string | AdkMessageContentPart[];
} | {
  id: string;
  type: "ai";
  content: string | AdkMessageContentPart[];
  tool_calls?: AdkToolCall[] | undefined;
  author?: string | undefined;
  branch?: string | undefined;
  status?: MessageStatus | undefined;
} | {
  id: string;
  type: "tool";
  content: string;
  tool_call_id: string;
  name: string;
  status?: "success" | "error" | undefined;
  artifact?: unknown;
};

type AdkMessageContentPart = {
  type: "text";
  text: string;
} | {
  type: "reasoning";
  text: string;
} | {
  type: "image";
  mimeType: string;
  data: string;
} | {
  type: "image_url";
  url: string;
} | {
  type: "file";
  mimeType: string;
  data: string;
  filename?: string | undefined;
} | {
  type: "file_url";
  url: string;
  mimeType?: string | undefined;
} | {
  type: "code";
  code: string;
  language: string;
} | {
  type: "code_result";
  output: string;
  outcome: string;
} | {
  type: "activity";
  message: string;
};

type AdkToolConfirmation = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  hint: string;
  confirmed: boolean;
  payload?: unknown;
};

type AdkAuthCredentialType = "apiKey" | "http" | "oauth2" | "openIdConnect" | "serviceAccount";

type AdkAuthCredential = {
  authType: AdkAuthCredentialType;
  resourceRef?: string | undefined;
  apiKey?: string | undefined;
  http?: {
    scheme: string;
    credentials: {
      username?: string;
      password?: string;
      token?: string;
    };
  } | undefined;
  oauth2?: {
    clientId?: string;
    clientSecret?: string;
    authUri?: string;
    state?: string;
    redirectUri?: string;
    authResponseUri?: string;
    authCode?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    expiresIn?: number;
  } | undefined;
  serviceAccount?: unknown;
};

type AdkAuthRequest = {
  toolCallId: string;
  authConfig: unknown;
};

type AdkMessageMetadata = {
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
};

type AdkRunConfig = {
  streamingMode?: "none" | "sse" | "bidi" | undefined;
  pauseOnToolCalls?: boolean | undefined;
  maxLlmCalls?: number | undefined;
  saveInputBlobsAsArtifacts?: boolean | undefined;
  supportCfc?: boolean | undefined;
  speechConfig?: unknown;
  responseModalities?: string[] | undefined;
  outputAudioTranscription?: unknown;
  inputAudioTranscription?: unknown;
  enableAffectiveDialog?: boolean | undefined;
  proactivity?: unknown;
  realtimeInputConfig?: unknown;
};

type AdkSendMessageConfig = {
  runConfig?: unknown;
  checkpointId?: string | undefined;
  stateDelta?: Record<string, unknown> | undefined;
};

declare const AdkEventType: {
  readonly THOUGHT: "thought";
  readonly CONTENT: "content";
  readonly TOOL_CALL: "tool_call";
  readonly TOOL_RESULT: "tool_result";
  readonly CALL_CODE: "call_code";
  readonly CODE_RESULT: "code_result";
  readonly ERROR: "error";
  readonly ACTIVITY: "activity";
  readonly TOOL_CONFIRMATION: "tool_confirmation";
  readonly FINISHED: "finished";
};

type AdkStructuredEvent = {
  type: "thought";
  content: string;
} | {
  type: "content";
  content: string;
} | {
  type: "tool_call";
  call: {
    name: string;
    id?: string;
    args: Record<string, unknown>;
  };
} | {
  type: "tool_result";
  result: {
    name: string;
    id?: string;
    response: unknown;
  };
} | {
  type: "call_code";
  code: {
    code: string;
    language?: string;
  };
} | {
  type: "code_result";
  result: {
    output: string;
    outcome?: string;
  };
} | {
  type: "error";
  errorCode?: string;
  errorMessage?: string;
} | {
  type: "activity";
  message: string;
} | {
  type: "tool_confirmation";
  confirmations: Record<string, unknown>;
} | {
  type: "finished";
};

type AdkStreamCallback = (messages: AdkMessage[], config: AdkSendMessageConfig & {
  abortSignal: AbortSignal;
  initialize: () => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
}) => Promise<AsyncGenerator<AdkEvent>> | AsyncGenerator<AdkEvent>;

type OnAdkErrorCallback = (error: unknown) => void | Promise<void>;

type OnAdkCustomEventCallback = (type: string, data: unknown) => void | Promise<void>;

type OnAdkAgentTransferCallback = (toAgent: string) => void | Promise<void>;

type ParsedAdkRequest = {
  type: "message";
  text: string;
  parts?: Array<Record<string, unknown>> | undefined;
  config: AdkSendMessageConfig;
  stateDelta?: Record<string, unknown> | undefined;
} | {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError: boolean;
  config: AdkSendMessageConfig;
  stateDelta?: Record<string, unknown> | undefined;
};

declare const parseAdkRequest: (request: Request) => Promise<ParsedAdkRequest>;

declare const toAdkContent: (parsed: ParsedAdkRequest) => {
  role: string;
  parts: Array<Record<string, unknown>>;
};

declare namespace entry_server_exports {
  export { AdkEventStreamOptions, CreateAdkApiRouteOptions, adkEventStream, createAdkApiRoute, parseAdkRequest, toAdkContent };
}

type CreateAdkStreamOptions = {
  api: string;
  appName?: string | undefined;
  userId?: string | undefined;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>) | undefined;
};

declare function createAdkStream(options: CreateAdkStreamOptions): AdkStreamCallback;

declare class AdkEventAccumulator {
  private messagesMap;
  private currentMessageId;
  private partialTextBuffer;
  private partialReasoningBuffer;
  private accumulatedStateDelta;
  private accumulatedArtifactDelta;
  private lastAgentInfo;
  private lastTransferToAgent;
  private pendingLongRunningToolIds;
  private toolConfirmations;
  private authRequests;
  private escalated;
  private messageMetadataMap;
  constructor(initialMessages?: AdkMessage[]);
  processEvent(rawEvent: AdkEvent): AdkMessage[];
  private processPart;
  private trackMessageMetadata;
  private getContentArray;
  private getOrCreateAiMessage;
  private appendContent;
  private replaceLastTextContent;
  private replaceLastReasoningContent;
  private finalizeCurrentMessage;
  getMessages(): AdkMessage[];
  getStateDelta(): Record<string, unknown>;
  getArtifactDelta(): Record<string, number>;
  getAgentInfo(): {
    name?: string | undefined;
    branch?: string | undefined;
  };
  getLastTransferToAgent(): string | undefined;
  getLongRunningToolIds(): string[];
  getToolConfirmations(): AdkToolConfirmation[];
  getAuthRequests(): AdkAuthRequest[];
  isEscalated(): boolean;
  getMessageMetadata(): Map<string, AdkMessageMetadata>;
}

type AdkSessionAdapterOptions = {
  apiUrl: string;
  appName: string;
  userId: string;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>) | undefined;
};

type AdkArtifactData = {
  inlineData?: {
    mimeType: string;
    data: string;
  } | undefined;
  text?: string | undefined;
};

type AdkSessionAdapterResult = {
  adapter: RemoteThreadListAdapter;
  load: (sessionId: string) => Promise<{
    messages: AdkMessage[];
  }>;
  artifacts: {
    list: (sessionId: string) => Promise<string[]>;
    load: (sessionId: string, artifactName: string, version?: number) => Promise<AdkArtifactData>;
    listVersions: (sessionId: string, artifactName: string) => Promise<number[]>;
    delete: (sessionId: string, artifactName: string) => Promise<void>;
  };
};

declare function createAdkSessionAdapter(options: AdkSessionAdapterOptions): AdkSessionAdapterResult;

type JoinStrategy = "concat-content" | "none";

declare namespace useExternalMessageConverter {
  type Message = (ThreadMessageLike & {
    readonly convertConfig?: {
      readonly joinStrategy?: JoinStrategy;
    };
  }) | {
    role: "tool";
    toolCallId: string;
    toolName?: string | undefined;
    result: any;
    artifact?: any;
    isError?: boolean;
    messages?: readonly ThreadMessage[];
  };
  type Metadata = {
    readonly toolStatuses?: Record<string, ToolExecutionStatus>;
    readonly error?: ReadonlyJSONValue;
    readonly messageTiming?: Record<string, MessageTiming>;
  };
  type Callback<T> = (message: T, metadata: Metadata) => Message | Message[];
}

declare const useExternalMessageConverter: <T extends WeakKey>(_param2: {
  callback: useExternalMessageConverter.Callback<T>;
  messages: T[];
  isRunning: boolean;
  joinStrategy?: JoinStrategy | undefined;
  metadata?: useExternalMessageConverter.Metadata | undefined;
}) => ThreadMessage[];

type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  duration_ms?: number;
};

type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "api-key" | "jwt";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

type AssistantCloudTelemetryConfig = {
  enabled?: boolean;
  beforeReport?: (report: AssistantCloudRunReport) => AssistantCloudRunReport | null;
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

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
};

declare class AssistantCloudAPI {
  _auth: AssistantCloudAuthStrategy;
  _baseUrl: string;
  constructor(config: AssistantCloudConfig);
  initializeAuth(): Promise<boolean>;
  makeRawRequest(endpoint: string, options?: MakeRequestOptions): Promise<Response>;
  makeRequest(endpoint: string, options?: MakeRequestOptions): Promise<any>;
}

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[];
};

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

type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
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

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

declare class AssistantCloudAuthTokens {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  create(): Promise<AssistantCloudAuthTokensCreateResponse>;
}

type AssistantCloudThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

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

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
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

type AssistantCloudThreadsUpdateBody = {
  title?: string | undefined;
  last_message_at?: Date | undefined;
  metadata?: unknown | undefined;
  is_archived?: boolean | undefined;
};

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

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
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

declare class AssistantCloudFiles {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
  generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
}

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

declare const convertAdkMessage: useExternalMessageConverter.Callback<AdkMessage>;

declare const useAdkAgentInfo: () => {
  name?: string | undefined;
  branch?: string | undefined;
} | undefined;

declare const useAdkSessionState: () => Record<string, unknown>;

declare const useAdkSend: () => (messages: AdkMessage[], config: AdkSendMessageConfig) => Promise<void>;

declare const useAdkLongRunningToolIds: () => string[];

declare const useAdkToolConfirmations: () => AdkToolConfirmation[];

declare const useAdkAuthRequests: () => AdkAuthRequest[];

declare const useAdkArtifacts: () => Record<string, number>;

declare const useAdkEscalation: () => boolean;

declare const useAdkMessageMetadata: () => Map<string, AdkMessageMetadata>;

declare const useAdkConfirmTool: () => (toolCallId: string, confirmed: boolean, payload?: ReadonlyJSONValue) => Promise<void>;

declare const useAdkSubmitAuth: () => (toolCallId: string, credential: AdkAuthCredential) => Promise<void>;

declare const useAdkSubmitInput: () => (toolCallId: string, result: ReadonlyJSONValue) => Promise<void>;

declare const useAdkAppState: () => Record<string, unknown>;

declare const useAdkUserState: () => Record<string, unknown>;

declare const useAdkTempState: () => Record<string, unknown>;

type UseAdkRuntimeOptions = ExternalStoreSharedOptions & {
  stream: AdkStreamCallback;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  getCheckpointId?: (threadId: string, parentMessages: AdkMessage[]) => Promise<string | null>;
  load?: (threadId: string) => Promise<{
    messages: AdkMessage[];
  }>;
  create?: () => Promise<{
    externalId: string;
  }>;
  delete?: (threadId: string) => Promise<void>;
  adapters?: {
    attachments?: AttachmentAdapter;
    speech?: SpeechSynthesisAdapter;
    dictation?: DictationAdapter;
    voice?: RealtimeVoiceAdapter;
    feedback?: FeedbackAdapter;
  } | undefined;
  eventHandlers?: {
    onError?: OnAdkErrorCallback;
    onCustomEvent?: OnAdkCustomEventCallback;
    onAgentTransfer?: OnAdkAgentTransferCallback;
  } | undefined;
  cloud?: AssistantCloud | undefined;
  sessionAdapter?: RemoteThreadListAdapter | undefined;
};

declare const useAdkRuntime: (_param3: UseAdkRuntimeOptions) => AssistantRuntime;

type UseAdkMessagesOptions = {
  stream: AdkStreamCallback;
  eventHandlers?: {
    onError?: OnAdkErrorCallback;
    onCustomEvent?: OnAdkCustomEventCallback;
    onAgentTransfer?: OnAdkAgentTransferCallback;
  };
};

declare const useAdkMessages: (_param4: UseAdkMessagesOptions) => {
  messages: AdkMessage[];
  stateDelta: Record<string, unknown>;
  agentInfo: {
    name?: string | undefined;
    branch?: string | undefined;
  };
  longRunningToolIds: string[];
  artifactDelta: Record<string, number>;
  toolConfirmations: AdkToolConfirmation[];
  authRequests: AdkAuthRequest[];
  escalated: boolean;
  messageMetadata: Map<string, AdkMessageMetadata>;
  sendMessage: (newMessages: AdkMessage[], config: AdkSendMessageConfig) => Promise<void>;
  cancel: () => void;
  setMessages: (msgs: AdkMessage[]) => void;
  replaceMessages: (msgs: AdkMessage[]) => void;
};

declare function toAdkStructuredEvents(event: AdkEvent): AdkStructuredEvent[];

declare namespace entry_root_exports {
  export { AdkArtifactData, AdkAuthCredential, AdkAuthCredentialType, AdkAuthRequest, AdkEvent, AdkEventAccumulator, AdkEventActions, AdkEventPart, AdkEventType, AdkMessage, AdkMessageContentPart, AdkMessageMetadata, AdkRunConfig, AdkSendMessageConfig, AdkSessionAdapterOptions, AdkStreamCallback, AdkStructuredEvent, AdkToolCall, AdkToolConfirmation, CreateAdkStreamOptions, OnAdkAgentTransferCallback, OnAdkCustomEventCallback, OnAdkErrorCallback, UseAdkMessagesOptions, UseAdkRuntimeOptions, convertAdkMessage, createAdkSessionAdapter, createAdkStream, toAdkStructuredEvents, useAdkAgentInfo, useAdkAppState, useAdkArtifacts, useAdkAuthRequests, useAdkConfirmTool, useAdkEscalation, useAdkLongRunningToolIds, useAdkMessageMetadata, useAdkMessages, useAdkRuntime, useAdkSend, useAdkSessionState, useAdkSubmitAuth, useAdkSubmitInput, useAdkTempState, useAdkToolConfirmations, useAdkUserState };
}

export { entry_root_exports as entry_root, entry_server_exports as entry_server };
