interface RenderedFrame {
  iframe: HTMLIFrameElement;
  origin: string;
  sendMessage(data: unknown, transfer?: Transferable[]): void;
  fullyLoadedPromiseWithTimeout(timeoutMs: number): Promise<void>;
  dispose(): void;
}

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

interface ShimLoadError extends Error {
  code: ShimLoadErrorCode;
}

type ShimLoadErrorCode = "render-timeout" | "shim-error" | "shim-unavailable";

declare const enableShadowDom: () => boolean;

declare namespace entry_root_exports {
  export { RenderedFrame, SafeContentFrame, SafeContentFrameHtmlRenderOptions, SafeContentFrameOptions, SafeContentFrameRenderOptions, SandboxOption, ShimLoadError, ShimLoadErrorCode, isShimLoadError };
}

declare function isShimLoadError(error: unknown): error is ShimLoadError;

declare namespace entry_shadow_dom_exports {
  export { enableShadowDom, unsafeDisableShadowDom };
}

declare const unsafeDisableShadowDom: () => boolean;

export { entry_root_exports as entry_root, entry_shadow_dom_exports as entry_shadow_dom };
