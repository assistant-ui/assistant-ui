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

    this.app = new App(
      appInfo ?? { name: "MCP App", version: "1.0.0" },
      (appCapabilities ?? {}) as McpUiAppCapabilities,
      { autoResize },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.ontoolinput = (params: any) => {
      this.toolInputCallbacks.forEach((cb) =>
        cb(params.arguments as Record<string, unknown>),
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.ontoolinputpartial = (params: any) => {
      this.toolInputPartialCallbacks.forEach((cb) =>
        cb(params.arguments as Record<string, unknown>),
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.ontoolresult = (params: any) => {
      const result: ToolResult = {
        content: params.content as ContentBlock[],
        structuredContent: params.structuredContent as Record<string, unknown>,
      };
      if (params.isError !== undefined) {
        result.isError = params.isError;
      }
      if (params._meta) {
        result._meta = params._meta as Record<string, unknown>;
      }
      this.toolResultCallbacks.forEach((cb) => cb(result));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.ontoolcancelled = (params: any) => {
      this.toolCancelledCallbacks.forEach((cb) => cb(params.reason));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.onhostcontextchanged = (params: any) => {
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
    await this.app.connect();
  }

  getHostContext(): HostContext | null {
    const ctx = this.app.getHostContext();
    return ctx ? this.mapHostContext(ctx) : null;
  }

  private mapHostContext(ctx: Record<string, unknown>): HostContext {
    // Cast to HostContext and let the SDK handle the actual values
    // The SDK returns properly typed values, so this cast is safe
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.oncalltool = async (params: any, extra: any) => {
      const result = await handler(params.name, params.arguments ?? {}, extra);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] =
        result.content?.map((c) => {
          if (c.type === "text") {
            return { type: "text", text: c.text };
          }
          if (c.type === "image" || c.type === "audio") {
            return { type: c.type, data: c.data, mimeType: c.mimeType };
          }
          return c;
        }) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = { content };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.onlisttools = async (params: any) => {
      const tools = await handler(params?.cursor);
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
