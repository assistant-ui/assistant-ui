import { useState, useRef, useEffect, useMemo, useEffectEvent } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createOAuthProvider } from "../auth/createOAuthProvider";
import { buildHeaders } from "../auth/buildHeaders";
import { assertValidServerId } from "../utils/serverId";
import type { MCPStorage } from "./storage/types";
import type {
  MCPAuthConfig,
  MCPConnectionState,
  MCPServerKind,
  MCPServerState,
  MCPToolInfo,
} from "../mcp-scope";

export type McpServerResourceProps = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string | undefined;
  auth: MCPAuthConfig;
  storage: MCPStorage;
  redirectUri: string;
  autoConnect: boolean;
  connectionTimeout?: number | undefined;
  onRemove: () => Promise<void>;
};

const useMcpServerResource = (
  props: McpServerResourceProps,
): ClientOutput<"mcpServer"> => {
  assertValidServerId(props.id);
  const [connectionState, setConnectionState] =
    useState<MCPConnectionState>("disconnected");
  const [tools, setTools] = useState<MCPToolInfo[]>([]);
  const [lastError, setLastError] = useState<{ message: string } | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<StreamableHTTPClientTransport | null>(null);

  const withConnectionTimeout = useEffectEvent(
    async <T>(
      promise: Promise<T>,
      phase: "connecting" | "listing tools",
      startedAt: number,
    ): Promise<T> => {
      const timeoutMs = props.connectionTimeout;
      if (timeoutMs === undefined) return await promise;
      const remainingMs = timeoutMs - (Date.now() - startedAt);
      const timeoutError = () =>
        new Error(
          `MCP server "${props.id}" timed out while ${phase} after ${timeoutMs}ms.`,
        );
      if (remainingMs <= 0) throw timeoutError();

      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(timeoutError()), remainingMs);
          }),
        ]);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    },
  );

  const buildTransport = useEffectEvent(
    async (): Promise<StreamableHTTPClientTransport> => {
      if (props.auth.type === "oauth") {
        const authProvider = createOAuthProvider({
          serverId: props.id,
          config: props.auth,
          storage: props.storage,
          redirectUri: props.redirectUri,
          onAuthorizationUrl: (url) => setAuthorizationUrl(url.toString()),
        });
        return new StreamableHTTPClientTransport(new URL(props.url), {
          authProvider,
        });
      }
      if (props.auth.type === "bearer") {
        const persisted = await props.storage.loadAuthState(props.id);
        const headers = buildHeaders(props.auth, persisted);
        const transportOpts: StreamableHTTPClientTransportOptions = {};
        if (headers) transportOpts.requestInit = { headers };
        return new StreamableHTTPClientTransport(
          new URL(props.url),
          transportOpts,
        );
      }
      return new StreamableHTTPClientTransport(new URL(props.url));
    },
  );

  const finalizeConnect = useEffectEvent(
    async (transport: StreamableHTTPClientTransport) => {
      const client = new Client({
        name: "assistant-ui-mcp",
        version: "0.0.0",
      });
      const startedAt = Date.now();
      // SDK's StreamableHTTPClientTransport.sessionId is `string | undefined`
      // but Transport.sessionId is declared `string?` — under
      // exactOptionalPropertyTypes the SDK's own classes don't satisfy its
      // Transport interface. Cast to bridge the gap.
      await withConnectionTimeout(
        client.connect(transport as unknown as Transport),
        "connecting",
        startedAt,
      );
      // Defer ref assignment until listTools() also succeeds — otherwise a
      // post-connect failure leaves stale refs that `callTool()` would
      // happily walk into, producing confusing SDK errors instead of
      // "not connected".
      const list = await withConnectionTimeout(
        client.listTools(),
        "listing tools",
        startedAt,
      );
      clientRef.current = client;
      transportRef.current = transport;
      setTools(
        list.tools.map((t) => {
          const info: MCPToolInfo = {
            name: t.name,
            inputSchema: t.inputSchema,
          };
          if (t.description !== undefined) info.description = t.description;
          return info;
        }),
      );
      setConnectionState("connected");
    },
  );

  const closeTransport = async () => {
    const t = transportRef.current;
    transportRef.current = null;
    clientRef.current = null;
    if (t) {
      try {
        await t.close();
      } catch {
        // ignore close errors
      }
    }
  };

  const doConnect = useEffectEvent(async () => {
    // Close any prior transport/client so a re-connect doesn't leak.
    await closeTransport();
    setConnectionState("connecting");
    setLastError(null);
    setAuthorizationUrl(null);
    // Clear tools so a reconnect (error → connect, or authRequired
    // → connect) doesn't expose the previous attempt's tool list.
    setTools([]);
    let transport: StreamableHTTPClientTransport | null = null;
    try {
      transport = await buildTransport();
      // Don't assign to transportRef until connect succeeds — otherwise a
      // failed `listTools()` leaves an orphaned transport that future
      // doConnect / doDisconnect calls treat as live.
      await finalizeConnect(transport);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // OAuth: keep the transport alive so completeAuth can call
        // finishAuth on it. Closing it before storing would leave a
        // closed transport on transportRef.
        transportRef.current = transport;
        setConnectionState("authRequired");
      } else {
        if (transport) {
          try {
            await transport.close();
          } catch {
            // ignore close errors
          }
        }
        setLastError({
          message: err instanceof Error ? err.message : String(err),
        });
        setConnectionState("error");
      }
    }
  });

  const doDisconnect = useEffectEvent(async () => {
    setTools([]);
    setAuthorizationUrl(null);
    setConnectionState("disconnected");
    await closeTransport();
  });

  const doCompleteAuth = useEffectEvent(async (callbackUrl: string) => {
    setConnectionState("authPending");
    setLastError(null);
    try {
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      if (!code) throw new Error("missing authorization code in callback URL");
      let transport = transportRef.current;
      if (!transport) {
        transport = await buildTransport();
        transportRef.current = transport;
      }
      await transport.finishAuth(code);
      setAuthorizationUrl(null);
      await finalizeConnect(transport);
    } catch (err) {
      await closeTransport();
      const error = err instanceof Error ? err : new Error(String(err));
      setLastError({
        message: error.message,
      });
      setConnectionState("error");
      throw error;
    }
  });

  const tryAutoConnect = useEffectEvent(
    async (signal: { cancelled: boolean }) => {
      if (!props.autoConnect) return;
      if (props.auth.type === "none") {
        void doConnect();
        return;
      }
      // Static connector token short-circuits the storage read.
      if (props.auth.type === "bearer" && props.auth.token) {
        void doConnect();
        return;
      }
      const persisted = await props.storage.loadAuthState(props.id);
      if (signal.cancelled) return;
      if (props.auth.type === "oauth") {
        if (!persisted?.tokens) return;
      } else if (!persisted?.token) {
        return;
      }
      void doConnect();
    },
  );

  // Auto-connect on mount when usable auth exists.
  useEffect(() => {
    const signal = { cancelled: false };
    void tryAutoConnect(signal);
    return () => {
      signal.cancelled = true;
      const t = transportRef.current;
      transportRef.current = null;
      clientRef.current = null;
      if (t) t.close().catch(() => {});
    };
  }, []);

  const state = useMemo<MCPServerState>(
    () => ({
      id: props.id,
      kind: props.kind,
      name: props.name,
      url: props.url,
      icon: props.icon,
      connectionState,
      lastError,
      tools,
      authorizationUrl,
    }),
    [
      props.id,
      props.kind,
      props.name,
      props.url,
      props.icon,
      connectionState,
      lastError,
      tools,
      authorizationUrl,
    ],
  );

  return {
    getState: () => state,
    connect: doConnect,
    disconnect: doDisconnect,
    remove: async () => {
      await doDisconnect();
      await props.storage.clearAuthState(props.id);
      await props.onRemove();
    },
    callTool: async (name, args) => {
      const client = clientRef.current;
      if (!client) {
        throw new Error(`MCP server "${props.id}" is not connected`);
      }
      return await client.callTool({
        name,
        arguments: args as Record<string, unknown> | undefined,
      });
    },
    listResources: async (params) => {
      const client = clientRef.current;
      if (!client) {
        throw new Error(`MCP server "${props.id}" is not connected`);
      }
      return await client.listResources(params);
    },
    readResource: async (uri) => {
      const client = clientRef.current;
      if (!client) {
        throw new Error(`MCP server "${props.id}" is not connected`);
      }
      return await client.readResource({ uri });
    },
    completeAuth: doCompleteAuth,
  };
};

export const McpServerResource = resource(useMcpServerResource);
