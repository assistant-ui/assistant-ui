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
  /**
   * Aborting `options.signal` is what unregisters the tool. The explainer
   * defines no other removal method, and a name-keyed one could not be used
   * safely: a later registration may already hold the name.
   */
  registerTool(
    tool: WebMcpToolDescriptor,
    options?: { signal?: AbortSignal },
  ): Promise<void> | void;
};

export type WebMcpHost = {
  available: boolean;
  registerTool(
    def: WebMcpToolDescriptor,
    onError?: (error: unknown) => void,
  ): () => void;
};

type ModelContextHost = { modelContext?: WebMcpModelContext } | undefined;

const isThenable = (value: unknown): value is Promise<unknown> =>
  typeof (value as { then?: unknown } | null | undefined)?.then === "function";

// The explainer puts modelContext on document; navigator is tolerated for
// older drafts and extensions that still inject it there.
const resolveModelContext = (): WebMcpModelContext | undefined => {
  const context =
    (globalThis.document as ModelContextHost)?.modelContext ??
    (globalThis.navigator as ModelContextHost)?.modelContext;
  if (!context) return undefined;
  if (typeof context.registerTool === "function") return context;
  console.warn(
    "[assistant-ui] Ignoring a modelContext with no callable registerTool; WebMCP reports unsupported.",
  );
  return undefined;
};

const createHost = (context: WebMcpModelContext): WebMcpHost => ({
  available: true,
  registerTool: (def, onError) => {
    const controller = new AbortController();
    const handle = context.registerTool(def, { signal: controller.signal });
    if (isThenable(handle)) {
      handle.then(
        () => {},
        (error) => onError?.(error),
      );
    }
    return () => controller.abort();
  },
});

export const getDefaultWebMcpHost = (): WebMcpHost => {
  const context = resolveModelContext();
  if (!context) {
    return {
      available: false,
      registerTool: () => () => {},
    };
  }
  return createHost(context);
};
