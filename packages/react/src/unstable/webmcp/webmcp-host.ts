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
  /**
   * Not part of the WebMCP explainer, which unregisters by aborting the signal
   * passed to `registerTool`. Tolerated for hosts that expose it; the abort is
   * what disposal relies on.
   */
  unregisterTool?(name: string): void;
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

// Shared by every handle over one host, so a registration disposed by one
// cannot unregister a name a later one has taken over. React remounts the
// provider effect on every StrictMode pass.
const ownersByContext = new WeakMap<WebMcpModelContext, Map<string, object>>();

const ownersOf = (context: WebMcpModelContext): Map<string, object> => {
  const existing = ownersByContext.get(context);
  if (existing) return existing;
  const owners = new Map<string, object>();
  ownersByContext.set(context, owners);
  return owners;
};

const createHost = (context: WebMcpModelContext): WebMcpHost => {
  const owners = ownersOf(context);

  return {
    available: true,
    registerTool: (def, onError) => {
      const controller = new AbortController();
      const owner = {};
      const displaced = owners.get(def.name);
      let settled: "fulfilled" | "rejected" | undefined;
      let disposed = false;

      // Hands the claim back rather than clearing it: the displaced
      // registration may still be pending its own deferred release.
      const disownName = () => {
        if (owners.get(def.name) !== owner) return;
        if (displaced === undefined) owners.delete(def.name);
        else owners.set(def.name, displaced);
      };
      // Unregistration is keyed by name, so a registration that no longer owns
      // its name would delete whoever holds it now.
      const releaseName = () => {
        if (owners.get(def.name) !== owner) return;
        owners.delete(def.name);
        context.unregisterTool?.(def.name);
      };

      owners.set(def.name, owner);
      let handle: ReturnType<WebMcpModelContext["registerTool"]>;
      try {
        handle = context.registerTool(def, { signal: controller.signal });
      } catch (error) {
        disownName();
        throw error;
      }
      if (isThenable(handle)) {
        handle.then(
          () => {
            settled = "fulfilled";
            if (!disposed) return;
            try {
              releaseName();
            } catch (error) {
              console.warn(
                `[assistant-ui] Unregistering WebMCP tool "${def.name}" failed.`,
                error,
              );
            }
          },
          (error) => {
            settled = "rejected";
            disownName();
            onError?.(error);
          },
        );
      }

      return () => {
        if (disposed) return;
        disposed = true;
        controller.abort();
        if (settled === "rejected") return;
        if (isThenable(handle)) {
          if (settled === "fulfilled") releaseName();
          return;
        }
        if (handle && typeof handle.unregister === "function") {
          disownName();
          handle.unregister();
        } else {
          releaseName();
        }
      };
    },
  };
};

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
