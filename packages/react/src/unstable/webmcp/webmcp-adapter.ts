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
};

export type WebMcpAdapter = {
  available: boolean;
  registerTool(
    def: WebMcpToolDescriptor,
    onError?: (error: unknown) => void,
  ): () => void;
};

type ModelContextHost = { modelContext?: WebMcpModelContext } | undefined;

const isThenable = (value: unknown): value is Promise<unknown> =>
  typeof (value as { then?: unknown } | null | undefined)?.then === "function";

const resolveModelContext = (): WebMcpModelContext | undefined =>
  (globalThis.document as ModelContextHost)?.modelContext ??
  (globalThis.navigator as ModelContextHost)?.modelContext;

const createAdapter = (context: WebMcpModelContext): WebMcpAdapter => ({
  available: true,
  registerTool: (def, onError) => {
    const controller = new AbortController();
    let rejected = false;
    const handle = context.registerTool(def, { signal: controller.signal });
    if (isThenable(handle)) {
      handle.catch((error) => {
        rejected = true;
        onError?.(error);
      });
    }
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      // A rejected registration holds nothing on the page, so unregistering
      // its name here would delete whoever does hold it.
      if (rejected) return;
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
});

export const getDefaultWebMcpAdapter = (): WebMcpAdapter => {
  const context = resolveModelContext();
  if (!context) {
    return {
      available: false,
      registerTool: () => () => {},
    };
  }
  return createAdapter(context);
};
