import "@standard-schema/spec";

import "json-schema";

import "react";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
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

type HostToWebviewMessage = FetchHeadMessage | FetchChunkMessage | FetchEndMessage | FetchErrorMessage | RpcResponseMessage;

type HttpMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";

type LinkInterceptorOptions = {
  schemes?: readonly string[];
  onError?: (error: unknown) => void;
  port?: VSCodeBridgePort;
};

type MementoLike = {
  get(key: string): unknown;
  update(key: string, value: unknown): PromiseLike<void>;
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

type RpcRequestMessage = BridgeEnvelope<"rpc:request"> & {
  method: string;
  params: unknown[];
};

type RpcResponseMessage = BridgeEnvelope<"rpc:response"> & ({
  ok: true;
  result: unknown;
} | {
  ok: false;
  message: string;
});

type ServeWebviewHostOptions = ServeWebviewRoutesOptions & {
  routes?: WebviewRoutes;
  openExternal?: (url: string) => PromiseLike<boolean> | boolean | void;
  externalSchemes?: readonly string[];
  storage?: MementoLike;
  storagePrefix?: string;
};

type ServeWebviewRoutesOptions = {
  flushInterval?: number;
  flushSize?: number;
  onError?: (error: unknown) => void;
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

type WebviewToHostMessage = FetchRequestMessage | FetchAbortMessage | RpcRequestMessage;

declare function createCspNonce(): string;

declare function createVSCodeFetch(port?: VSCodeBridgePort): VSCodeFetch;

declare function createVSCodeStorage(port?: VSCodeBridgePort): AsyncStorageLike;

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
  export { BridgeHeaders, BridgeMessage, Disposable, FetchAbortMessage, FetchChunkMessage, FetchEndMessage, FetchErrorMessage, FetchHeadMessage, FetchRequestMessage, HostToWebviewMessage, HttpMethod, MementoLike, RenderWebviewHtmlOptions, RouteHandler, RouteHandlers, RpcRequestMessage, RpcResponseMessage, ServeWebviewHostOptions, ServeWebviewRoutesOptions, VSCODE_BRIDGE_CHANNEL, VSCODE_VIRTUAL_ORIGIN, WebviewCspMode, WebviewCspOptions, WebviewCspSource, WebviewLike, WebviewResourceLike, WebviewRoutes, WebviewSurface, WebviewToHostMessage, createCspNonce, createWebviewCsp, isHostToWebviewMessage, isWebviewToHostMessage, renderWebviewHtml, serveWebviewHost, serveWebviewRoutes };
}

declare function installLinkInterceptor(_param0?: LinkInterceptorOptions): () => void;

declare const isHostToWebviewMessage: (value: unknown) => value is HostToWebviewMessage;

declare const isWebviewToHostMessage: (value: unknown) => value is WebviewToHostMessage;

declare function renderWebviewHtml<U>(webview: WebviewResourceLike<U>, options: RenderWebviewHtmlOptions<U>): string;

declare function serveWebviewHost(webview: WebviewLike, _param1?: ServeWebviewHostOptions): Disposable;

declare function serveWebviewRoutes(webview: WebviewLike, routes: WebviewRoutes, options?: ServeWebviewRoutesOptions): Disposable;

declare const vscodeFetch: VSCodeFetch;

declare namespace entry_webview_exports {
  export { BridgeHeaders, BridgeMessage, FetchAbortMessage, FetchChunkMessage, FetchEndMessage, FetchErrorMessage, FetchHeadMessage, FetchRequestMessage, HostToWebviewMessage, LinkInterceptorOptions, RpcRequestMessage, RpcResponseMessage, VSCODE_BRIDGE_CHANNEL, VSCODE_VIRTUAL_ORIGIN, VSCodeApi, VSCodeBridgePort, VSCodeFetch, WebviewToHostMessage, createVSCodeFetch, createVSCodeStorage, getCspNonce, getVSCodeApi, installLinkInterceptor, isHostToWebviewMessage, isWebviewToHostMessage, vscodeFetch };
}

export { entry_host_exports as entry_host, entry_webview_exports as entry_webview };
