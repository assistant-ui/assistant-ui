import {
  isShimLoadError,
  type RenderedFrame,
  SafeContentFrame,
  type SafeContentFrameOptions,
  type SandboxOption,
} from "safe-content-frame";
import { type API, type Connection, HostConnection } from "./connection";
import {
  CONNECT_MESSAGE,
  frameRuntimeScript,
  HELLO_MESSAGE,
} from "./frameRuntime";

export const DEFAULT_PRODUCT = "websandbox";
export const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

export interface Options {
  /** A selector or element the sandbox iframe is appended to. */
  frameContainer?: string | Element;
  frameClassName?: string;
  /** Not supported: Safe Content Frame always serves the frame document. */
  frameSrc?: string | null;
  /** The sandbox document. It must contain a `<head>` tag. */
  frameContent?: string;
  /** Inline script placed first in `<head>`, before `Websandbox` exists. */
  codeToRunBeforeInit?: string | null;
  initialStyles?: string | null;
  /** Emitted as `<base href>` so relative URLs resolve against it. */
  baseUrl?: string | null;
  /** Adds the `allow-pointer-lock` sandbox flag. */
  allowPointerLock?: boolean;
  /** Grants the frame the `fullscreen` permission. */
  allowFullScreen?: boolean;
  /** Space-separated extra `sandbox` flags. */
  sandboxAdditionalAttributes?: string;
  /** Safe Content Frame product id, which scopes the frame's hashed origin. */
  product?: string;
  /** Options passed through to `SafeContentFrame`. */
  safeContentFrame?: Omit<SafeContentFrameOptions, "sandbox">;
  /**
   * Writes the document into the shim with `document.write` instead of
   * navigating to a Blob URL, so `location` is an `https:` URL.
   */
  unsafeDocumentWrite?: boolean;
  /** How long the Safe Content Frame shim may take to acknowledge the content. */
  loadTimeout?: number;
}

type ResolvedOptions = Required<
  Omit<Options, "safeContentFrame" | "frameContainer">
> & {
  frameContainer: string | Element;
  safeContentFrame: Omit<SafeContentFrameOptions, "sandbox">;
};

