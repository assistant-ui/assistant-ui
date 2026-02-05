import { App } from "@modelcontextprotocol/ext-apps";
import type {
  McpUiHostCapabilities,
  McpUiAppCapabilities,
} from "@modelcontextprotocol/ext-apps";
import type {
  ExtendedBridge,
  ToolInputCallback,
  ToolInputPartialCallback,
  ToolResultCallback,
  ToolCancelledCallback,
  HostContextChangedCallback,
  TeardownCallback,
} from "../../core/bridge";
import type {
  HostContext,
  ToolResult,
  ChatMessage,
  DisplayMode,
  ContentBlock,
} from "../../core/types";
import {
  MCP_CAPABILITIES,
  type HostCapabilities,
} from "../../core/capabilities";

export interface AppCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  displayMode?: {
    supported: DisplayMode[];
  };
}

export interface MCPBridgeOptions {
  autoResize?: boolean;
  /**
   * Guard against hanging forever when rendered outside a host.
   *
   * `@modelcontextprotocol/ext-apps` connects via `postMessage` to the parent
   * host. In a plain browser environment (no host), that handshake may never
   * complete unless we time out.
   *
   * Set to `0` or a negative value to disable.
   *
   * @default 1500
   */
  connectTimeoutMs?: number;
}

type CallToolHandler = (
  name: string,
  args: Record<string, unknown>,
  extra: unknown,
) => Promise<ToolResult>;

type ListToolsHandler = (cursor?: string) => Promise<string[]>;

export class MCPBridge implements ExtendedBridge {
  readonly platform = "mcp" as const;
  readonly capabilities: HostCapabilities = MCP_CAPABILITIES;

  private app: App;
  private connectTimeoutMs: number;
  private toolInputCallbacks = new Set<ToolInputCallback>();
  private toolInputPartialCallbacks = new Set<ToolInputPartialCallback>();
  private toolResultCallbacks = new Set<ToolResultCallback>();
  private toolCancelledCallbacks = new Set<ToolCancelledCallback>();
  private contextCallbacks = new Set<HostContextChangedCallback>();
  private teardownCallbacks = new Set<TeardownCallback>();

  constructor(
    appInfo?: { name: string; version: string },
    appCapabilities?: AppCapabilities,
    options?: MCPBridgeOptions,
  ) {
    const autoResize = options?.autoResize ?? true;
    this.connectTimeoutMs = options?.connectTimeoutMs ?? 1500;

    this.app = new App(
      appInfo ?? { name: "MCP App", version: "1.0.0" },
      (appCapabilities ?? {}) as McpUiAppCapabilities,
      { autoResize },
    );

    this.app.ontoolinput = (params) => {
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      this.toolInputCallbacks.forEach((cb) => cb(args));
    };

    this.app.ontoolinputpartial = (params) => {
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      this.toolInputPartialCallbacks.forEach((cb) => cb(args));
    };

    this.app.ontoolresult = (params) => {
      const result: ToolResult = {
        content: params.content as ContentBlock[],
      };
      if (params.structuredContent !== undefined) {
        result.structuredContent = params.structuredContent as Record<
          string,
          unknown
        >;
      }
      if (params.isError !== undefined) {
        result.isError = params.isError;
      }
      if (params._meta) {
        result._meta = params._meta as Record<string, unknown>;
      }
      this.toolResultCallbacks.forEach((cb) => cb(result));
    };

    this.app.ontoolcancelled = (params) => {
      const reason = (params.reason ?? "") as string;
      this.toolCancelledCallbacks.forEach((cb) => cb(reason));
    };

    this.app.onhostcontextchanged = (params: Record<string, unknown>) => {
      const ctx = this.mapHostContext(params);
      this.contextCallbacks.forEach((cb) => cb(ctx));
    };

    this.app.onteardown = async () => {
      for (const cb of this.teardownCallbacks) {
        await cb();
      }
      return {};
    };
  }

