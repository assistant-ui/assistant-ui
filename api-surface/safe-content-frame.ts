declare namespace entry_shadow_dom_exports {
  export { enableShadowDom, unsafeDisableShadowDom };
}

declare const enableShadowDom: () => boolean;

declare const unsafeDisableShadowDom: () => boolean;

declare namespace entry_root_exports {
  export { RenderedFrame, SafeContentFrame, SafeContentFrameOptions, SandboxOption };
}

type SandboxOption = "allow-same-origin" | "allow-scripts" | "allow-forms" | "allow-popups" | "allow-modals" | "allow-downloads" | "allow-popups-to-escape-sandbox";

interface SafeContentFrameOptions {
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  sandbox?: SandboxOption[];
  salt?: string;
}

interface RenderedFrame {
  iframe: HTMLIFrameElement;
  origin: string;
  sendMessage(data: unknown, transfer?: Transferable[]): void;
  fullyLoadedPromiseWithTimeout(timeoutMs: number): Promise<void>;
  dispose(): void;
}

declare class SafeContentFrame {
  private product;
  private options;
  constructor(product: string, options?: SafeContentFrameOptions);
  renderHtml(html: string, container: HTMLElement, opts?: {
    unsafeDocumentWrite?: boolean;
  }): Promise<RenderedFrame>;
  renderRaw(content: Uint8Array | string, mimeType: string, container: HTMLElement): Promise<RenderedFrame>;
  renderPdf(content: Uint8Array, container: HTMLElement): Promise<RenderedFrame>;
  private render;
  private getSandbox;
}

export { entry_root_exports as entry_root, entry_shadow_dom_exports as entry_shadow_dom };
