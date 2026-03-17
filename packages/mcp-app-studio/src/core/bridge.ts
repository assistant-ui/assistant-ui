import type {
  HostContext,
  ToolResult,
  ContentBlock,
  ChatMessage,
  DisplayMode,
} from "./types";
import type { HostCapabilities } from "./capabilities";

export type ToolInputCallback = (args: Record<string, unknown>) => void;
export type ToolInputPartialCallback = (args: Record<string, unknown>) => void;
export type ToolResultCallback = (result: ToolResult) => void;
export type ToolCancelledCallback = (reason: string) => void;
export type HostContextChangedCallback = (ctx: Partial<HostContext>) => void;
export type TeardownCallback = () => Promise<void> | void;

export interface HostBridge {
  readonly platform: "mcp";
  readonly capabilities: HostCapabilities;

  connect(): Promise<void>;
  getHostContext(): HostContext | null;

  onToolInput(callback: ToolInputCallback): () => void;
  onToolResult(callback: ToolResultCallback): () => void;
  onHostContextChanged(callback: HostContextChangedCallback): () => void;

  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  openLink(url: string): Promise<void>;

  requestDisplayMode(mode: DisplayMode): Promise<DisplayMode>;
  sendSizeChanged(size: { width?: number; height?: number }): void;
}

export interface ExtendedBridge extends HostBridge {
  disconnect?(): void;
  onToolInputPartial?(callback: ToolInputPartialCallback): () => void;
  onToolCancelled?(callback: ToolCancelledCallback): () => void;
  onTeardown?(callback: TeardownCallback): () => void;

  sendMessage?(message: ChatMessage): Promise<void>;

  updateModelContext?(ctx: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  }): Promise<void>;

  setWidgetState?(state: Record<string, unknown> | null): void;
  getWidgetState?(): Record<string, unknown> | null;

  uploadFile?(file: File): Promise<{ fileId: string }>;
  getFileDownloadUrl?(fileId: string): Promise<{ downloadUrl: string }>;

  requestClose?(): void;
  requestModal?(options: {
    params?: Record<string, unknown>;
    template?: string;
    [key: string]: unknown;
  }): Promise<void>;

  sendLog?(level: "debug" | "info" | "warning" | "error", data: string): void;
}
