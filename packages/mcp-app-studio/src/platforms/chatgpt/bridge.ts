import type {
  ExtendedBridge,
  ToolInputCallback,
  ToolResultCallback,
  HostContextChangedCallback,
} from "../../core/bridge";
import type {
  HostContext,
  ToolResult,
  ChatMessage,
  DisplayMode,
} from "../../core/types";
import {
  CHATGPT_CAPABILITIES,
  type HostCapabilities,
} from "../../core/capabilities";
import "./types";

/**
 * Shallow comparison of two HostContext objects.
 * Compares top-level properties by value (primitives) or reference (objects).
 */
function hostContextChanged(
  prev: HostContext | null,
  next: HostContext,
): boolean {
  if (!prev) return true;
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<
    keyof HostContext
  >;
  for (const key of keys) {
    if (prev[key] !== next[key]) return true;
  }
  return false;
}

export class ChatGPTBridge implements ExtendedBridge {
  readonly platform = "chatgpt" as const;
  readonly capabilities: HostCapabilities = CHATGPT_CAPABILITIES;

  private toolInputCallbacks = new Set<ToolInputCallback>();
  private toolResultCallbacks = new Set<ToolResultCallback>();
  private contextCallbacks = new Set<HostContextChangedCallback>();
  private lastContext: HostContext | null = null;
  private connected = false;

  private get openai() {
    if (!window.openai) {
      throw new Error("ChatGPT bridge not available");
    }
    return window.openai;
  }

  async connect(): Promise<void> {
    if (!window.openai) {
      throw new Error(
        "ChatGPT bridge not available. Is this running inside ChatGPT?",
      );
    }

    window.addEventListener("openai:set_globals", this.handleGlobalsChange);

    this.lastContext = this.buildHostContext();

    if (this.openai.toolInput) {
      this.toolInputCallbacks.forEach((cb) => cb(this.openai.toolInput));
    }

    if (this.openai.toolOutput) {
      const result: ToolResult = {
        structuredContent: this.openai.toolOutput!,
      };
      if (this.openai.toolResponseMetadata) {
        result._meta = this.openai.toolResponseMetadata;
      }
      this.toolResultCallbacks.forEach((cb) => cb(result));
    }

    this.connected = true;
  }

  disconnect(): void {
    if (!this.connected) return;
    window.removeEventListener("openai:set_globals", this.handleGlobalsChange);
    this.connected = false;
    this.toolInputCallbacks.clear();
    this.toolResultCallbacks.clear();
    this.contextCallbacks.clear();
  }

  private buildHostContext(): HostContext {
    const g = this.openai;
    return {
      theme: g.theme,
      locale: g.locale,
      displayMode: g.displayMode as DisplayMode,
      availableDisplayModes: ["pip", "inline", "fullscreen"],
      containerDimensions: { maxHeight: g.maxHeight },
      platform: this.mapDeviceType(g.userAgent?.device?.type),
      deviceCapabilities: g.userAgent?.capabilities,
      safeAreaInsets: g.safeArea?.insets,
      userAgent: "ChatGPT",
    };
  }

  private mapDeviceType(type?: string): "web" | "desktop" | "mobile" {
    if (type === "mobile" || type === "tablet") return "mobile";
    return "web";
  }

  private handleGlobalsChange = () => {
    const newContext = this.buildHostContext();

    if (hostContextChanged(this.lastContext, newContext)) {
      this.lastContext = newContext;
      this.contextCallbacks.forEach((cb) => cb(newContext));
    }

    if (this.openai.toolInput) {
      this.toolInputCallbacks.forEach((cb) => cb(this.openai.toolInput));
    }

    if (this.openai.toolOutput) {
      const result: ToolResult = {
        structuredContent: this.openai.toolOutput!,
      };
      if (this.openai.toolResponseMetadata) {
        result._meta = this.openai.toolResponseMetadata;
      }
      this.toolResultCallbacks.forEach((cb) => cb(result));
    }
  };

  getHostContext(): HostContext | null {
    return this.lastContext;
  }

  onToolInput(callback: ToolInputCallback): () => void {
    this.toolInputCallbacks.add(callback);
    if (this.connected && this.openai.toolInput) {
      callback(this.openai.toolInput);
    }
    return () => this.toolInputCallbacks.delete(callback);
  }

  onToolResult(callback: ToolResultCallback): () => void {
    this.toolResultCallbacks.add(callback);
    if (this.connected && this.openai.toolOutput) {
      const result: ToolResult = {
        structuredContent: this.openai.toolOutput,
      };
      if (this.openai.toolResponseMetadata) {
        result._meta = this.openai.toolResponseMetadata;
      }
      callback(result);
    }
    return () => this.toolResultCallbacks.delete(callback);
  }

  onHostContextChanged(callback: HostContextChangedCallback): () => void {
    this.contextCallbacks.add(callback);
    return () => this.contextCallbacks.delete(callback);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const result = await this.openai.callTool(name, args);
    return { structuredContent: result as Record<string, unknown> };
  }

  async openLink(url: string): Promise<void> {
    this.openai.openExternal({ href: url });
  }

  async requestDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    const result = await this.openai.requestDisplayMode({ mode });
    return result.mode as DisplayMode;
  }

  sendSizeChanged(size: { width?: number; height?: number }): void {
    if (size.height != null) {
      this.openai.notifyIntrinsicHeight(size.height);
    }
  }

  async sendMessage(message: ChatMessage): Promise<void> {
    const text = message.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    await this.openai.sendFollowUpMessage({ prompt: text });
  }

  setWidgetState(state: Record<string, unknown> | null): void {
    this.openai.setWidgetState(state);
  }

  getWidgetState(): Record<string, unknown> | null {
    return this.openai.widgetState;
  }

  async uploadFile(file: File): Promise<{ fileId: string }> {
    return this.openai.uploadFile(file);
  }

  async getFileDownloadUrl(fileId: string): Promise<{ downloadUrl: string }> {
    return this.openai.getFileDownloadUrl({ fileId });
  }

  requestClose(): void {
    this.openai.requestClose();
  }

  async requestModal(options: {
    title?: string;
    params?: Record<string, unknown>;
    anchor?: { x: number; y: number; width: number; height: number };
  }): Promise<void> {
    await this.openai.requestModal(options);
  }
}
