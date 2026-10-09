import { StandardSchemaV1 } from "@standard-schema/spec";

import { JSONSchema7 } from "json-schema";

import "radix-ui";

import "radix-ui/internal";

import { CSSProperties, ComponentType, ReactNode } from "react";

import "react-textarea-autosize";

import "zustand";

type AISDKModelOptions<Schema> = {
  streamText: (options: never) => StreamResult;
  jsonSchema: (schema: JsonSchema) => Schema;
  model: unknown;
  settings?: Record<string, unknown>;
};

declare const ASSISTANT_UI_TOKEN_SOURCES: ThemeTokenSources;

type ActionBinding = {
  action: string;
  params?: Record<string, unknown>;
};

type ActionDefinition = {
  description: string;
  params?: PropsSchema;
};

type ActionDispatcher = (bindings: ActionBinding | readonly ActionBinding[] | undefined, context: Omit<ExpressionContext, "event" | "state"> & ActionSource & {
  payload?: unknown;
}) => Promise<unknown[]>;

type ActionDispatcherOptions = {
  store: SpecStateStore;
  catalog?: Catalog;
  handlers?: Record<string, ActionHandler>;
  onAction?: (name: string, params: Record<string, unknown>, context: ActionSource & {
    state: SpecStateStore;
  }) => unknown;
  onError?: (error: Error, binding: ActionBinding) => void;
};

type ActionHandler = (params: Record<string, unknown>, context: ActionSource & {
  state: SpecStateStore;
}) => unknown;

type ActionSource = {
  elementId?: string;
  trigger?: string;
};

type AgentMessage = {
  role: "system";
  content: string;
} | {
  role: "user";
  content: string;
} | {
  role: "assistant";
  content: string;
  toolCalls?: AgentToolCall[];
} | {
  role: "tool";
  toolCallId: string;
  name: string;
  content: string;
};

type AgentModelEvent = {
  type: "text-delta";
  text: string;
} | {
  type: "tool-call-delta";
  id: string;
  name?: string;
  argsTextDelta: string;
} | {
  type: "tool-call";
  id: string;
  name: string;
  args: unknown;
} | {
  type: "finish";
  reason?: string;
};

type AgentToolCall = {
  id: string;
  name: string;
  args: unknown;
};

type AgentToolDeclaration = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AnyTool = ToolDefinition$1<never, unknown>;

type ApplyEditsResult = {
  ok: true;
  code: string;
} | {
  ok: false;
  error: string;
  index: number;
};

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type AssistantClient = ClientScopes & {
  readonly optional: {
    readonly [K in keyof ClientScopes]: ClientScopes[K] | undefined;
  };
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe;
};

type AssistantClientAccessor<K extends ClientNames> = ClientSchemas[K]["methods"] & {
  (): ClientSchemas[K]["methods"];
} & (ClientMeta<K> | {
  source: "root";
  query: Record<string, never>;
} | {
  source: null;
  query: null;
}) & {
  name: K;
};

type AssistantEventCallback<TEvent extends AssistantEventName> = (payload: AssistantEventPayload[TEvent]) => void;

type AssistantEventName = keyof AssistantEventPayload;

type AssistantEventPayload = ClientEventMap & {
  "*": WildcardPayload;
};

type AssistantEventScope<TEvent extends AssistantEventName> = "*" | EventSource<TEvent> | (EventSource<TEvent> extends ClientNames ? AncestorsOf<EventSource<TEvent>> : never);

type AssistantEventSelector<TEvent extends AssistantEventName> = TEvent | {
  scope: AssistantEventScope<TEvent>;
  event: TEvent;
};

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

type BootstrapOptions = {
  hostOrigin: string;
  csp?: CspOptions | string;
  tokens?: ThemeTokens;
  compat?: readonly Compat[];
  animate?: boolean;
  css?: string;
  runtime?: string;
};

type Catalog<TComponents extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>> = {
  readonly components: TComponents;
  readonly actions: TActions;
  component(type: string): ComponentDefinition | undefined;
  action(name: string): ActionDefinition | undefined;
  propsSchema(type: string): JsonSchema | undefined;
  paramsSchema(action: string): JsonSchema | undefined;
  validateProps(type: string, props: unknown): SchemaIssue[];
  validateParams(action: string, params: unknown): SchemaIssue[];
  prompt(options?: SpecPromptOptions): string;
};

type CatalogDefinition<TComponents extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>> = {
  components: TComponents;
  actions?: TActions;
};

type ClearStorageResult = {
  cleared: string[];
};

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ClientEventMap = UnionToIntersection<{
  [K in ClientNames]: ClientEvents<K>;
}[ClientNames]>;

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K & string> ? ClientSchemas[K]["events"] : never : never;

type ClientEventsType<K extends string> = Record<`${K}.${string}`, unknown>;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientNames = keyof ClientSchemas extends (infer U) ? U : never;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K & string, ScopeRegistry[K]>;
};

type ClientScopes = {
  [K in ClientNames]: AssistantClientAccessor<K>;
};

type CodeUpdate = {
  type: "none";
} | {
  type: "append";
  chunk: string;
} | {
  type: "replace";
  code: string;
};

type ColorScheme = "dark" | "light";

type Compat = "openai";

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type ComponentDefinition = {
  description: string;
  props?: PropsSchema;
  slots?: readonly string[];
  events?: readonly string[];
};

type Condition = boolean | readonly Condition[] | {
  readonly [key: string]: unknown;
};

type ConsoleEntry = {
  level: ConsoleLevel;
  message: string;
};

type ConsoleLevel = "debug" | "error" | "info" | "log" | "warn";

type CreateSpecStreamOptions = {
  mode?: SpecStreamMode;
  initial?: Spec;
};

type CreateSpecToolsOptions = {
  specs?: Map<string, {
    spec: Spec;
    version: number;
  }>;
};

type CreateWidgetAgentOptions = {
  model: WidgetAgentModel;
  tools?: WidgetTools & Partial<SpecTools>;
  extraTools?: Record<string, ToolDefinition$1<never, unknown>>;
  maxRounds?: number;
  maxSteps?: number;
  preview?: (code: string) => Promise<RenderReport>;
  settleMs?: number;
  instructions?: string;
  onEvent?: (event: WidgetAgentEvent) => void;
  createSink?: (info: {
    title: string;
    mode: WidgetMode;
  }) => WidgetSink | undefined;
};

