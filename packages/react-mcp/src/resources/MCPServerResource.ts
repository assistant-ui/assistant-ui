import {
  resource,
  tapState,
  tapRef,
  tapEffect,
  tapMemo,
  tapEffectEvent,
} from "@assistant-ui/tap";
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
import type { MCPStorage } from "./storage/types";
import type {
  MCPAuthConfig,
  MCPConnectionState,
  MCPServerKind,
  MCPServerState,
  MCPToolInfo,
} from "../mcp-scope";

export type MCPServerResourceProps = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string | undefined;
  auth: MCPAuthConfig;
  storage: MCPStorage;
  redirectUri: string;
  autoConnect: boolean;
  onRemove: () => Promise<void>;
};

export const MCPServerResource = resource(
  (props: MCPServerResourceProps): ClientOutput<"mcpServer"> => {
    const [connectionState, setConnectionState] =
      tapState<MCPConnectionState>("disconnected");
    const [tools, setTools] = tapState<MCPToolInfo[]>([]);
    const [lastError, setLastError] = tapState<{ message: string } | null>(
      null,
    );
    const [authorizationUrl, setAuthorizationUrl] = tapState<string | null>(
      null,
    );

    const clientRef = tapRef<Client | null>(null);
    const transportRef = tapRef<StreamableHTTPClientTransport | null>(null);

    const buildTransport = tapEffectEvent(
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

    const finalizeConnect = tapEffectEvent(
      async (transport: StreamableHTTPClientTransport) => {
        const client = new Client({
          name: "assistant-ui-mcp",
          version: "0.0.0",
        });
        // SDK's StreamableHTTPClientTransport.sessionId is `string | undefined`
        // but Transport.sessionId is declared `string?` — under
        // exactOptionalPropertyTypes the SDK's own classes don't satisfy its
        // Transport interface. Cast to bridge the gap.
        await client.connect(transport as unknown as Transport);
        clientRef.current = client;
        transportRef.current = transport;
        const list = await client.listTools();
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

    const doConnect = tapEffectEvent(async () => {
      setConnectionState("connecting");
      setLastError(null);
      setAuthorizationUrl(null);
      try {
        const transport = await buildTransport();
        transportRef.current = transport;
        await finalizeConnect(transport);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          setConnectionState("authRequired");
        } else {
          setLastError({
            message: err instanceof Error ? err.message : String(err),
          });
          setConnectionState("error");
        }
      }
    });

    const doDisconnect = tapEffectEvent(async () => {
      const t = transportRef.current;
      transportRef.current = null;
      clientRef.current = null;
      setTools([]);
      setAuthorizationUrl(null);
      setConnectionState("disconnected");
      if (t) {
        try {
          await t.close();
        } catch {
          // ignore close errors
        }
      }
    });

    const doCompleteAuth = tapEffectEvent(async (callbackUrl: string) => {
      setConnectionState("authPending");
      try {
        const url = new URL(callbackUrl);
        const code = url.searchParams.get("code");
        if (!code)
          throw new Error("missing authorization code in callback URL");
        let transport = transportRef.current;
        if (!transport) {
          transport = await buildTransport();
          transportRef.current = transport;
        }
        await transport.finishAuth(code);
        setAuthorizationUrl(null);
        await finalizeConnect(transport);
      } catch (err) {
        setLastError({
          message: err instanceof Error ? err.message : String(err),
        });
        setConnectionState("error");
      }
    });

    const tryAutoConnect = tapEffectEvent(
      async (signal: { cancelled: boolean }) => {
        if (!props.autoConnect) return;
        if (props.auth.type === "oauth") {
          const persisted = await props.storage.loadAuthState(props.id);
          if (signal.cancelled) return;
          if (!persisted?.tokens) return;
          void doConnect();
        } else if (props.auth.type === "bearer") {
          const persisted = await props.storage.loadAuthState(props.id);
          if (signal.cancelled) return;
          const token = persisted?.token ?? props.auth.token;
          if (!token) return;
          void doConnect();
        } else {
          void doConnect();
        }
      },
    );

    // Auto-connect on mount when usable auth exists.
    tapEffect(() => {
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

    const state = tapMemo<MCPServerState>(
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
      readResource: async (uri) => {
        const client = clientRef.current;
        if (!client) {
          throw new Error(`MCP server "${props.id}" is not connected`);
        }
        return await client.readResource({ uri });
      },
      completeAuth: doCompleteAuth,
    };
  },
);
