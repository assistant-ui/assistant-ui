export type SandboxOption =
  | "allow-same-origin"
  | "allow-scripts"
  | "allow-forms"
  | "allow-popups"
  | "allow-modals"
  | "allow-downloads"
  | "allow-popups-to-escape-sandbox";

export interface SafeContentFrameOptions {
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  sandbox?: SandboxOption[];
  salt?: string;
}

export interface SafeContentFrameRenderOptions {
  signal?: AbortSignal;
}

export interface SafeContentFrameHtmlRenderOptions extends SafeContentFrameRenderOptions {
  unsafeDocumentWrite?: boolean;
}

/**
 * Why a frame never signalled a completed render. `shim-unavailable` means the
 * shim never acknowledged that it started, so the document at the shim URL is
 * missing or is not a shim. `shim-error` is the shim reporting its own failure.
 * `render-timeout` is the shim running normally with the content still not
 * rendered, which is the one case that may still resolve on its own.
 */
export type ShimLoadErrorCode =
  | "shim-unavailable"
  | "shim-error"
  | "render-timeout";

export interface ShimLoadError extends Error {
  code: ShimLoadErrorCode;
}

export interface RenderedFrame {
  iframe: HTMLIFrameElement;
  origin: string;
  sendMessage(data: unknown, transfer?: Transferable[]): void;
  fullyLoadedPromiseWithTimeout(timeoutMs: number): Promise<void>;
  dispose(): void;
}

const SHIM_LOAD_ERROR_CODES: readonly string[] = [
  "shim-unavailable",
  "shim-error",
  "render-timeout",
] satisfies readonly ShimLoadErrorCode[];

function shimLoadError(
  code: ShimLoadErrorCode,
  message: string,
): ShimLoadError {
  return Object.assign(new Error(message), { code });
}

/**
 * Narrows a rejection from `fullyLoadedPromiseWithTimeout`. The promise also
 * rejects with plain errors that carry no code, so a bare property read is not
 * enough to tell why a frame failed. Membership of the code set is the test
 * rather than `instanceof`, which does not survive a duplicated copy of this
 * package in a consumer's bundle.
 */
export function isShimLoadError(error: unknown): error is ShimLoadError {
  return (
    error instanceof Error &&
    SHIM_LOAD_ERROR_CODES.includes((error as { code?: unknown }).code as string)
  );
}

const SCF_HOST = "scf.auiusercontent.com";
const PRODUCT_HASH = "h184756";

async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

async function computeOriginHash(
  product: string,
  salt: ArrayBuffer,
  origin: string,
): Promise<string> {
  const enc = new TextEncoder();
  const sep = enc.encode("$@#|");
  const parts = [
    enc.encode(product),
    sep,
    new Uint8Array(salt),
    sep,
    enc.encode(origin),
  ];
  const combined = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    combined.set(p, offset);
    offset += p.length;
  }

  const hash = new Uint8Array(await sha256(combined.buffer as ArrayBuffer));
  const bigint = hash.reduce(
    (acc, b) => BigInt(256) * acc + BigInt(b),
    BigInt(0),
  );
  return bigint.toString(36).padStart(50, "0").slice(0, 50);
}

function randomSalt(): ArrayBuffer {
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return arr.buffer as ArrayBuffer;
}

function getAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error(
    signal.reason === undefined
      ? "The operation was aborted"
      : String(signal.reason),
  );
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw getAbortError(signal);
}

async function contentSalt(
  content: Uint8Array,
  pathname: string,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const sep = enc.encode("$@#|");
  const combined = new Uint8Array(
    content.length + sep.length + pathname.length,
  );
  combined.set(content, 0);
  combined.set(sep, content.length);
  combined.set(enc.encode(pathname), content.length + sep.length);
  return sha256(combined.buffer as ArrayBuffer);
}

export class SafeContentFrame {
  private product: string;
  private options: SafeContentFrameOptions;

  constructor(product: string, options: SafeContentFrameOptions = {}) {
    this.product = product;
    this.options = options;
  }

  async renderHtml(
    html: string,
    container: HTMLElement,
    opts?: SafeContentFrameHtmlRenderOptions,
  ): Promise<RenderedFrame> {
    return this.render(
      new TextEncoder().encode(html),
      "text/html; charset=utf-8",
      container,
      opts,
    );
  }

  async renderRaw(
    content: Uint8Array | string,
    mimeType: string,
    container: HTMLElement,
    opts?: SafeContentFrameRenderOptions,
  ): Promise<RenderedFrame> {
    const data =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    return this.render(data, mimeType, container, opts);
  }

  async renderPdf(
    content: Uint8Array,
    container: HTMLElement,
    opts?: SafeContentFrameRenderOptions,
  ): Promise<RenderedFrame> {
    return this.render(content, "application/pdf", container, opts);
  }

