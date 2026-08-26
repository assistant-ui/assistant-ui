export type WebMcpContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export type WebMcpCallToolResult = {
  content: WebMcpContent[];
  isError?: boolean;
};

export type WebMcpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: unknown;
  execute: (
    args: unknown,
    context?: { signal?: AbortSignal },
  ) => Promise<WebMcpCallToolResult>;
};

export type WebMcpModelContext = {
  registerTool(tool: WebMcpToolDescriptor): { unregister?(): void } | void;
  unregisterTool?(name: string): void;
  getTools?(): readonly { name: string }[];
  requestUserInteraction?(): Promise<void>;
};

export type WebMcpAdapter = {
  available: boolean;
  registerTool(def: WebMcpToolDescriptor): () => void;
  hasTool?(name: string): boolean;
  requestUserInteraction?(): Promise<void>;
};

const resolveModelContext = (): WebMcpModelContext | undefined => {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return navigator.modelContext;
  }
  return undefined;
};

export const getDefaultWebMcpAdapter = (): WebMcpAdapter => {
  const context = resolveModelContext();
  if (!context) {
    return {
      available: false,
      registerTool: () => () => {},
    };
  }

  const adapter: WebMcpAdapter = {
    available: true,
    registerTool: (def) => {
      const handle = context.registerTool(def);
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        if (handle && typeof handle.unregister === "function") {
          handle.unregister();
        } else {
          context.unregisterTool?.(def.name);
        }
      };
    },
  };
  if (typeof context.getTools === "function") {
    const getTools = context.getTools.bind(context);
    adapter.hasTool = (name) => {
      try {
        const tools = getTools();
        return (
          Array.isArray(tools) && tools.some((tool) => tool?.name === name)
        );
      } catch {
        return false;
      }
    };
  }
  const requestUserInteraction = context.requestUserInteraction?.bind(context);
  if (requestUserInteraction) {
    adapter.requestUserInteraction = requestUserInteraction;
  }
  return adapter;
};