type CreateWidgetOptions = WidgetHandlers & {
  container: HTMLElement;
  product?: string;
  frame?: SafeContentFrame;
  id?: string;
  csp?: CspOptions | string;
  tokens?: ThemeTokens;
  context?: HostContext;
  compat?: Compat[];
  animate?: boolean;
  css?: string;
  maxHeight?: number;
  minHeight?: number;
  readyTimeoutMs?: number;
  code?: string;
};

type CreateWidgetToolsOptions = {
  registry?: WidgetRegistry;
  guidance?: Omit<GuidanceOptions, "modules" | "platform">;
  preview?: (code: string, options: {
    width?: number;
    appearance?: ColorScheme;
  }) => Promise<PreviewResult>;
  modules?: readonly GuidanceModule[];
};

type CspOptions = {
  cdnOrigins?: readonly string[];
  connectOrigins?: readonly string[];
  imageOrigins?: readonly string[];
  frameOrigins?: readonly string[];
  allowEval?: boolean;
};

declare const DEFAULT_CDN_ORIGINS: readonly string[];

declare const DEFAULT_DARK_TOKENS: ThemeTokens;

declare const DEFAULT_FONT_ORIGINS: readonly string[];

declare const DEFAULT_FONT_STYLE_ORIGINS: readonly string[];

declare const DEFAULT_LIGHT_TOKENS: ThemeTokens;

declare const DEFAULT_TOKEN_SOURCES: Record<ThemeTokenName, readonly string[]>;

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly id?: string;
  readonly name: string;
  readonly data: T;
};

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

type DisplayMode = "fullscreen" | "inline" | "pip";

type EditWidgetInput = {
  title: string;
  edits: WidgetEdit[];
};

type EditWidgetResult = {
  ok: true;
  title: string;
  version: number;
  applied: number;
} | {
  ok: false;
  title: string;
  error: string;
};

type EndResult = {
  size: WidgetSize;
  blank: boolean;
  errorCount: number;
};

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type ExpressionContext = {
  state: unknown;
  item?: unknown;
  index?: number;
  itemPath?: string;
  event?: unknown;
};