  private async render(
    content: Uint8Array,
    mimeType: string,
    container: HTMLElement,
    opts?: SafeContentFrameHtmlRenderOptions,
  ): Promise<RenderedFrame> {
    const signal = opts?.signal;
    throwIfAborted(signal);
    const origin = window.location.origin;
    const salt = this.options.salt
      ? (new TextEncoder().encode(this.options.salt).buffer as ArrayBuffer)
      : this.options.enableBrowserCaching
        ? await contentSalt(content, location.pathname)
        : randomSalt();

    throwIfAborted(signal);
    const hash = await computeOriginHash(this.product, salt, origin);
    throwIfAborted(signal);
    const shimUrl = `https://${hash}-${PRODUCT_HASH}.${SCF_HOST}/${this.product}/shim.html?origin=${encodeURIComponent(origin)}${this.options.enableBrowserCaching ? "&cache=1" : ""}`;
    const iframeOrigin = new URL(shimUrl).origin;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", this.getSandbox());
    iframe.style.cssText = "border:none;width:100%;height:100%";

    let mountElement: HTMLElement = iframe;
    if (this.options.useShadowDom) {
      const host = document.createElement("div");
      host.attachShadow({ mode: "closed" }).appendChild(iframe);
      container.appendChild(host);
      mountElement = host;
    } else {
      container.appendChild(iframe);
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      let channelTransferred = false;
      let cleanedUp = false;
      let shimReady = false;

      let onLoaded: () => void;
      let onLoadError: (error: Error) => void;
      const loaded = new Promise<void>((resolveLoaded, rejectLoaded) => {
        onLoaded = resolveLoaded;
        onLoadError = rejectLoaded;
      });
      void loaded.catch(() => {});

      const onWindowMessage = (event: MessageEvent) => {
        if (event.origin !== iframeOrigin) return;
        if (event.source !== iframe.contentWindow) return;

        if (event.data?.type === "ready") shimReady = true;
        else if (event.data?.type === "error") {
          onLoadError(shimLoadError("shim-error", event.data.message));
        }
      };
      window.addEventListener("message", onWindowMessage);

      function cleanup() {
        if (cleanedUp) return;
        cleanedUp = true;
        signal?.removeEventListener("abort", onAbort);
        iframe.onload = null;
        iframe.onerror = null;
        window.removeEventListener("message", onWindowMessage);
        channel.port1.onmessage = null;
        channel.port1.close();
        if (!channelTransferred) channel.port2.close();
        mountElement.remove();
      }

      function onAbort() {
        if (!signal) return;
        const error = getAbortError(signal);
        onLoadError(error);
        cleanup();
        reject(error);
      }
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }

      channel.port1.onmessage = (e) => {
        if (e.data?.type === "msg") onLoaded();
        else if (e.data?.type === "error") {
          onLoadError(shimLoadError("shim-error", e.data.message));
          cleanup();
        }
      };

      let loadHandled = false;
      iframe.onload = () => {
        if (loadHandled) return;
        loadHandled = true;
        try {
          const contentWindow = iframe.contentWindow;
          if (!contentWindow) throw new Error("Failed to access iframe window");
          contentWindow.postMessage(
            {
              body: content.buffer.slice(
                content.byteOffset,
                content.byteOffset + content.byteLength,
              ),
              mimeType,
              salt,
              unsafeDocumentWrite: opts?.unsafeDocumentWrite,
            },
            iframeOrigin,
            [channel.port2],
          );
          channelTransferred = true;
        } catch (error) {
          cleanup();
          reject(error);
          return;
        }
        iframe.onload = null;
        iframe.onerror = null;
        resolve({
          iframe,
          origin: iframeOrigin,
          sendMessage: (data, transfer) =>
            iframe.contentWindow?.postMessage(data, iframeOrigin, transfer),
          fullyLoadedPromiseWithTimeout: async (ms) => {
            let timeout: ReturnType<typeof setTimeout> | undefined;
            try {
              await Promise.race([
                loaded,
                new Promise<void>((_, reject) => {
                  timeout = setTimeout(
                    () =>
                      reject(
                        shimReady
                          ? shimLoadError("render-timeout", "Timeout")
                          : shimLoadError(
                              "shim-unavailable",
                              `Failed to load shim: ${shimUrl}`,
                            ),
                      ),
                    ms,
                  );
                }),
              ]);
            } finally {
              if (timeout !== undefined) clearTimeout(timeout);
            }
          },
          dispose: cleanup,
        });
      };
      iframe.onerror = () => {
        cleanup();
        reject(new Error("Failed to load iframe"));
      };
      iframe.src = shimUrl;
    });
  }

  private getSandbox(): string {
    const s = new Set(this.options.sandbox || []);
    s.add("allow-same-origin");
    s.add("allow-scripts");
    return [...s].join(" ");
  }
}
