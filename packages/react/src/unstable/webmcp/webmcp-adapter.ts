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
    // The disposer below and the fulfilled arm are mutually exclusive only
    // because neither yields; an await introduced into either one lets both
    // reach unregisterByName. These two bindings must also stay above the
    // handle's then arm: a thenable that settles synchronously runs that arm
    // before the disposer is ever returned.
    let settled: "fulfilled" | "rejected" | undefined;
    let disposed = false;

    const unregisterByName = () => context.unregisterTool?.(def.name);

    const handle = context.registerTool(def, { signal: controller.signal });
    if (isThenable(handle)) {
      handle.then(
        () => {
          settled = "fulfilled";
          if (!disposed) return;
          // The disposer's caller has already returned, so a throwing host
          // would surface here as an unhandled rejection rather than reaching
          // whatever guards the synchronous path.
          try {
            unregisterByName();
          } catch (error) {
            console.warn(
              `[assistant-ui] Unregistering WebMCP tool "${def.name}" failed.`,
              error,
            );
          }
        },
        (error) => {
          settled = "rejected";
          onError?.(error);
        },
      );
    }

    return () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      // A rejected registration holds nothing on the page, so unregistering
      // its name here would delete whoever does hold it. While the promise is
      // still pending we do not yet know which case this is, so the fulfilled
      // handler above performs the cleanup instead.
      if (settled === "rejected") return;
      if (isThenable(handle)) {
        if (settled === "fulfilled") unregisterByName();
        return;
      }
      if (handle && typeof handle.unregister === "function") {
        handle.unregister();
      } else {
        unregisterByName();
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