type FileMessagePart = {
  readonly type: "file";
  readonly id?: string;
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly sourceType?: "id" | "url";
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type FrameInspection = {
  kind: WidgetKind;
  ended: boolean;
  size: WidgetSize;
  blank: boolean;
  errors: WidgetError[];
  console: ConsoleEntry[];
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

declare const GENFRAME_PROTOCOL_VERSION = "2026-01-26";

type GenerateContext = {
  round: number;
  previousCode: string | undefined;
  feedback: RepairFeedback | undefined;
};

type GenerateOptions = {
  signal?: AbortSignal;
  sink?: WidgetSink;
  onEvent?: (event: WidgetAgentEvent) => void;
};

type GenerateResult = string | {
  edits: WidgetEdit[];
};

type GenerateWidgetInput = {
  brief: string;
  data?: unknown;
  mode?: WidgetMode;
  title?: string;
};

type GenerateWidgetResult = {
  ok: boolean;
  title: string;
  mode: WidgetMode;
  summary: string;
  errors: string[];
  code?: string;
  spec?: Spec;
  rounds: number;
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

type GuidanceModule = {
  name: string;
  summary: string;
  guidance(): string;
};

type GuidanceOptions = {
  modules?: readonly WidgetModule[];
  platform?: Platform;
  tokens?: ThemeTokens;
  cdnOrigins?: readonly string[];
  connectOrigins?: readonly string[];
  allowEval?: boolean;
  width?: number;
  compat?: readonly Compat[];
  hostApi?: HostApiOptions;
};

type HostApiOptions = {
  prompt?: boolean;
  callTool?: boolean;
};

type HostContext = {
  theme?: ColorScheme;
  styles?: {
    variables?: Record<string, string>;
  };
  displayMode?: DisplayMode;
  availableDisplayModes?: DisplayMode[];
  locale?: string;
  platform?: "desktop" | "mobile" | "web";
  containerDimensions?: {
    width?: number;
    maxHeight?: number;
  };
  [key: string]: unknown;
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

type ImageMessagePart = {
  readonly type: "image";
  readonly id?: string;
  readonly image: string;
  readonly filename?: string;
  readonly providerMetadata?: PartProviderMetadata;
};

type JsonRpcId = string | number;

type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type JsonSchema = {
  type?: JsonSchemaType | readonly JsonSchemaType[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  enum?: readonly unknown[];
  const?: unknown;
  anyOf?: readonly JsonSchema[];
  oneOf?: readonly JsonSchema[];
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
  default?: unknown;
};

type JsonSchemaType = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

declare const METHODS: {
  readonly write: "genframe/write";
  readonly end: "genframe/end";
  readonly replace: "genframe/replace";
  readonly screenshot: "genframe/screenshot";
  readonly inspect: "genframe/inspect";
  readonly clearStorage: "genframe/clear-storage";
  readonly hostContextChanged: "ui/notifications/host-context-changed";
  readonly toolInputPartial: "ui/notifications/tool-input-partial";
  readonly toolInput: "ui/notifications/tool-input";
  readonly toolResult: "ui/notifications/tool-result";
  readonly ready: "genframe/ready";
  readonly initialize: "ui/initialize";
  readonly initialized: "ui/notifications/initialized";
  readonly sizeChanged: "ui/notifications/size-changed";
  readonly openLink: "ui/open-link";
  readonly message: "ui/message";
  readonly callTool: "tools/call";
  readonly requestDisplayMode: "ui/request-display-mode";
  readonly updateModelContext: "ui/update-model-context";
  readonly widgetState: "genframe/widget-state";
  readonly log: "genframe/log";
  readonly error: "genframe/error";
};

declare const MODULE_SUMMARIES: Record<WidgetModule, string>;

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

type MessageLike = {
  readonly content: string | readonly unknown[];
};

type MessageModality = "voice";

type MessagePartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type MessagePartStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
  readonly error?: unknown;
};

type MessagePartStreamStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
};

type MessagePartTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
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

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

type PatchOperation = {
  op: "add";
  path: string;
  value: unknown;
} | {
  op: "replace";
  path: string;
  value: unknown;
} | {
  op: "remove";
  path: string;
} | {
  op: "move";
  from: string;
  path: string;
} | {
  op: "copy";
  from: string;
  path: string;
} | {
  op: "test";
  path: string;
  value: unknown;
};

type Platform = "desktop" | "mobile";

type PreviewOptions = Pick<CreateWidgetOptions, "compat" | "csp" | "css" | "frame" | "id" | "product" | "readyTimeoutMs"> & {
  width?: number;
  appearance?: ColorScheme;
  tokens?: CreateWidgetOptions["tokens"];
  screenshot?: boolean;
  settleMs?: number;
};

type PreviewResult = {
  ok: boolean;
  kind: WidgetKind;
  width: number;
  height: number;
  blank: boolean;
  errors: WidgetError[];
  console: ConsoleEntry[];
  screenshot?: string;
  screenshotError?: string;
};

type PreviewWidgetInput = {
  widget_code: string;
  width?: number;
  appearance?: ColorScheme;
};

type PropsSchema = JsonSchema | StandardSchemaLike;

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

declare const RPC_ERROR: {
  readonly parseError: -32700;
  readonly invalidRequest: -32600;
  readonly methodNotFound: -32601;
  readonly invalidParams: -32602;
  readonly internalError: -32603;
};

type ReadMeInput = {
  modules?: ReadMeModule[];
  platform?: Platform;
};

type ReadMeModule = WidgetModule | (string & {});

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly id?: string;
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly unstable_summary?: string;
  readonly timing?: MessagePartTiming;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type RenderReport = {
  errors: WidgetError[];
  console: ConsoleEntry[];
  blank: boolean;
  height?: number;
  screenshot?: string;
};

type RenderReportOptions = {
  timeoutMs?: number;
  settleMs?: number;
};

type RenderSpecInput = {
  title: string;
  patches?: string;
  spec?: Spec;
};

type RenderSpecResult = {
  ok: boolean;
  title: string;
  version: number;
  elementCount: number;
  issues: SpecIssue[];
  feedback: string;
};

type RenderSpecTool = ToolDefinition$1<RenderSpecInput, RenderSpecResult> & {
  streaming: SpecStreaming;
};

interface RenderedFrame {
  iframe: HTMLIFrameElement;
  origin: string;
  sendMessage(data: unknown, transfer?: Transferable[]): void;
  fullyLoadedPromiseWithTimeout(timeoutMs: number): Promise<void>;
  dispose(): void;
}

type RepairFeedback = {
  ok: boolean;
  round: number;
  errors: WidgetError[];
  console: ConsoleEntry[];
  blank: boolean;
  height?: number;
  screenshot?: string;
  text: string;
};

type RepairLoopOptions = {
  generate(context: GenerateContext): Promise<GenerateResult>;
  render(code: string): Promise<RenderReport>;
  maxRounds?: number;
  accept?(report: RenderReport): boolean;
  consoleLimit?: number;
  includeScreenshot?: boolean;
};

type RepairLoopResult = {
  ok: boolean;
  code: string;
  report: RenderReport;
  rounds: RepairRound[];
};

type RepairRound = {
  round: number;
  code: string;
  report: RenderReport;
  feedback: RepairFeedback;
};

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

type ResolvedProps = {
  props: Record<string, unknown>;
  bindings: Record<string, string>;
};

type RpcEndpoint = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  start?(): void;
};

declare class RpcError extends Error {
  readonly code: number;
  readonly data: unknown;
  constructor(code: number, message: string, data?: unknown);
}

type RpcHandlers = {
  onRequest?: (method: string, params: unknown) => unknown;
  onNotification?: (method: string, params: unknown) => void;
};

type RpcPeer = {
  request(method: string, params?: unknown, options?: {
    timeoutMs?: number;
  }): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  receive(message: unknown, reply?: (message: JsonRpcMessage) => void): void;
  dispose(): void;
};

declare const SET_STATE_ACTION: ActionDefinition;

declare class SafeContentFrame {
  #private;
  constructor(product: string, options?: SafeContentFrameOptions);
  renderHtml(html: string, container: HTMLElement, opts?: SafeContentFrameHtmlRenderOptions): Promise<RenderedFrame>;
  renderRaw(content: Uint8Array | string, mimeType: string, container: HTMLElement, opts?: SafeContentFrameRenderOptions): Promise<RenderedFrame>;
  renderPdf(content: Uint8Array, container: HTMLElement, opts?: SafeContentFrameRenderOptions): Promise<RenderedFrame>;
}

interface SafeContentFrameHtmlRenderOptions extends SafeContentFrameRenderOptions {
  unsafeDocumentWrite?: boolean;
}

interface SafeContentFrameOptions {
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  sandbox?: SandboxOption[];
  salt?: string;
}

interface SafeContentFrameRenderOptions {
  signal?: AbortSignal;
}

type SandboxOption = "allow-downloads" | "allow-forms" | "allow-modals" | "allow-popups" | "allow-popups-to-escape-sandbox" | "allow-same-origin" | "allow-scripts";

type SchemaIssue = {
  path: string;
  message: string;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type Screenshot = {
  dataUrl: string;
  width: number;
  height: number;
};

type ScreenshotOptions = {
  scale?: number;
  background?: string;
};

type ShowWidgetInput = {
  title: string;
  loading_messages?: string[];
  widget_code: string;
};

type ShowWidgetResult = {
  ok: true;
  title: string;
  kind: WidgetKind;
  version: number;
} | {
  ok: false;
  title: string;
  error: string;
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

type Spec = {
  root: string;
  elements: Record<string, SpecElement>;
  state?: Record<string, unknown>;
};

type SpecComponentProps<P extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  element: SpecElement;
  props: P;
  children: ReactNode;
  slots: Record<string, ReactNode>;
  emit(event: string, payload?: unknown): void;
  setProp(name: string, value: unknown): void;
  bindings: Record<string, string>;
  state: SpecStateStore;
  streaming: boolean;
};

type SpecComponents = Record<string, ComponentType<SpecComponentProps<any>>>;

type SpecElement = {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  slots?: Record<string, string[]>;
  visible?: Condition;
  repeat?: {
    path: string;
    key?: string;
  };
  on?: Record<string, ActionBinding | ActionBinding[]>;
  watch?: Record<string, ActionBinding | ActionBinding[]>;
};

type SpecIssue = {
  code: SpecIssueCode;
  severity: "error" | "warning";
  message: string;
  path: string;
  elementId?: string;
};

type SpecIssueCode = "children-not-allowed" | "cycle" | "invalid-element" | "invalid-params" | "invalid-patch" | "invalid-props" | "invalid-repeat" | "missing-child" | "missing-root" | "unknown-action" | "unknown-event" | "unknown-root" | "unknown-slot" | "unknown-type" | "unreachable";

declare function SpecPlaceholder(_param0: SpecPlaceholderProps): import("react").JSX.Element;

type SpecPlaceholderProps = {
  id: string;
  reason: "cycle" | "error" | "invalid-props" | "missing" | "pending" | "unknown-type";
  message: string;
};

type SpecPromptOptions = {
  mode?: SpecStreamMode;
  customRules?: readonly string[];
  omitExample?: boolean;
};

declare function SpecRenderer(_param1: SpecRendererProps): import("react").JSX.Element | null;

type SpecRendererProps = {
  spec: Spec;
  components: SpecComponents;
  catalog?: Catalog;
  state?: SpecStateStore;
  handlers?: Record<string, ActionHandler>;
  onAction?: (name: string, params: Record<string, unknown>, context: ActionSource & {
    state: SpecStateStore;
  }) => unknown;
  onError?: (error: Error, context: {
    elementId?: string;
  }) => void;
  streaming?: boolean;
  placeholder?: ComponentType<SpecPlaceholderProps>;
};

type SpecStateStore = {
  getState(): Record<string, unknown>;
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  seed(state: Record<string, unknown>): void;
  subscribe(listener: StateListener): () => void;
};

type SpecStream = {
  push(chunk: string): SpecStreamUpdate;
  result(): SpecStreamResult;
  readonly spec: Spec;
};

type SpecStreamError = {
  line: number;
  message: string;
  text: string;
};

type SpecStreamMode = "inline" | "jsonl";

type SpecStreamResult = {
  spec: Spec;
  patches: PatchOperation[];
  text: string;
  errors: SpecStreamError[];
};

type SpecStreamUpdate = {
  spec: Spec;
  patches: PatchOperation[];
  text: string;
  errors: SpecStreamError[];
};

type SpecStreaming = {
  create(initial?: Spec): SpecStream;
  parse(text: string, initial?: Spec): Spec;
};

type SpecToolkitOptions = {
  components: SpecComponents;
  handlers?: Record<string, ActionHandler>;
  onAction?: (name: string, params: Record<string, unknown>, context: {
    elementId?: string;
    trigger?: string;
    state: SpecStateStore;
  }) => unknown;
  placeholder?: ComponentType<SpecPlaceholderProps>;
  specPrompt?: Omit<SpecPromptOptions, "mode">;
};

type SpecTools = {
  render_spec: RenderSpecTool;
};

type SpecValidation = {
  ok: boolean;
  issues: SpecIssue[];
};

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

type StandardResult = {
  readonly issues?: ReadonlyArray<{
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | {
      readonly key: PropertyKey;
    }>;
  }>;
};

type StandardSchemaLike = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult | Promise<StandardResult>;
    readonly jsonSchema?: {
      readonly input: (options: {
        target: string;
      }) => Record<string, unknown>;
    };
  };
};

type StateListener = (state: Record<string, unknown>) => void;

type StreamPart = {
  type: "text-delta";
  text?: string;
  delta?: string;
  textDelta?: string;
} | {
  type: "tool-input-start";
  id: string;
  toolName: string;
} | {
  type: "tool-input-delta";
  id: string;
  delta: string;
} | {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input?: unknown;
  args?: unknown;
} | {
  type: "finish";
  finishReason?: string;
} | {
  type: "error";
  error: unknown;
} | {
  type: string;
};

type StreamResult = {
  stream?: AsyncIterable<StreamPart>;
  fullStream?: AsyncIterable<StreamPart>;
};

declare const THEME_TOKENS: readonly ThemeTokenInfo[];

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly id?: string;
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type ThemeObserveOptions = {
  observeBodyStyle?: boolean;
};

type ThemeTokenInfo = {
  name: ThemeTokenName;
  group: "accent" | "border" | "chart" | "shape" | "status" | "surface" | "text" | "type";
  usage: string;
};

type ThemeTokenName = "--chart-1" | "--chart-2" | "--chart-3" | "--chart-4" | "--chart-5" | "--chart-6" | "--color-accent" | "--color-accent-text" | "--color-background" | "--color-border" | "--color-border-strong" | "--color-danger" | "--color-info" | "--color-success" | "--color-surface" | "--color-surface-muted" | "--color-text" | "--color-text-muted" | "--color-text-subtle" | "--color-warning" | "--font-mono" | "--font-sans" | "--radius-lg" | "--radius-md" | "--radius-sm";

type ThemeTokenSources = Partial<Record<ThemeTokenName, string | readonly string[]>>;

type ThemeTokens = {
  colorScheme: ColorScheme;
  variables: Record<string, string>;
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

type ToolApprovalAnswer = {
  readonly optionIds?: readonly string[];
  readonly text?: string;
};

type ToolApprovalDisplay = "decision" | "questions" | "select" | "text";

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

type ToolApprovalQuestion = {
  readonly id: string;
  readonly prompt: string;
  readonly header?: string;
  readonly options?: readonly ToolApprovalQuestionOption[];
  readonly multiple?: boolean;
  readonly allowFreeform?: boolean;
};

type ToolApprovalQuestionOption = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
};

type ToolApprovalResponse = {
  readonly approved: boolean;
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly optionId: string;
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly approved: boolean;
  readonly optionId: string;
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly text: string;
  readonly reason?: string;
} | {
  readonly answers: Readonly<Record<string, ToolApprovalAnswer>>;
  readonly reason?: string;
};

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

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult, TValue> = TValue | undefined | null | ((options: {
  args: TArgs;
  result: TResult | undefined;
}) => TValue | undefined | null);

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
    readonly questions?: readonly ToolApprovalQuestion[];
    readonly answers?: Readonly<Record<string, ToolApprovalAnswer>>;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
  readonly unstable_interactions?: Unstable_ToolInteractionLog;
};

