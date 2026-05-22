import {
  resource,
  tapState,
  tapResource,
  tapEffect,
  tapMemo,
  tapEffectEvent,
  tapRef,
  withKey,
} from "@assistant-ui/tap";
import {
  tapClientLookup,
  tapAssistantClientRef,
  attachTransformScopes,
  type ClientOutput,
} from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { Tool } from "assistant-stream";
import { McpServerResource } from "./McpServerResource";
import { McpLocalStorage } from "./storage/McpLocalStorage";
import type { MCPStorageElement } from "./storage/types";
import type {
  MCPAuthConfig,
  MCPConnector,
  MCPCustomServerRecord,
  MCPManagerState,
} from "../mcp-scope";

export type McpManagerResourceProps = {
  connectors?: MCPConnector[] | undefined;
  storage?: MCPStorageElement | undefined;
  /** OAuth redirect target. Defaults to `${origin}/mcp/callback`. */
  oauthRedirectUri?: string | undefined;
  /** Connect on mount when usable auth exists. Default true. */
  autoConnect?: boolean | undefined;
};

function defaultRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/mcp/callback`;
}

export const McpManagerResource = resource(
  (props: McpManagerResourceProps): ClientOutput<"mcp"> => {
    const connectors = props.connectors ?? [];
    const autoConnect = props.autoConnect ?? true;
    const redirectUri = props.oauthRedirectUri ?? defaultRedirectUri();

    const storageElement = props.storage ?? McpLocalStorage();
    const storage = tapResource(storageElement);

    const [customServers, setCustomServers] = tapState<MCPCustomServerRecord[]>(
      [],
    );
    const [isHydrated, setIsHydrated] = tapState(false);

    const hydratedRef = tapRef(false);

    const hydrate = tapEffectEvent(async (signal: { cancelled: boolean }) => {
      try {
        const records = await storage.loadCustomServers();
        if (signal.cancelled) return;
        setCustomServers(records);
      } finally {
        if (!signal.cancelled) {
          hydratedRef.current = true;
          setIsHydrated(true);
        }
      }
    });

    tapEffect(() => {
      const signal = { cancelled: false };
      void hydrate(signal);
      return () => {
        signal.cancelled = true;
      };
    }, []);

    const persistCustomServers = tapEffectEvent(
      async (records: MCPCustomServerRecord[]) => {
        if (!hydratedRef.current) return;
        await storage.saveCustomServers(records);
      },
    );

    tapEffect(() => {
      void persistCustomServers(customServers);
    }, [customServers]);

    const serverElements = tapMemo(() => {
      const connectorElements = connectors.map((c) =>
        withKey(
          c.id,
          McpServerResource({
            id: c.id,
            kind: "connector",
            name: c.name,
            url: c.url,
            icon: c.icon,
            auth: c.auth,
            storage,
            redirectUri,
            autoConnect,
            onRemove: async () => {
              // connectors cannot be removed
            },
          }),
        ),
      );
      const customElements = customServers.map((s) =>
        withKey(
          s.id,
          McpServerResource({
            id: s.id,
            kind: "custom",
            name: s.name,
            url: s.url,
            auth: s.auth,
            storage,
            redirectUri,
            autoConnect,
            onRemove: async () => {
              setCustomServers((prev) => prev.filter((x) => x.id !== s.id));
            },
          }),
        ),
      );
      return [...connectorElements, ...customElements];
    }, [connectors, customServers, storage, redirectUri, autoConnect]);

    const lookup = tapClientLookup(() => serverElements, [serverElements]);

    const state = tapMemo<MCPManagerState>(() => {
      const all = lookup.state;
      return {
        servers: all,
        connectors: all.filter((s) => s.kind === "connector"),
        customServers: all.filter((s) => s.kind === "custom"),
        isHydrated,
      };
    }, [lookup.state, isHydrated]);

    // ─── Auto-register MCP tools as frontend tools in modelContext ─────
    // Build the toolkit from connected servers; re-register when the visible
    // tool surface changes. Tool names are prefixed with the server id to
    // avoid collisions across connected servers.
    const toolkit = tapMemo<Record<string, Tool<any, any>>>(() => {
      const out: Record<string, Tool<any, any>> = {};
      for (const server of lookup.state) {
        if (server.connectionState !== "connected") continue;
        for (const tool of server.tools) {
          const fullName = `${server.id}__${tool.name}`;
          out[fullName] = {
            type: "frontend",
            ...(tool.description !== undefined
              ? { description: tool.description }
              : {}),
            parameters: tool.inputSchema as never,
            execute: (args) =>
              lookup
                .get({ key: server.id })
                .callTool(tool.name, args as unknown),
          };
        }
      }
      return out;
    }, [lookup, lookup.state]);

    const clientRef = tapAssistantClientRef();

    tapEffect(() => {
      const client = clientRef.current;
      if (!client) return;
      return client.modelContext().register({
        getModelContext: () => ({ tools: toolkit }),
      });
    }, [toolkit, clientRef]);

    const serverByKind = (kind: "connector" | "custom", index: number) => {
      const list =
        kind === "connector" ? state.connectors : state.customServers;
      const entry = list[index];
      if (!entry) {
        throw new Error(
          `McpManagerResource: no ${kind} at index ${index} (length ${list.length})`,
        );
      }
      return lookup.get({ key: entry.id });
    };

    return {
      getState: () => state,
      server: (query) => {
        if ("id" in query) return lookup.get({ key: query.id });
        return serverByKind(query.kind, query.index);
      },
      connector: ({ index }) => serverByKind("connector", index),
      customServer: ({ index }) => serverByKind("custom", index),
      addCustomServer: async ({ name, url, auth }) => {
        const record: MCPCustomServerRecord = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          url,
          auth: auth as MCPAuthConfig,
          createdAt: Date.now(),
        };
        setCustomServers((prev) => [...prev, record]);
        return record.id;
      },
      removeServer: async (id) => {
        // Disconnect the live transport before removing — otherwise the
        // resource unmount cleanup closes it in the background, which can
        // leave an HTTP request mid-flight with no listeners.
        try {
          await lookup.get({ key: id }).disconnect();
        } catch {
          // Already missing from the lookup (e.g. previously removed).
        }
        await storage.clearAuthState(id);
        setCustomServers((prev) => prev.filter((s) => s.id !== id));
      },
    };
  },
);

// Ensure modelContext exists as a sibling when the manager mounts. If an
// ancestor (e.g. a chat runtime) already provides modelContext, this is a
// no-op; otherwise it's auto-mounted alongside `mcp`.
attachTransformScopes(McpManagerResource, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
