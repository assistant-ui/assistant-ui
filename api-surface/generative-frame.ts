import { CSSProperties } from "react";

type AnyTool = ToolDefinition<never, unknown>;

type ApplyEditsResult = {
  ok: true;
  code: string;
} | {
  ok: false;
  error: string;
  index: number;
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

type ConsoleEntry = {
  level: ConsoleLevel;
  message: string;
};

type ConsoleLevel = "debug" | "error" | "info" | "log" | "warn";

type CreateWidgetOptions = WidgetHandlers & {
  container: HTMLElement;
  product?: string;
  frame?: SafeContentFrame;
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

type FrameInspection = {
  kind: WidgetKind;
  ended: boolean;
  size: WidgetSize;
  blank: boolean;
  errors: WidgetError[];
  console: ConsoleEntry[];
};

declare const GENFRAME_PROTOCOL_VERSION = "2026-01-26";

type GenerateContext = {
  round: number;
  previousCode: string | undefined;
  feedback: RepairFeedback | undefined;
};

type GenerateResult = string | {
  edits: WidgetEdit[];
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
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: readonly string[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean;
};

declare const METHODS: {
  readonly write: "genframe/write";
  readonly end: "genframe/end";
  readonly replace: "genframe/replace";
  readonly screenshot: "genframe/screenshot";
  readonly inspect: "genframe/inspect";
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

type Platform = "desktop" | "mobile";

type PreviewOptions = Pick<CreateWidgetOptions, "compat" | "csp" | "css" | "frame" | "product" | "readyTimeoutMs"> & {
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

declare const RPC_ERROR: {
  readonly parseError: -32700;
  readonly invalidRequest: -32600;
  readonly methodNotFound: -32601;
  readonly invalidParams: -32602;
  readonly internalError: -32603;
};

type ReadMeInput = {
  modules?: WidgetModule[];
  platform?: Platform;
};

type RenderReport = {
  errors: WidgetError[];
  console: ConsoleEntry[];
  blank: boolean;
  height?: number;
  screenshot?: string;
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

declare const THEME_TOKENS: readonly ThemeTokenInfo[];

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

type ToolCallRequest = {
  name: string;
  arguments?: Record<string, unknown>;
};

type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Promise<Output>;
};

type UiMessageParams = {
  role?: string;
  content?: {
    type: string;
    text?: string;
  }[];
  [key: string]: unknown;
};

type UseWidgetOptions = Omit<CreateWidgetOptions, "code" | "container">;

type UseWidgetResult = {
  ref: (element: HTMLElement | null) => void;
  widget: WidgetHandle | null;
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

declare function Widget(_param0: WidgetProps): import("react").JSX.Element;

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

type WidgetKind = "html" | "svg";

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

type WidgetSize = {
  width: number;
  height: number;
};

type WidgetTools = {
  read_me: ToolDefinition<ReadMeInput, string>;
  show_widget: ToolDefinition<ShowWidgetInput, ShowWidgetResult>;
  edit_widget: ToolDefinition<EditWidgetInput, EditWidgetResult>;
  preview_widget: ToolDefinition<PreviewWidgetInput, PreviewResult>;
};

declare function applyWidgetEdits(code: string, edits: readonly WidgetEdit[]): ApplyEditsResult;

declare function buildBootstrapHtml(options: BootstrapOptions): string;

declare function buildCsp(options?: CspOptions): string;

declare function buildModuleGuidance(module: WidgetModule, options?: GuidanceOptions): string;

declare function buildRepairFeedback(report: RenderReport, options?: {
  round?: number;
  ok?: boolean;
  consoleLimit?: number;
  includeScreenshot?: boolean;
}): RepairFeedback;

declare function buildWidgetGuidance(options?: GuidanceOptions): string;

declare function createRpcPeer(endpoint: RpcEndpoint, handlers?: RpcHandlers): RpcPeer;

declare function createWidget(options: CreateWidgetOptions): WidgetHandle;

declare function createWidgetRegistry(initial?: Iterable<{
  title: string;
  code: string;
}>): WidgetRegistry;

declare function createWidgetTools(options?: CreateWidgetToolsOptions): WidgetTools;

declare const defaultThemeTokens: (scheme: ColorScheme) => ThemeTokens;

declare function detectColorScheme(element: Element): ColorScheme;

declare function detectWidgetKind(code: string): WidgetKind;

declare namespace entry_root_exports {
  export { BootstrapOptions, ColorScheme, Compat, ConsoleEntry, ConsoleLevel, CreateWidgetOptions, CspOptions, DEFAULT_CDN_ORIGINS, DEFAULT_DARK_TOKENS, DEFAULT_FONT_ORIGINS, DEFAULT_FONT_STYLE_ORIGINS, DEFAULT_LIGHT_TOKENS, DEFAULT_TOKEN_SOURCES, DisplayMode, EndResult, FrameInspection, GENFRAME_PROTOCOL_VERSION, HostContext, METHODS, PreviewOptions, PreviewResult, RPC_ERROR, RpcEndpoint, RpcError, RpcHandlers, RpcPeer, Screenshot, ScreenshotOptions, THEME_TOKENS, ThemeTokenInfo, ThemeTokenName, ThemeTokenSources, ThemeTokens, ToolCallRequest, UiMessageParams, WidgetError, WidgetErrorKind, WidgetEventMap, WidgetHandle, WidgetHandlers, WidgetInspection, WidgetKind, WidgetSize, buildBootstrapHtml, buildCsp, createRpcPeer, createWidget, defaultThemeTokens, detectColorScheme, detectWidgetKind, previewWidget, readThemeTokens, runtimeSource as runtime, themeContext, themeVariables, toMcpAppsVariables };
}

declare function normalizeModules(modules?: readonly string[]): WidgetModule[];

declare function planCodeUpdate(current: string, next: string): CodeUpdate;

declare function previewWidget(code: string, options?: PreviewOptions): Promise<PreviewResult>;

declare namespace entry_prompts_exports {
  export { GuidanceOptions, HostApiOptions, MODULE_SUMMARIES, Platform, WIDGET_MODULES, WidgetModule, buildModuleGuidance, buildWidgetGuidance, normalizeModules };
}

declare namespace entry_react_exports {
  export { CodeUpdate, UseWidgetOptions, UseWidgetResult, Widget, WidgetProps, planCodeUpdate, syncWidgetCode, useThemeTokens, useWidget };
}

declare function readThemeTokens(element?: Element, sources?: ThemeTokenSources): ThemeTokens;

declare function repairLoop(options: RepairLoopOptions): Promise<RepairLoopResult>;

declare namespace entry_repair_exports {
  export { GenerateContext, GenerateResult, RenderReport, RepairFeedback, RepairLoopOptions, RepairLoopResult, RepairRound, buildRepairFeedback, repairLoop };
}

declare const runtimeSource: string;

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

declare namespace entry_tools_exports {
  export { ApplyEditsResult, CreateWidgetToolsOptions, EditWidgetInput, EditWidgetResult, JsonSchema, PreviewWidgetInput, ReadMeInput, ShowWidgetInput, ShowWidgetResult, ToolDefinition, WidgetEdit, WidgetRecord, WidgetRegistry, WidgetTools, applyWidgetEdits, createWidgetRegistry, createWidgetTools, toAISDKTools };
}

declare function useThemeTokens(element?: Element | null, sources?: ThemeTokenSources): ThemeTokens;

declare function useWidget(options?: UseWidgetOptions): UseWidgetResult;

export { entry_prompts_exports as entry_prompts, entry_react_exports as entry_react, entry_repair_exports as entry_repair, entry_root_exports as entry_root, entry_tools_exports as entry_tools };
