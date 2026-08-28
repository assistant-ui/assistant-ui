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
  registerTool(
    tool: WebMcpToolDescriptor,
    options?: { signal?: AbortSignal },
  ): Promise<void> | { unregister?(): void } | void;
  unregisterTool?(name: string): void;
  getTools?(): readonly { name: string }[] | Promise<unknown>;
  requestUserInteraction?(): Promise<void>;
};

export type WebMcpAdapter = {
  available: boolean;
  registerTool(
    def: WebMcpToolDescriptor,
    onError?: (error: unknown) => void,
  ): () => void;
  hasTool?(name: string): boolean;
  requestUserInteraction?(): Promise<void>;
};

const isThenable = (value: unknown): value is Promise<unknown> =>
  typeof (value as { then?: unknown } | null | undefined)?.then === "function";

const resolveModelContext = (): WebMcpModelContext | undefined => {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return navigator.modelContext;
  }
  return undefined;
};

const adapterCache = new WeakMap<WebMcpModelContext, WebMcpAdapter>();

const createAdapter = (context: WebMcpModelContext): WebMcpAdapter => {
  const ownNames = new Set<string>();

  const adapter: WebMcpAdapter = {
    available: true,
    registerTool: (def, onError) => {
      const controller = new AbortController();
      ownNames.add(def.name);
      const handle = context.registerTool(def, { signal: controller.signal });
      if (isThenable(handle)) {
        handle.catch((error) => onError?.(error));
      }
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        controller.abort();
        if (
          handle &&
          !isThenable(handle) &&
          typeof handle.unregister === "function"
        ) {
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
      // A name this adapter registered can still be reported by getTools() after
      // dispose when the page removes it asynchronously, so only names the page
      // owned before this adapter claimed them count as collisions.
      if (ownNames.has(name)) return false;
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

export const getDefaultWebMcpAdapter = (): WebMcpAdapter => {
  const context = resolveModelContext();
  if (!context) {
    return {
      available: false,
      registerTool: () => () => {},
    };
  }

  const cached = adapterCache.get(context);
  if (cached) return cached;
  const adapter = createAdapter(context);
  adapterCache.set(context, adapter);
  return adapter;
};
