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
  requestUserInteraction?(): Promise<void>;
};

export type WebMcpAdapter = {
  available: boolean;
  registerTool(def: WebMcpToolDescriptor): () => void;
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
  const requestUserInteraction = context.requestUserInteraction?.bind(context);
  if (requestUserInteraction) {
    adapter.requestUserInteraction = requestUserInteraction;
  }
  return adapter;
};
