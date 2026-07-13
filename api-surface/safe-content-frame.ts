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

interface SafeContentFrameOptions {
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  sandbox?: SandboxOption[];
  salt?: string;
}

type SandboxOption = "allow-downloads" | "allow-forms" | "allow-modals" | "allow-popups" | "allow-popups-to-escape-sandbox" | "allow-same-origin" | "allow-scripts";

declare const enableShadowDom: () => boolean;

declare namespace entry_root_exports {
  export { RenderedFrame, SafeContentFrame, SafeContentFrameOptions, SandboxOption };
}

declare namespace entry_shadow_dom_exports {
  export { enableShadowDom, unsafeDisableShadowDom };
}

declare const unsafeDisableShadowDom: () => boolean;

export { entry_root_exports as entry_root, entry_shadow_dom_exports as entry_shadow_dom };
