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

export interface RenderedFrame {
  iframe: HTMLIFrameElement;
  origin: string;
  sendMessage(data: unknown, transfer?: Transferable[]): void;
  fullyLoadedPromiseWithTimeout(timeoutMs: number): Promise<void>;
  dispose(): void;
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
  constructor(
    private product: string,
    private options: SafeContentFrameOptions = {},
  ) {}

  async renderHtml(
    html: string,
    container: HTMLElement,
    opts?: { unsafeDocumentWrite?: boolean },
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
  ): Promise<RenderedFrame> {
    const data =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    return this.render(data, mimeType, container);
  }

  async renderPdf(
    content: Uint8Array,
    container: HTMLElement,
  ): Promise<RenderedFrame> {
    return this.render(content, "application/pdf", container);
  }

  private async render(
    content: Uint8Array,
    mimeType: string,
    container: HTMLElement,
    opts?: { unsafeDocumentWrite?: boolean },
  ): Promise<RenderedFrame> {
    const origin = window.location.origin;
    const salt = this.options.salt
      ? (new TextEncoder().encode(this.options.salt).buffer as ArrayBuffer)
      : this.options.enableBrowserCaching
        ? await contentSalt(content, location.pathname)
        : randomSalt();

    const hash = await computeOriginHash(this.product, salt, origin);
    const shimUrl = `https://${hash}-${PRODUCT_HASH}.${SCF_HOST}/${this.product}/shim.html?origin=${encodeURIComponent(origin)}${this.options.enableBrowserCaching ? "&cache=1" : ""}`;
    const iframeOrigin = new URL(shimUrl).origin;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", this.getSandbox());
    iframe.style.cssText = "border:none;width:100%;height:100%";

    if (this.options.useShadowDom) {
      const host = document.createElement("div");
      host.attachShadow({ mode: "closed" }).appendChild(iframe);
      container.appendChild(host);
    } else {
      container.appendChild(iframe);
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      let onLoaded: () => void;
      const loaded = new Promise<void>((r) => {
        onLoaded = r;
      });

      channel.port1.onmessage = (e) => {
        if (e.data?.type === "msg") onLoaded();
        else if (e.data?.type === "error") reject(new Error(e.data.message));
      };

      iframe.onload = () => {
        iframe.contentWindow?.postMessage(
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
        resolve({
          iframe,
          origin: iframeOrigin,
          sendMessage: (data, transfer) =>
            iframe.contentWindow?.postMessage(data, iframeOrigin, transfer),
          fullyLoadedPromiseWithTimeout: (ms) =>
            Promise.race([
              loaded,
              new Promise<void>((_, rej) =>
                setTimeout(() => rej(new Error("Timeout")), ms),
              ),
            ]),
          dispose: () => iframe.remove(),
        });
      };
      iframe.onerror = () => reject(new Error("Failed to load iframe"));
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