  async connect(): Promise<void> {
    const timeoutMs = this.connectTimeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      await this.app.connect();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `MCP bridge connect timed out after ${timeoutMs}ms (no host responded).`,
          ),
        );
      }, timeoutMs);

      this.app
        .connect()
        .then(resolve, reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  getHostContext(): HostContext | null {
    const ctx = this.app.getHostContext();
    return ctx ? this.mapHostContext(ctx) : null;
  }

  /**
   * Maps SDK host context to our HostContext type.
   * The SDK returns a well-defined structure matching HostContext properties
   * (theme, locale, displayMode, etc.), so this cast is safe at runtime.
   */
  private mapHostContext(ctx: Record<string, unknown>): HostContext {
    return ctx as unknown as HostContext;
  }

  onToolInput(callback: ToolInputCallback): () => void {
    this.toolInputCallbacks.add(callback);
    return () => this.toolInputCallbacks.delete(callback);
  }

  onToolInputPartial(callback: ToolInputPartialCallback): () => void {
    this.toolInputPartialCallbacks.add(callback);
    return () => this.toolInputPartialCallbacks.delete(callback);
  }

  onToolResult(callback: ToolResultCallback): () => void {
    this.toolResultCallbacks.add(callback);
    return () => this.toolResultCallbacks.delete(callback);
  }

  onToolCancelled(callback: ToolCancelledCallback): () => void {
    this.toolCancelledCallbacks.add(callback);
    return () => this.toolCancelledCallbacks.delete(callback);
  }

  onHostContextChanged(callback: HostContextChangedCallback): () => void {
    this.contextCallbacks.add(callback);
    return () => this.contextCallbacks.delete(callback);
  }

  onTeardown(callback: TeardownCallback): () => void {
    this.teardownCallbacks.add(callback);
    return () => this.teardownCallbacks.delete(callback);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const result = await this.app.callServerTool({ name, arguments: args });
    const toolResult: ToolResult = {
      content: result.content as ContentBlock[],
      structuredContent: result.structuredContent as Record<string, unknown>,
    };
    if (result.isError !== undefined) {
      toolResult.isError = result.isError;
    }
    return toolResult;
  }

  async openLink(url: string): Promise<void> {
    await this.app.openLink({ url });
  }

  async requestDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    const result = await this.app.requestDisplayMode({ mode });
    return result.mode as DisplayMode;
  }

  sendSizeChanged(size: { width?: number; height?: number }): void {
    this.app.sendSizeChanged(size);
  }

  async sendMessage(message: ChatMessage): Promise<void> {
    await this.app.sendMessage({
      role: message.role,
      content: message.content.map((c) => {
        if (c.type === "text") {
          return { type: "text" as const, text: c.text };
        }
        return c;
      }),
    });
  }

  async updateModelContext(ctx: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  }): Promise<void> {
    await this.app.updateModelContext(ctx);
  }

  sendLog(
    level:
      | "debug"
      | "info"
      | "notice"
      | "warning"
      | "error"
      | "critical"
      | "alert"
      | "emergency",
    data: string,
    logger?: string,
  ): void {
    this.app.sendLog({ level, data, logger });
  }

  setCallToolHandler(handler: CallToolHandler): void {
    this.app.oncalltool = async (params, extra) => {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await handler(name, args, extra);

      const content =
        result.content?.map((c) => {
          if (c.type === "text") {
            return { type: "text" as const, text: c.text };
          }
          if (c.type === "image" || c.type === "audio") {
            return { type: c.type, data: c.data, mimeType: c.mimeType };
          }
          return c;
        }) ?? [];

      const response: {
        content: typeof content;
        structuredContent?: Record<string, unknown>;
        isError?: boolean;
      } = { content };
      if (result.structuredContent !== undefined) {
        response.structuredContent = result.structuredContent;
      }
      if (result.isError !== undefined) {
        response.isError = result.isError;
      }
      return response;
    };
  }

  setListToolsHandler(handler: ListToolsHandler): void {
    this.app.onlisttools = async (params) => {
      const cursor = params?.cursor as string | undefined;
      const tools = await handler(cursor);
      return { tools };
    };
  }

  getHostCapabilities(): McpUiHostCapabilities | undefined {
    return this.app.getHostCapabilities();
  }

  setupSizeChangedNotifications(): () => void {
    return this.app.setupSizeChangedNotifications();
  }

  getApp(): App {
    return this.app;
  }
}