type ToolCallMessagePartComponent<TArgs = any, TResult = any> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolCallMessagePartProps<TArgs = any, TResult = unknown> = MessagePartState & ToolCallMessagePart<TArgs, TResult> & {
  addResult: (result: TResult | ToolResponse<TResult>) => void;
  resume: (payload: unknown) => void;
  respondToApproval: (response: ToolApprovalResponse) => Promise<void>;
  unstable_recordInteraction?: ((input: Unstable_ToolInteractionInput) => Promise<void>) | undefined;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt" | "tool-calls";
} | {
  readonly type: "incomplete";
  readonly reason: "tool-calls";
  readonly error?: ReadonlyJSONValue;
} | MessagePartStatus;

interface ToolCallReader<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  args: ToolCallArgsReader<TArgs>;
  response: ToolCallResponseReader<TResult>;
  result: {
    get: () => Promise<TResult>;
  };
}

type ToolCallRequest = {
  name: string;
  arguments?: Record<string, unknown>;
};

interface ToolCallResponseReader<TResult> {
  get: () => Promise<ToolResponse<TResult>>;
}

type ToolCallRunningText<TArgs extends Record<string, unknown>, TValue> = TValue | undefined | null | ((options: {
  args: TArgs;
}) => TValue | undefined | null);

type ToolCallText<TArgs extends Record<string, unknown>, TResult> = ToolCallText$1<TArgs, TResult, ReactNode>;

