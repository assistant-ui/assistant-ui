import { StandardSchemaV1 } from "@standard-schema/spec";

import { JSONSchema7 } from "json-schema";

import "react";

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

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

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue | undefined;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
      readonly comment?: string;
    } | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly isOptimistic?: boolean;
    readonly modality?: MessageModality | undefined;
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

type BridgeEnvelope<TKind extends string> = {
  channel: typeof VSCODE_BRIDGE_CHANNEL;
  kind: TKind;
  id: string;
};

type BridgeHeaders = [
  name: string,
  value: string
][];

type BridgeMessage = WebviewToHostMessage | HostToWebviewMessage;

type ChatModelAdapter = {
  run(options: ChatModelRunOptions): Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
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

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

type Disposable = {
  dispose(): void;
};

type FetchAbortMessage = BridgeEnvelope<"fetch:abort">;

type FetchChunkMessage = BridgeEnvelope<"fetch:chunk"> & {
  chunk: Uint8Array<ArrayBuffer>;
};

type FetchEndMessage = BridgeEnvelope<"fetch:end">;

type FetchErrorMessage = BridgeEnvelope<"fetch:error"> & {
  message: string;
};

type FetchHeadMessage = BridgeEnvelope<"fetch:head"> & {
  status: number;
  statusText: string;
  headers: BridgeHeaders;
};

type FetchRequestMessage = BridgeEnvelope<"fetch:request"> & {
  url: string;
  method: string;
  headers: BridgeHeaders;
  body: Uint8Array<ArrayBuffer> | null;
};

type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly sourceType?: "id" | "url";
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
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

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type GenerativeUINode = string | number | readonly GenerativeUINode[] | {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly GenerativeUINode[];
  readonly key?: string;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
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

type HostToWebviewMessage = FetchHeadMessage | FetchChunkMessage | FetchEndMessage | FetchErrorMessage;

type HttpMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";

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

type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
  readonly providerMetadata?: PartProviderMetadata;
};

type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  reasoningEffort?: string;
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

type MaybePromise<T> = T | Promise<T>;

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
  readonly serverId?: string;
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

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

type MessageModality = "voice";

type MessagePartStreamStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
};

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

type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
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

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly unstable_summary?: string;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type RenderWebviewHtmlOptions<U> = Omit<WebviewCspOptions, "nonce"> & {
  scripts: readonly U[];
  styles?: readonly U[];
  title?: string;
  lang?: string;
  nonce?: string;
  surface?: WebviewSurface;
  rootId?: string | null;
  scriptType?: "classic" | "module";
  htmlAttributes?: Readonly<Record<string, string>>;
  bodyAttributes?: Readonly<Record<string, string>>;
};

type RouteHandler = (request: Request) => Response | Promise<Response>;

type RouteHandlers = {
  [M in HttpMethod]?: RouteHandler;
};

type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

type ServeWebviewRoutesOptions = {
  flushInterval?: number;
  flushSize?: number;
  onError?: (error: unknown) => void;
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

type SourceProviderMetadata = PartProviderMetadata;

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
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
      readonly comment?: string;
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly modality?: MessageModality;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadAssistantMessagePart = TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart | ImageMessagePart | DataMessagePart | GenerativeUIMessagePart;

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | undefined;
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
    readonly modality?: undefined;
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
    readonly isOptimistic?: boolean;
    readonly modality?: MessageModality;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadUserMessagePart = TextMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | Unstable_AudioMessagePart;

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolApprovalDisplay = "decision" | "select" | "text";

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

type ToolApprovalOptionKind = "allow-always" | "allow-once" | "reject-always" | "reject-once";

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

type ToolCallMessagePart<TArgs = ReadonlyJSONObject, TResult = unknown> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
  readonly isPreliminary?: boolean | undefined;
  readonly argsText: string;
  readonly artifact?: unknown;
  readonly timing?: ToolCallTiming;
  readonly mcp?: ToolCallMessagePartMcpMetadata;
  readonly providerMetadata?: PartProviderMetadata;
  readonly modelContent?: readonly ToolModelContentPart[] | undefined;
  readonly interrupt?: {
    type: "human";
    payload: unknown;
  };
  readonly approval?: {
    readonly id: string;
    readonly prompt?: string;
    readonly display?: ToolApprovalDisplay;
    readonly allowFreeform?: boolean;
    readonly dismissible?: boolean;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
    readonly options?: readonly ToolApprovalOption[];
    readonly optionId?: string;
    readonly text?: string;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
  readonly unstable_interactions?: Unstable_ToolInteractionLog;
};

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
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

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type ToolDisplay = "inline" | "standalone";

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
};

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

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

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

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type Unstable_ToolInteraction = {
  readonly type: "action";
  readonly occurredAt: number;
  readonly payload: ReadonlyJSONObject;
} | {
  readonly type: "human-response";
  readonly occurredAt: number;
  readonly payload: ReadonlyJSONValue;
};

