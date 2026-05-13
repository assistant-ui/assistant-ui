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
import { tapClientLookup, type ClientOutput } from "@assistant-ui/store";
import { MCPServerResource } from "./MCPServerResource";
import { MCPLocalStorage } from "./storage/MCPLocalStorage";
import type { MCPStorageElement } from "./storage/types";
import type {
  MCPAuthConfig,
  MCPConnector,
  MCPCustomServerRecord,
  MCPManagerState,
} from "../mcp-scope";

export type MCPManagerResourceProps = {
  connectors: MCPConnector[];
  storage?: MCPStorageElement | undefined;
  redirectUri: string;
  autoConnect: boolean;
  canAddCustom: boolean;
};

export const MCPManagerResource = resource(
  (props: MCPManagerResourceProps): ClientOutput<"mcp"> => {
    const storageElement = props.storage ?? MCPLocalStorage();
    const storage = tapResource(storageElement);

    const [customServers, setCustomServers] = tapState<MCPCustomServerRecord[]>(
      [],
    );
    const [isHydrated, setIsHydrated] = tapState(false);

    // The tap effect ref guards against an initial save before hydration completes.
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

    // Persist custom server list when it changes (after hydration).
    tapEffect(() => {
      void persistCustomServers(customServers);
    }, [customServers]);

    const removeServerById = tapEffectEvent(async (id: string) => {
      setCustomServers((prev) => prev.filter((s) => s.id !== id));
    });

    const serverElements = tapMemo(() => {
      const connectorElements = props.connectors.map((c) =>
        withKey(
          c.id,
          MCPServerResource({
            id: c.id,
            kind: "connector",
            name: c.name,
            url: c.url,
            icon: c.icon,
            auth: c.auth,
            storage,
            redirectUri: props.redirectUri,
            autoConnect: props.autoConnect,
            onRemove: async () => {
              // connectors cannot be removed
            },
          }),
        ),
      );
      const customElements = customServers.map((s) =>
        withKey(
          s.id,
          MCPServerResource({
            id: s.id,
            kind: "custom",
            name: s.name,
            url: s.url,
            auth: s.auth,
            storage,
            redirectUri: props.redirectUri,
            autoConnect: props.autoConnect,
            onRemove: async () => {
              await removeServerById(s.id);
            },
          }),
        ),
      );
      return [...connectorElements, ...customElements];
    }, [
      props.connectors,
      customServers,
      storage,
      props.redirectUri,
      props.autoConnect,
    ]);

    const lookup = tapClientLookup(() => serverElements, [serverElements]);

    const state = tapMemo<MCPManagerState>(() => {
      const all = lookup.state;
      return {
        servers: all,
        connectors: all.filter((s) => s.kind === "connector"),
        customServers: all.filter((s) => s.kind === "custom"),
        isHydrated,
        canAddCustom: props.canAddCustom,
      };
    }, [lookup.state, isHydrated, props.canAddCustom]);

    return {
      getState: () => state,
      server: ({ id }) => lookup.get({ key: id }),
      addCustomServer: async ({ name, url, auth }) => {
        if (!props.canAddCustom) {
          throw new Error("Adding custom MCP servers is disabled");
        }
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
        // For connectors we just clear auth state; the entry remains.
        await storage.clearAuthState(id);
        setCustomServers((prev) => prev.filter((s) => s.id !== id));
      },
    };
  },
);