type ToolCallText$1<TArgs extends Record<string, unknown>, TResult, TValue = string> = {
  running: ToolCallRunningText<TArgs, TValue>;
  complete?: ToolCallCompleteText<TArgs, TResult, TValue> | undefined;
} | {
  running?: ToolCallRunningText<TArgs, TValue> | undefined;
  complete: ToolCallCompleteText<TArgs, TResult, TValue>;
};

type ToolCallTiming = MessagePartTiming;

type ToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

type ToolDefinition$1<Input, Output> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Promise<Output>;
};

type ToolDisplay = "inline" | "standalone";

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
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

type Toolkit = Record<string, ToolDefinition<any, any>>;

type ToolkitDisplay = "inline" | "standalone";

type ToolkitExecution = "backend" | "frontend";

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

type UiMessageParams = {
  role?: string;
  content?: {
    type: string;
    text?: string;
  }[];
  [key: string]: unknown;
};

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

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

type Unstable_ToolInteractionInput = {
  readonly type: Unstable_ToolInteraction["type"];
  readonly payload: unknown;
};

type Unstable_ToolInteractionLog = {
  readonly entries: readonly Unstable_ToolInteraction[];
  readonly omitted?: number;
};

type Unsubscribe = () => void;

type UseSpecStreamOptions = {
  source?: string;
  complete?: boolean;
  mode?: SpecStreamMode;
  initial?: Spec;
};

type UseSpecStreamResult = {
  spec: Spec;
  text: string;
  errors: SpecStreamError[];
  push(chunk: string): void;
  end(): void;
  reset(): void;
};

type UseWidgetOptions = Omit<CreateWidgetOptions, "code" | "container">;

type UseWidgetResult = {
  ref: (element: HTMLElement | null) => void;
  widget: WidgetHandle | null;
};

type ValidateClient<K extends string, TClient> = K extends ReservedScopeNames ? ClientError<`ERROR: ${K} is a reserved scope name`> : unknown extends ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> ? TClient : ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> & ClientError<never>;

type ValidateEvents<K extends string, TClient> = "events" extends keyof TClient ? TClient["events"] extends ClientEventsType<K> ? unknown : ClientError<`ERROR: ${K} has invalid events type`> : unknown;

type ValidateMeta<K extends string, TClient> = "meta" extends keyof TClient ? TClient["meta"] extends ClientMetaType ? unknown : ClientError<`ERROR: ${K} has invalid meta type`> : unknown;