export const BaseOptions: Readonly<ResolvedOptions> = Object.freeze({
  frameContainer: "body",
  frameClassName: "websandbox__frame",
  frameSrc: null,
  frameContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body></body>
</html>
  `,
  codeToRunBeforeInit: null,
  initialStyles: null,
  baseUrl: null,
  allowPointerLock: false,
  allowFullScreen: false,
  sandboxAdditionalAttributes: "",
  product: DEFAULT_PRODUCT,
  safeContentFrame: {},
  unsafeDocumentWrite: false,
  loadTimeout: DEFAULT_LOAD_TIMEOUT_MS,
});

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function insertAfterHeadOpen(html: string, snippet: string) {
  return html.replace("<head>", () => `<head>\n${snippet}`);
}

function insertBeforeHeadClose(html: string, snippet: string) {
  return html.replace("</head>", () => `${snippet}\n</head>`);
}

export function prepareFrameContent(
  options: Pick<
    ResolvedOptions,
    "frameContent" | "initialStyles" | "baseUrl" | "codeToRunBeforeInit"
  >,
  runtimeScript: string,
) {
  let html = insertBeforeHeadClose(
    options.frameContent,
    `<script>${runtimeScript}</script>`,
  );
  if (options.initialStyles) {
    html = insertBeforeHeadClose(
      html,
      `<style>${options.initialStyles}</style>`,
    );
  }
  if (options.baseUrl) {
    html = insertAfterHeadOpen(
      html,
      `<base href="${escapeAttribute(options.baseUrl)}"/>`,
    );
  }
  if (options.codeToRunBeforeInit) {
    html = insertAfterHeadOpen(
      html,
      `<script>${options.codeToRunBeforeInit}</script>`,
    );
  }
  return html;
}

export function sandboxFlags(
  options: Pick<
    ResolvedOptions,
    "sandboxAdditionalAttributes" | "allowPointerLock"
  >,
): SandboxOption[] {
  const flags = new Set(
    options.sandboxAdditionalAttributes.split(/\s+/).filter(Boolean),
  );
  if (options.allowPointerLock) flags.add("allow-pointer-lock");
  return [...flags] as SandboxOption[];
}

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveContainer(frameContainer: string | Element): HTMLElement {
  const container =
    typeof frameContainer === "string"
      ? document.querySelector(frameContainer)
      : frameContainer;
  if (!container) {
    throw new Error(
      `Websandbox: Cannot find container for sandbox ${String(frameContainer)}`,
    );
  }
  return container as HTMLElement;
}

class Websandbox {
  /**
   * Creates a sandbox. `localApi` is exposed to the sandboxed code as
   * `Websandbox.connection.remote`.
   */
  static create(localApi?: API | null, options: Options = {}): Websandbox {
    return new Websandbox(localApi, options);
  }

  readonly options: Readonly<ResolvedOptions>;
  readonly connection: Connection;
  /** Resolves with this sandbox once the frame has connected. */
  readonly promise: Promise<Websandbox>;

  #connection = new HostConnection();
  #token = randomToken();
  #abort = new AbortController();
  #rendered: RenderedFrame | null = null;
  #port: MessagePort | null = null;
  #destroyed = false;
  #reject!: (reason: unknown) => void;

  constructor(localApi: API | null | undefined, options: Options = {}) {
    this.options = {
      ...BaseOptions,
      ...options,
      safeContentFrame: options.safeContentFrame ?? {},
    };
    if (this.options.frameSrc) {
      throw new Error(
        "Websandbox: `frameSrc` is not supported; Safe Content Frame serves the frame document. Pass the markup as `frameContent` instead.",
      );
    }
    if (!this.options.frameContent.includes("<head>")) {
      throw new Error('Websandbox: iFrame content must have "<head>" tag.');
    }
    const container = resolveContainer(this.options.frameContainer);

    this.connection = this.#connection;
    this.promise = new Promise((resolve, reject) => {
      this.#reject = reject;
      this.#connection.setServiceMethods({
        iframeInitialized: () =>
          this.#connection
            .setLocalApi(localApi ?? {})
            .then(() => resolve(this)),
      });
    });

    window.addEventListener("message", this.#onWindowMessage);
    void this.#render(container);
  }

  /** The sandbox iframe, available once Safe Content Frame has created it. */
  get iframe(): HTMLIFrameElement | null {
    return this.#rendered?.iframe ?? null;
  }

  /** The frame's unique Safe Content Frame origin, once rendered. */
  get origin(): string | null {
    return this.#rendered?.origin ?? null;
  }

  /**
   * Runs code inside the sandbox as an inline script. A function is
   * stringified and invoked, so it cannot close over host variables.
   */
  run(codeOrFunction: string | ((...args: never[]) => unknown)) {
    const code =
      typeof codeOrFunction === "function"
        ? `(${codeOrFunction.toString()})()`
        : codeOrFunction;
    return this.#connection.callRemoteServiceMethod("runCode", code);
  }

  importScript(path: string) {
    return this.#connection.callRemoteServiceMethod("importScript", path);
  }

  injectStyle(style: string): Promise<void> {
    return this.#connection
      .callRemoteServiceMethod("injectStyle", style)
      .then(() => undefined);
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    window.removeEventListener("message", this.#onWindowMessage);
    this.#abort.abort();
    this.#closePort();
    this.#connection.dispose(new Error("Websandbox: sandbox was destroyed"));
    this.#rendered?.dispose();
    this.#rendered = null;
  }

  async #render(container: HTMLElement) {
    const { options } = this;
    const scf = new SafeContentFrame(options.product, {
      ...options.safeContentFrame,
      sandbox: sandboxFlags(options),
    });
    const html = prepareFrameContent(
      options,
      frameRuntimeScript(window.location.origin, this.#token),
    );

    let rendered: RenderedFrame;
    try {
      rendered = await scf.renderHtml(html, container, {
        signal: this.#abort.signal,
        unsafeDocumentWrite: options.unsafeDocumentWrite,
      });
    } catch (error) {
      this.#fail(error);
      return;
    }
    if (this.#destroyed) {
      rendered.dispose();
      return;
    }

    // Attributes set here precede the content document: the shim navigates
    // to it only after a message that is delivered in a later task.
    rendered.iframe.className = options.frameClassName;
    if (options.allowFullScreen) {
      rendered.iframe.allow = "fullscreen";
      rendered.iframe.allowFullscreen = true;
    }
    this.#rendered = rendered;

    rendered.fullyLoadedPromiseWithTimeout(options.loadTimeout).catch((err) => {
      if (isShimLoadError(err) && err.code === "render-timeout") return;
      this.#fail(err);
    });
  }

  #fail(error: unknown) {
    if (this.#destroyed) return;
    this.#reject(error);
  }

  #onWindowMessage = (event: MessageEvent) => {
    const rendered = this.#rendered;
    if (!rendered) return;
    if (event.source !== rendered.iframe.contentWindow) return;
    if (event.origin !== rendered.origin) return;
    const data = event.data as { type?: unknown; token?: unknown } | null;
    if (data?.type !== HELLO_MESSAGE || data.token !== this.#token) return;
    this.#connect(rendered);
  };

  #connect(rendered: RenderedFrame) {
    if (this.#port) return;
    const channel = new MessageChannel();
    const port = channel.port1;
    this.#port = port;
    port.onmessage = (event) => this.#connection.handle(event.data);
    this.#connection.attach((message) => port.postMessage(message));
    rendered.sendMessage({ type: CONNECT_MESSAGE, token: this.#token }, [
      channel.port2,
    ]);
  }

  #closePort() {
    if (!this.#port) return;
    this.#port.onmessage = null;
    this.#port.close();
    this.#port = null;
  }
}

export type PluginInstance = Websandbox;

export default Websandbox;
