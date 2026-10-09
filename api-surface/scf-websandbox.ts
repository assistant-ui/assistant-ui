interface API {
  [method: string]: LocalMethod;
}

declare const BaseOptions: Readonly<ResolvedOptions>;

interface Connection {
  remote: RemoteAPI;
  localApi: API;
  setLocalApi(api: API): Promise<void>;
  remoteMethodsWaitPromise: Promise<void>;
}

type LocalMethod = (...args: any[]) => unknown;

interface Options {
  frameContainer?: string | Element;
  frameClassName?: string;
  frameSrc?: string | null;
  frameContent?: string;
  codeToRunBeforeInit?: string | null;
  initialStyles?: string | null;
  baseUrl?: string | null;
  allowPointerLock?: boolean;
  allowFullScreen?: boolean;
  sandboxAdditionalAttributes?: string;
  product?: string;
  safeContentFrame?: Omit<SafeContentFrameOptions, "sandbox">;
  unsafeDocumentWrite?: boolean;
  loadTimeout?: number;
}

type PluginInstance = Websandbox;

interface RemoteAPI {
  [method: string]: (...args: any[]) => Promise<any>;
}

type ResolvedOptions = Required<Omit<Options, "frameContainer" | "safeContentFrame">> & {
  frameContainer: string | Element;
  safeContentFrame: Omit<SafeContentFrameOptions, "sandbox">;
};

interface SafeContentFrameOptions {
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  sandbox?: SandboxOption[];
  salt?: string;
}

type SandboxOption = "allow-downloads" | "allow-forms" | "allow-modals" | "allow-popups" | "allow-popups-to-escape-sandbox" | "allow-same-origin" | "allow-scripts";

declare class Websandbox {
  #private;
  static create(localApi?: API | null, options?: Options): Websandbox;
  readonly options: Readonly<ResolvedOptions>;
  readonly connection: Connection;
  readonly promise: Promise<Websandbox>;
  constructor(localApi: API | null | undefined, options?: Options);
  get iframe(): HTMLIFrameElement | null;
  get origin(): string | null;
  run(codeOrFunction: string | ((...args: never[]) => unknown)): Promise<unknown>;
  importScript(path: string): Promise<unknown>;
  injectStyle(style: string): Promise<void>;
  destroy(): void;
}

declare namespace entry_root_exports {
  export { API, BaseOptions, Connection, Options, PluginInstance, RemoteAPI, Websandbox as default };
}

export { entry_root_exports as entry_root };