type ValidateMethods<K extends string, TClient> = TClient extends {
  methods: ClientMethods;
} ? keyof TClient["methods"] & ReservedAccessorProps extends never ? unknown : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`> : ClientError<`ERROR: ${K} has invalid methods type`>;

type ValidateOptions = {
  skip?: (value: unknown) => boolean;
};

type ValidateSpecOptions = {
  partial?: boolean;
};

declare const WIDGET_MODULES: readonly [
  "diagram",
  "chart",
  "data_viz",
  "interactive",
  "mockup",
  "elicitation",
  "art"
];

declare function Widget(_param2: WidgetProps): import("react").JSX.Element;

type WidgetAgent = {
  tool: ToolDefinition$1<GenerateWidgetInput, GenerateWidgetResult>;
  generate(input: GenerateWidgetInput, options?: GenerateOptions): Promise<GenerateWidgetResult>;
};

type WidgetAgentEvent = {
  type: "start";
  title: string;
  mode: WidgetMode;
} | {
  type: "status";
  text: string;
} | {
  type: "text-delta";
  text: string;
} | {
  type: "code-delta";
  title: string;
  delta: string;
  code: string;
} | {
  type: "code";
  title: string;
  code: string;
} | {
  type: "spec";
  title: string;
  spec: Spec;
  streaming: boolean;
} | {
  type: "feedback";
  title: string;
  ok: boolean;
  text: string;
  round: number;
} | {
  type: "done";
  result: GenerateWidgetResult;
};

type WidgetAgentModel = (messages: readonly AgentMessage[], options: {
  tools: readonly AgentToolDeclaration[];
  signal?: AbortSignal;
}) => AsyncIterable<AgentModelEvent>;

type WidgetEdit = {
  old_string: string;
  new_string: string;
};

type WidgetError = {
  kind: WidgetErrorKind;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
};

type WidgetErrorKind = "csp" | "error" | "resource" | "script" | "unhandledrejection";

type WidgetEventMap = {
  ready: undefined;
  resize: WidgetSize;
  error: WidgetError;
  log: ConsoleEntry;
  end: EndResult;
};

type WidgetHandle = {
  readonly ready: Promise<void>;
  readonly code: string;
  readonly ended: boolean;
  readonly iframe: HTMLIFrameElement | undefined;
  write(chunk: string): void;
  end(): Promise<EndResult>;
  replace(code: string): Promise<EndResult>;
  setTheme(tokens: ThemeTokens): void;
  setContext(context: HostContext): void;
  notifyToolInput(args: Record<string, unknown>, options?: {
    partial?: boolean;
  }): void;
  notifyToolResult(result: unknown): void;
  screenshot(options?: ScreenshotOptions): Promise<Screenshot>;
  inspect(): Promise<WidgetInspection>;
  on<K extends keyof WidgetEventMap>(event: K, listener: (payload: WidgetEventMap[K]) => void): () => void;
  dispose(): void;
};

type WidgetHandlers = {
  onPrompt?: (text: string) => unknown;
  onMessage?: (params: UiMessageParams) => unknown;
  onOpenLink?: (url: string) => unknown;
  onCallTool?: (call: ToolCallRequest) => unknown;
  onRequestDisplayMode?: (request: {
    mode: DisplayMode;
  }) => unknown;
  onUpdateModelContext?: (params: unknown) => unknown;
  onWidgetState?: (state: unknown) => void;
  onResize?: (size: WidgetSize) => void;
  onError?: (error: WidgetError) => void;
  onLog?: (entry: ConsoleEntry) => void;
};

type WidgetInspection = FrameInspection & {
  code: string;
};

type WidgetInstructionsOptions = {
  preload?: ReadMeInput;
};

type WidgetKind = "html" | "svg";

type WidgetMode = "html" | "spec";

type WidgetModule = (typeof WIDGET_MODULES)[number];

type WidgetProps = UseWidgetOptions & {
  code: string;
  streaming?: boolean;
  className?: string;
  style?: CSSProperties;
};

type WidgetRecord = {
  title: string;
  code: string;
  version: number;
};

type WidgetRegistry = {
  get(title: string): WidgetRecord | undefined;
  set(title: string, code: string): WidgetRecord;
  delete(title: string): boolean;
  list(): WidgetRecord[];
  subscribe(listener: (record: WidgetRecord) => void): () => void;
};

type WidgetRenderReport = {
  status: "rendered";
  ok: boolean;
  blank: boolean;
  height: number;
  errors: WidgetError[];
  console: ConsoleEntry[];
  feedback: string;
} | {
  status: "timeout";
  feedback: string;
};

type WidgetSink = {
  write?(chunk: string): void;
  end?(): Promise<unknown>;
  replace?(code: string): Promise<unknown>;
  inspect?(): Promise<Pick<WidgetInspection, "blank" | "console" | "errors" | "size">>;
  spec?(spec: Spec, info: {
    streaming: boolean;
  }): void;
};

type WidgetSize = {
  width: number;
  height: number;
};

type WidgetToolkit = {
  toolkit: Toolkit;
  tools: WidgetTools & Record<string, AnyTool>;
  registry: WidgetRegistry;
};

type WidgetToolkitExtension = {
  tools: Record<string, AnyTool>;
  modules?: readonly GuidanceModule[];
  entries(context: {
    execution: ToolkitExecution;
    display: ToolkitDisplay;
  }): Record<string, unknown>;
};

type WidgetToolkitOptions = Omit<CreateWidgetToolsOptions, "registry"> & {
  registry?: WidgetRegistry;
  execution?: "backend" | "frontend";
  widget?: Omit<UseWidgetOptions, "tokens">;
  spec?: WidgetToolkitExtension;
  extraTools?: Record<string, AnyTool>;
  themeElement?: Element | null;
  display?: ToolkitDisplay;
  renderReport?: RenderReportOptions | false;
  previewScreenshot?: boolean;
  widgetId?: false | ((call: {
    toolCallId: string;
  }) => string);
};

type WidgetTools = {
  read_me: ToolDefinition$1<ReadMeInput, string>;
  show_widget: ToolDefinition$1<ShowWidgetInput, ShowWidgetResult>;
  edit_widget: ToolDefinition$1<EditWidgetInput, EditWidgetResult>;
  preview_widget: ToolDefinition$1<PreviewWidgetInput, PreviewResult>;
};

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
} ? T & (T extends {
  type: "frontend";
} ? {
  render: ToolCallMessagePartComponent<TArgs, TResult>;
} | {
  render?: ToolCallMessagePartComponent<TArgs, TResult>;
  renderText: ToolCallText<TArgs, TResult>;
} : {
  render: ToolCallMessagePartComponent<TArgs, TResult>;
}) : T & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  renderText?: ToolCallText<TArgs, TResult> | undefined;
};

type WriteOptions = {
  createMissing?: boolean;
};

declare namespace entry_agent_exports {
  export { AISDKModelOptions, AgentMessage, AgentModelEvent, AgentToolCall, AgentToolDeclaration, CreateWidgetAgentOptions, GenerateOptions, GenerateWidgetInput, GenerateWidgetResult, WidgetAgent, WidgetAgentEvent, WidgetAgentModel, WidgetMode, WidgetSink, createWidgetAgent, fromAISDK, parsePartialJson };
}

declare function applyPatch<T>(doc: T, operations: readonly PatchOperation[], options?: WriteOptions): T;

declare function applyPatchOperation<T>(doc: T, operation: PatchOperation, options?: WriteOptions): T;

declare function applyWidgetEdits(code: string, edits: readonly WidgetEdit[]): ApplyEditsResult;

declare namespace entry_assistant_ui_exports {
  export { ASSISTANT_UI_TOKEN_SOURCES, MessageLike, RenderReportOptions, ToolkitDisplay, ToolkitExecution, WidgetRenderReport, WidgetToolkit, WidgetToolkitExtension, WidgetToolkitOptions, createWidgetToolkit, resolveWidgetCode, resolveWidgetOrigin, useAssistantUiThemeTokens, useWidgetInstructions };
}

declare namespace entry_spec_assistant_ui_exports {
  export { SpecToolkitOptions, createSpecToolkit, resolveSpecBase };
}

declare function buildBootstrapHtml(options: BootstrapOptions): string;

declare function buildCsp(options?: CspOptions): string;

declare function buildModuleGuidance(module: WidgetModule, options?: GuidanceOptions): string;

declare function buildRepairFeedback(report: RenderReport, options?: {
  round?: number;
  ok?: boolean;
  consoleLimit?: number;
  includeScreenshot?: boolean;
}): RepairFeedback;

declare function buildSpecPrompt(catalog: Catalog, options?: SpecPromptOptions): string;

declare function buildWidgetGuidance(options?: GuidanceOptions): string;

declare function buildWidgetInstructions(tools: WidgetTools & Record<string, AnyTool>, options?: WidgetInstructionsOptions): Promise<string>;

declare function checkPatchOperation(value: unknown): {
  ok: true;
  op: PatchOperation;
} | {
  ok: false;
  error: string;
};

declare function clearWidgetStorage(id: string, options?: Pick<CreateWidgetOptions, "product" | "readyTimeoutMs">): Promise<ClearStorageResult>;

declare function createActionDispatcher(options: ActionDispatcherOptions): ActionDispatcher;

declare function createRpcPeer(endpoint: RpcEndpoint, handlers?: RpcHandlers): RpcPeer;

declare function createSpecStream(options?: CreateSpecStreamOptions): SpecStream;

declare function createSpecToolkit(catalog: Catalog, options: SpecToolkitOptions): WidgetToolkitExtension;

declare function createSpecTools(catalog: Catalog, options?: CreateSpecToolsOptions): SpecTools;

declare function createStateStore(initial?: Record<string, unknown>): SpecStateStore;

declare function createWidget(options: CreateWidgetOptions): WidgetHandle;

declare function createWidgetAgent(options: CreateWidgetAgentOptions): WidgetAgent;

declare function createWidgetRegistry(initial?: Iterable<{
  title: string;
  code: string;
}>): WidgetRegistry;

declare function createWidgetToolkit(options?: WidgetToolkitOptions): WidgetToolkit;

declare function createWidgetTools<Extra extends Record<string, AnyTool> = Record<never, never>>(options?: CreateWidgetToolsOptions & {
  extraTools?: Extra;
}): WidgetTools & Extra;

declare const defaultThemeTokens: (scheme: ColorScheme) => ThemeTokens;

declare function defineCatalog<const TComponents extends Record<string, ComponentDefinition>, const TActions extends Record<string, ActionDefinition> = Record<never, ActionDefinition>>(definition: CatalogDefinition<TComponents, TActions>): Catalog<TComponents, TActions>;

declare const describeSchema: (schema: JsonSchema | undefined) => string;

declare function detectColorScheme(element: Element): ColorScheme;

declare function detectWidgetKind(code: string): WidgetKind;

declare const emptySpec: () => Spec;

declare const escapePointerToken: (token: string | number) => string;

declare function evaluateCondition(condition: Condition | undefined, ctx: ExpressionContext): boolean;

declare function formatSpecIssues(issues: readonly SpecIssue[]): string;

declare function fromAISDK<Schema>(options: AISDKModelOptions<Schema>): WidgetAgentModel;

declare function getAtPointer(doc: unknown, pointer: string | string[]): unknown;

declare function getToolDeclarations<T extends Record<string, AnyTool>>(tools: T): {
  [K in keyof T]: {
    description: string;
    inputSchema: JsonSchema;
  };
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: any;
  }
}

declare namespace entry_root_exports {
  export { BootstrapOptions, ClearStorageResult, ColorScheme, Compat, ConsoleEntry, ConsoleLevel, CreateWidgetOptions, CspOptions, DEFAULT_CDN_ORIGINS, DEFAULT_DARK_TOKENS, DEFAULT_FONT_ORIGINS, DEFAULT_FONT_STYLE_ORIGINS, DEFAULT_LIGHT_TOKENS, DEFAULT_TOKEN_SOURCES, DisplayMode, EndResult, FrameInspection, GENFRAME_PROTOCOL_VERSION, HostContext, METHODS, PreviewOptions, PreviewResult, RPC_ERROR, RpcEndpoint, RpcError, RpcHandlers, RpcPeer, Screenshot, ScreenshotOptions, THEME_TOKENS, ThemeTokenInfo, ThemeTokenName, ThemeTokenSources, ThemeTokens, ToolCallRequest, UiMessageParams, WidgetError, WidgetErrorKind, WidgetEventMap, WidgetHandle, WidgetHandlers, WidgetInspection, WidgetKind, WidgetSize, buildBootstrapHtml, buildCsp, clearWidgetStorage, createRpcPeer, createWidget, defaultThemeTokens, detectColorScheme, detectWidgetKind, previewWidget, readThemeTokens, runtimeSource as runtime, themeContext, themeVariables, toMcpAppsVariables, widgetStorageSalt };
}

declare const isExpression: (value: unknown) => value is Record<string, unknown>;

declare const itemPointer: (path: string, index: number) => string;

declare const joinPointer: (tokens: readonly (string | number)[]) => string;

declare function normalizeModules(modules?: readonly string[]): WidgetModule[];

declare function parsePartialJson(text: string): unknown;

declare function parsePointer(pointer: string): string[];

declare function parseSpecStream(source: string, options?: CreateSpecStreamOptions): SpecStreamResult;

declare function planCodeUpdate(current: string, next: string): CodeUpdate;

declare function previewWidget(code: string, options?: PreviewOptions): Promise<PreviewResult>;

declare namespace entry_prompts_exports {
  export { GuidanceOptions, HostApiOptions, MODULE_SUMMARIES, Platform, WIDGET_MODULES, WidgetModule, buildModuleGuidance, buildWidgetGuidance, normalizeModules };
}

declare namespace entry_react_exports {
  export { CodeUpdate, ThemeObserveOptions, UseWidgetOptions, UseWidgetResult, Widget, WidgetProps, planCodeUpdate, syncWidgetCode, useThemeTokens, useWidget };
}

declare namespace entry_spec_react_exports {
  export { SpecComponentProps, SpecComponents, SpecPlaceholder, SpecPlaceholderProps, SpecRenderer, SpecRendererProps, UseSpecStreamOptions, UseSpecStreamResult, useSpecStream };
}

declare function readThemeTokens(element?: Element, sources?: ThemeTokenSources): ThemeTokens;

declare function renderTemplate(template: string, ctx: ExpressionContext): string;

declare function repairLoop(options: RepairLoopOptions): Promise<RepairLoopResult>;

declare namespace entry_repair_exports {
  export { GenerateContext, GenerateResult, RenderReport, RepairFeedback, RepairLoopOptions, RepairLoopResult, RepairRound, buildRepairFeedback, repairLoop };
}

declare function resolveProps(props: Record<string, unknown> | undefined, ctx: ExpressionContext): ResolvedProps;

declare function resolveSpecBase(messages: readonly MessageLike[], toolCallId: string, title: string): Spec | undefined;

declare function resolveValue(value: unknown, ctx: ExpressionContext): unknown;

declare function resolveWidgetCode(messages: readonly MessageLike[], toolCallId: string): string | undefined;

declare function resolveWidgetOrigin(messages: readonly MessageLike[], toolCallId: string): string | undefined;

declare const runtimeSource: string;

declare function specGuidanceModule(catalog: Catalog, options?: Omit<SpecPromptOptions, "mode">): GuidanceModule;

declare namespace entry_spec_exports {
  export { ActionBinding, ActionDefinition, ActionDispatcher, ActionDispatcherOptions, ActionHandler, ActionSource, Catalog, CatalogDefinition, ComponentDefinition, Condition, CreateSpecStreamOptions, ExpressionContext, JsonSchema, JsonSchemaType, PatchOperation, PropsSchema, ResolvedProps, SET_STATE_ACTION, SchemaIssue, Spec, SpecElement, SpecIssue, SpecIssueCode, SpecPromptOptions, SpecStateStore, SpecStream, SpecStreamError, SpecStreamMode, SpecStreamResult, SpecStreamUpdate, SpecValidation, StandardSchemaLike, StateListener, ValidateSpecOptions, applyPatch, applyPatchOperation, buildSpecPrompt, checkPatchOperation, createActionDispatcher, createSpecStream, createStateStore, defineCatalog, describeSchema, emptySpec, escapePointerToken, evaluateCondition, formatSpecIssues, getAtPointer, isExpression, itemPointer, joinPointer, parsePointer, parseSpecStream, renderTemplate, resolveProps, resolveValue, validateJsonSchema, validateSchema, validateSpec };
}

declare function syncWidgetCode(widget: Pick<WidgetHandle, "code" | "end" | "ended" | "replace" | "write">, code: string, streaming: boolean): void;

declare function themeContext(tokens: ThemeTokens): HostContext;

declare function themeVariables(tokens: ThemeTokens): Record<string, string>;

declare function toAISDKTools<T extends Record<string, AnyTool>, Schema>(tools: T, sdk: {
  jsonSchema: (schema: JsonSchema) => Schema;
}): {
  [K in keyof T]: {
    description: string;
    inputSchema: Schema;
    execute: T[K]["execute"];
  };
};

declare function toMcpAppsVariables(tokens: ThemeTokens): Record<string, string>;

declare namespace entry_spec_tools_exports {
  export { CreateSpecToolsOptions, GuidanceModule, JsonSchema, RenderSpecInput, RenderSpecResult, RenderSpecTool, SpecStreaming, SpecTools, ToolDefinition$1 as ToolDefinition, createSpecTools, getToolDeclarations, specGuidanceModule, toAISDKTools };
}

declare namespace entry_tools_exports {
  export { AnyTool, ApplyEditsResult, CreateWidgetToolsOptions, EditWidgetInput, EditWidgetResult, GuidanceModule, JsonSchema, PreviewWidgetInput, ReadMeInput, ReadMeModule, ShowWidgetInput, ShowWidgetResult, ToolDefinition$1 as ToolDefinition, WidgetEdit, WidgetInstructionsOptions, WidgetRecord, WidgetRegistry, WidgetTools, applyWidgetEdits, buildWidgetInstructions, createWidgetRegistry, createWidgetTools, getToolDeclarations, toAISDKTools };
}

declare function useAssistantUiThemeTokens(element?: Element | null): ThemeTokens;

declare function useSpecStream(options?: UseSpecStreamOptions): UseSpecStreamResult;

declare function useThemeTokens(element?: Element | null, sources?: ThemeTokenSources, options?: ThemeObserveOptions): ThemeTokens;

declare function useWidget(options?: UseWidgetOptions): UseWidgetResult;

declare function useWidgetInstructions(tools: WidgetTools & Record<string, AnyTool>, options?: WidgetInstructionsOptions): void;

declare function validateJsonSchema(schema: JsonSchema, value: unknown, options?: ValidateOptions, path?: string): SchemaIssue[];

declare function validateSchema(schema: JsonSchema | StandardSchemaLike, value: unknown, options?: ValidateOptions): SchemaIssue[];

declare function validateSpec(spec: Spec, catalog: Catalog, options?: ValidateSpecOptions): SpecValidation;

declare const widgetStorageSalt: (id: string) => string;

export { entry_agent_exports as entry_agent, entry_assistant_ui_exports as entry_assistant_ui, entry_prompts_exports as entry_prompts, entry_react_exports as entry_react, entry_repair_exports as entry_repair, entry_root_exports as entry_root, entry_spec_exports as entry_spec, entry_spec_assistant_ui_exports as entry_spec_assistant_ui, entry_spec_react_exports as entry_spec_react, entry_spec_tools_exports as entry_spec_tools, entry_tools_exports as entry_tools };