type Unstable_ToolInteractionLog = {
  readonly entries: readonly Unstable_ToolInteraction[];
  readonly omitted?: number;
};

declare const VSCODE_BRIDGE_CHANNEL = "aui-vscode";

declare const VSCODE_VIRTUAL_ORIGIN = "https://webview.vscode.invalid";

type VSCodeApi<TState = unknown> = {
  postMessage(message: unknown): void;
  getState(): TState | undefined;
  setState<T extends TState | undefined>(newState: T): T;
};

type VSCodeBridgePort = {
  postMessage(message: WebviewToHostMessage): void;
  onMessage(listener: (message: unknown) => void): () => void;
};

type VSCodeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type VSCodeModelAdapterOptions = {
  api?: string;
  fetch?: VSCodeFetch;
  headers?: HeadersInit | (() => MaybePromise<HeadersInit>);
  body?: Record<string, unknown> | (() => MaybePromise<Record<string, unknown>>);
};

type VSCodeModelRequest = {
  system?: string | undefined;
  messages: GenericMessage[];
  tools: Record<string, ToolJSONSchema>;
  runConfig: RunConfig;
  threadId?: string;
  [key: string]: unknown;
};

type WebviewCspMode = "relaxed" | "strict";

type WebviewCspOptions = {
  nonce: string;
  csp?: WebviewCspMode;
  scriptSrc?: readonly string[];
  connectSrc?: readonly string[];
  frameSrc?: readonly string[];
  wasmUnsafeEval?: boolean;
};

type WebviewCspSource = {
  readonly cspSource: string;
};

type WebviewLike = {
  postMessage(message: any): PromiseLike<boolean>;
  onDidReceiveMessage(listener: (message: any) => unknown): {
    dispose(): unknown;
  };
};

type WebviewResourceLike<U> = WebviewCspSource & {
  asWebviewUri(uri: U): {
    toString(): string;
  };
};

type WebviewRoutes = Record<string, RouteHandlers>;

type WebviewSurface = "editor" | "panel" | "sidebar";

type WebviewToHostMessage = FetchRequestMessage | FetchAbortMessage;

declare function createCspNonce(): string;

declare function createVSCodeFetch(port?: VSCodeBridgePort): VSCodeFetch;

declare function createVSCodeModelAdapter(_param0?: VSCodeModelAdapterOptions): ChatModelAdapter;

declare function createWebviewCsp(webview: WebviewCspSource, options: WebviewCspOptions): string;

declare function getCspNonce(): string | undefined;

declare function getVSCodeApi<TState = unknown>(): VSCodeApi<TState>;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare namespace entry_host_exports {
  export { BridgeHeaders, BridgeMessage, Disposable, FetchAbortMessage, FetchChunkMessage, FetchEndMessage, FetchErrorMessage, FetchHeadMessage, FetchRequestMessage, HostToWebviewMessage, HttpMethod, RenderWebviewHtmlOptions, RouteHandler, RouteHandlers, ServeWebviewRoutesOptions, VSCODE_BRIDGE_CHANNEL, VSCODE_VIRTUAL_ORIGIN, VSCodeModelRequest, WebviewCspMode, WebviewCspOptions, WebviewCspSource, WebviewLike, WebviewResourceLike, WebviewRoutes, WebviewSurface, WebviewToHostMessage, createCspNonce, createWebviewCsp, isHostToWebviewMessage, isWebviewToHostMessage, renderWebviewHtml, serveWebviewRoutes };
}

declare const isHostToWebviewMessage: (value: unknown) => value is HostToWebviewMessage;

declare const isWebviewToHostMessage: (value: unknown) => value is WebviewToHostMessage;

declare function renderWebviewHtml<U>(webview: WebviewResourceLike<U>, options: RenderWebviewHtmlOptions<U>): string;

declare function serveWebviewRoutes(webview: WebviewLike, routes: WebviewRoutes, _param1?: ServeWebviewRoutesOptions): Disposable;

declare const vscodeFetch: VSCodeFetch;

declare namespace entry_webview_exports {
  export { BridgeHeaders, BridgeMessage, FetchAbortMessage, FetchChunkMessage, FetchEndMessage, FetchErrorMessage, FetchHeadMessage, FetchRequestMessage, HostToWebviewMessage, VSCODE_BRIDGE_CHANNEL, VSCODE_VIRTUAL_ORIGIN, VSCodeApi, VSCodeBridgePort, VSCodeFetch, VSCodeModelAdapterOptions, VSCodeModelRequest, WebviewToHostMessage, createVSCodeFetch, createVSCodeModelAdapter, getCspNonce, getVSCodeApi, isHostToWebviewMessage, isWebviewToHostMessage, vscodeFetch };
}

export { entry_host_exports as entry_host, entry_webview_exports as entry_webview };
