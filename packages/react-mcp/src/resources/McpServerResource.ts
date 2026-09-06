import { useState, useRef, useEffect, useMemo, useEffectEvent } from "react";
import { resource, useResource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  type ClientOptions,
  type ElicitRequest,
  type ElicitResult,
  type StreamableHTTPClientTransportOptions,
} from "@modelcontextprotocol/client";
import {
  clearOAuthProviderAuthState,
  createOAuthProvider,
} from "../auth/createOAuthProvider";
import { buildHeaders } from "../auth/buildHeaders";
import { assertValidServerId } from "../utils/serverId";
import {
  hasPersistedCredentials,
  isAuthStateForServerUrl,
} from "../utils/serverUrl";
import { validateElicitationContent } from "./validateElicitationContent";
import type { MCPStorage } from "./storage/types";
import type {
  MCPAuthConfig,
  MCPConnectionState,
  MCPElicitation,
  MCPElicitationResponse,
  MCPServerKind,
  MCPServerState,
  MCPToolInfo,
} from "../mcp-scope";
import { createMcpId } from "../utils/createMcpId";

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
  cache?: { readonly defaultTtlMs?: number } | undefined;
  readonly elicitation?: boolean;
  onRemove: () => Promise<void>;
};

type McpServerResourceInstanceProps = McpServerResourceProps & {
  transportCloseQueueRef: { current: Promise<void> };
};

export const getConnectionDependencies = (
  props: McpServerResourceProps,
): readonly unknown[] => {
  const auth = props.auth;
  const authDependencies =
    auth.type === "bearer"
      ? [auth.type, auth.token, props.storage.scopeId]
      : auth.type === "oauth"
        ? [
            auth.type,
            auth.scopes?.length,
            ...(auth.scopes ?? []),
            auth.authorizationEndpoint,
            auth.tokenEndpoint,
            auth.registrationEndpoint,
            auth.clientId,
            auth.clientSecret,
            props.storage.scopeId,
          ]
        : [auth.type];

  return [
    props.id,
    props.url,
    ...authDependencies,
    props.redirectUri,
    props.cache?.defaultTtlMs,
    props.elicitation !== false,
  ];
};

const areConnectionDependenciesEqual = (
  left: readonly unknown[],
  right: readonly unknown[],
) =>
  left.length === right.length &&
  left.every((value, index) => Object.is(value, right[index]));

const useMcpServerResourceInstance = (
  props: McpServerResourceInstanceProps,
): ClientOutput<"mcpServer"> => {
  assertValidServerId(props.id);
  const [connectionState, setConnectionState] =
    useState<MCPConnectionState>("disconnected");
  const [tools, setTools] = useState<MCPToolInfo[]>([]);
  const [lastError, setLastError] = useState<{ message: string } | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [pendingElicitations, setPendingElicitations] = useState<
    MCPElicitation[]
  >([]);

  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<StreamableHTTPClientTransport | null>(null);
  const pendingTransportRef = useRef<StreamableHTTPClientTransport | null>(
    null,
  );
  const connectionGenerationRef = useRef(0);
  const pendingAuthValidationRef = useRef<{
    count: number;
    promise: Promise<void>;
    resolve: () => void;
  } | null>(null);
  const elicitationResolversRef = useRef(
    new Map<
      string,
      {
        resolve: (result: ElicitResult) => void;
        signal: AbortSignal;
        onAbort: () => void;
        requestedSchema: unknown;
      }
    >(),
  );
  const pendingDisposalRef = useRef<{ cancelled: boolean } | null>(null);
  const mountedRef = useRef(true);

  const closeTransportSafely = async (
    transport: StreamableHTTPClientTransport,
  ): Promise<void> => {
    try {
      await transport.close();
    } catch {
      // ignore close errors
    }
  };

  const closeQueuedTransports = (
    transports: StreamableHTTPClientTransport[],
  ): Promise<void> => {
    const task = props.transportCloseQueueRef.current.then(async () => {
      await Promise.all(transports.map(closeTransportSafely));
    });
    props.transportCloseQueueRef.current = task;
    return task;
  };

  const closePendingTransport = async () => {
    const transport = pendingTransportRef.current;
    pendingTransportRef.current = null;
    await closeQueuedTransports(transport ? [transport] : []);
  };

  const resolvePendingElicitation = (id: string, result: ElicitResult) => {
    const entry = elicitationResolversRef.current.get(id);
    if (!entry) return false;
    elicitationResolversRef.current.delete(id);
    entry.signal.removeEventListener("abort", entry.onAbort);
    setPendingElicitations((current) =>
      current.filter((elicitation) => elicitation.id !== id),
    );
    entry.resolve(result);
    return true;
  };

  const setPendingElicitationError = (
    id: string,
    error: NonNullable<MCPElicitation["error"]>,
  ) => {
    if (!elicitationResolversRef.current.has(id)) return false;
    setPendingElicitations((current) =>
      current.map((elicitation) =>
        elicitation.id === id ? { ...elicitation, error } : elicitation,
      ),
    );
    return true;
  };

  const cancelPendingElicitations = () => {
    for (const [id] of elicitationResolversRef.current) {
      resolvePendingElicitation(id, { action: "cancel" });
    }
  };

  const detachTransports = () => {
    cancelPendingElicitations();
    const pendingTransport = pendingTransportRef.current;
    const activeTransport = transportRef.current;
    pendingTransportRef.current = null;
    transportRef.current = null;
    clientRef.current = null;

    return [
      ...new Set(
        [pendingTransport, activeTransport].filter(
          (transport): transport is StreamableHTTPClientTransport =>
            transport !== null,
        ),
      ),
    ];
  };

  const closeTransports = async () => {
    await closeQueuedTransports(detachTransports());
  };

  const isCurrentConnection = (generation: number) =>
    mountedRef.current && generation === connectionGenerationRef.current;

  const createInterruptedAuthError = (cause?: unknown) =>
    new Error(
      `MCP server "${props.id}" authorization was interrupted before completion.`,
      cause === undefined ? undefined : { cause },
    );

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

  const unboundAuthMessage = () =>
    `MCP server "${props.id}" has saved authentication for a different URL. Authenticate again to connect to ${props.url}.`;

  const loadAuthState = useEffectEvent(async () => {
    const state = await props.storage.loadAuthState(props.id);
    if (isAuthStateForServerUrl(state, props.url)) {
      return { state, unbound: false };
    }
    return { state: null, unbound: hasPersistedCredentials(state) };
  });

  const buildTransport = useEffectEvent(
    async (): Promise<StreamableHTTPClientTransport> => {
      if (props.auth.type === "oauth") {
        const authProvider = createOAuthProvider({
          serverId: props.id,
          serverUrl: props.url,
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
        const { state, unbound } = await loadAuthState();
        const headers = buildHeaders(props.auth, state);
        if (!headers && unbound) throw new Error(unboundAuthMessage());
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

  const applyToolsList = useEffectEvent(
    (list: {
      tools: Array<{
        name: string;
        description?: string | undefined;
        inputSchema: unknown;
      }>;
    }) => {
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
    },
  );

  const syncTools = useEffectEvent(
    async (
      client: Client,
      generation: number,
      options?: { startedAt?: number | undefined },
    ): Promise<boolean> => {
      const listPromise = client.listTools();
      const list =
        options?.startedAt === undefined
          ? await listPromise
          : await withConnectionTimeout(
              listPromise,
              "listing tools",
              options.startedAt,
            );
      if (!isCurrentConnection(generation)) return false;
      applyToolsList(list);
      return true;
    },
  );

  const finalizeConnect = useEffectEvent(
    async (
      transport: StreamableHTTPClientTransport,
      generation: number,
    ): Promise<boolean> => {
      const clientOptions: ClientOptions = {
        ...(props.elicitation === false
          ? {}
          : { capabilities: { elicitation: {} } }),
        listChanged: {
          tools: {
            autoRefresh: true,
            debounceMs: 300,
            onChanged: (error, items) => {
              if (!isCurrentConnection(generation)) return;
              if (error !== null) {
                setLastError({ message: error.message });
                return;
              }
              if (items === null) return;
              setLastError(null);
              applyToolsList({ tools: items });
            },
          },
        },
      };
      if (props.cache?.defaultTtlMs !== undefined) {
        clientOptions.defaultCacheTtlMs = props.cache.defaultTtlMs;
      }
      const client = new Client(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        clientOptions,
      );
      if (props.elicitation !== false) {
        client.setRequestHandler(
          "elicitation/create",
          (request: ElicitRequest, context): Promise<ElicitResult> => {
            if (!isCurrentConnection(generation)) {
              return Promise.resolve({ action: "cancel" });
            }
            if (!("requestedSchema" in request.params)) {
              return Promise.resolve({ action: "cancel" });
            }
            const { message, requestedSchema } = request.params;

            const id = createMcpId();
            const promise = new Promise<ElicitResult>((resolve) => {
              const onAbort = () => {
                resolvePendingElicitation(id, { action: "cancel" });
              };
              elicitationResolversRef.current.set(id, {
                resolve,
                signal: context.signal,
                onAbort,
                requestedSchema,
              });
            });
            setPendingElicitations((current) => [
              ...current,
              {
                id,
                message,
                requestedSchema,
              },
            ]);
            const entry = elicitationResolversRef.current.get(id);
            if (entry) {
              if (context.signal.aborted) {
                entry.onAbort();
              } else {
                context.signal.addEventListener("abort", entry.onAbort, {
                  once: true,
                });
              }
            }
            return promise;
          },
        );
      }
      const startedAt = Date.now();
      await withConnectionTimeout(
        client.connect(transport),
        "connecting",
        startedAt,
      );
      if (!isCurrentConnection(generation)) return false;
      // Defer ref assignment until listTools() also succeeds — otherwise a
      // post-connect failure leaves stale refs that `callTool()` would
      // happily walk into, producing confusing SDK errors instead of
      // "not connected".
      const synced = await syncTools(client, generation, { startedAt });
      if (!synced) return false;

      pendingTransportRef.current = null;
      clientRef.current = client;
      transportRef.current = transport;
      setConnectionState("connected");
      return true;
    },
  );

  const doConnect = useEffectEvent(async () => {
    const generation = ++connectionGenerationRef.current;
    // Close any prior transport/client so a re-connect doesn't leak.
    await closeTransports();
    if (!isCurrentConnection(generation)) return;

    setConnectionState("connecting");
    setLastError(null);
    setAuthorizationUrl(null);
    // Clear tools so a reconnect (error → connect, or authRequired
    // → connect) doesn't expose the previous attempt's tool list.
    setTools([]);
    let transport: StreamableHTTPClientTransport | null = null;
    try {
      transport = await buildTransport();
      if (!isCurrentConnection(generation)) {
        await closeQueuedTransports([transport]);
        return;
      }
      pendingTransportRef.current = transport;
      // Don't assign to transportRef until connect succeeds — otherwise a
      // failed `listTools()` leaves an orphaned transport that future
      // doConnect / doDisconnect calls treat as live.
      await finalizeConnect(transport, generation);
    } catch (err) {
      if (!isCurrentConnection(generation)) return;

      if (err instanceof UnauthorizedError) {
        // OAuth: keep the transport alive so completeAuth can call
        // finishAuth on it. Closing it before storing would leave a
        // closed transport on transportRef.
        pendingTransportRef.current = null;
        transportRef.current = transport;
        setConnectionState("authRequired");
      } else {
        cancelPendingElicitations();
        if (transport) {
          pendingTransportRef.current = null;
          await closeQueuedTransports([transport]);
        }
        setLastError({
          message: err instanceof Error ? err.message : String(err),
        });
        setConnectionState("error");
      }
    }
  });

  const doDisconnect = useEffectEvent(async () => {
    connectionGenerationRef.current += 1;
    setTools([]);
    setAuthorizationUrl(null);
    setConnectionState("disconnected");
    await closeTransports();
  });

  const doCompleteAuth = useEffectEvent(async (callbackUrl: string) => {
    const validationGeneration = connectionGenerationRef.current;
    const url = new URL(callbackUrl);
    const state = url.searchParams.get("state");
    if (!state) throw new Error('missing "state" parameter');
    let pendingAuthValidation = pendingAuthValidationRef.current;
    if (!pendingAuthValidation) {
      let resolve!: () => void;
      const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise;
      });
      pendingAuthValidation = { count: 0, promise, resolve };
      pendingAuthValidationRef.current = pendingAuthValidation;
    }
    pendingAuthValidation.count += 1;
    try {
      const { state: persisted, unbound } = await loadAuthState();
      if (!isCurrentConnection(validationGeneration)) {
        throw createInterruptedAuthError();
      }
      if (unbound) throw new Error(unboundAuthMessage());
      if (!persisted?.state) {
        throw new Error(
          "no pending OAuth authorization request for this server",
        );
      }
      if (persisted.state !== state) {
        throw new Error("OAuth state does not match the authorization request");
      }
      if (!url.searchParams.get("code") && !url.searchParams.get("error")) {
        throw new Error("missing authorization code in callback URL");
      }
    } finally {
      pendingAuthValidation.count -= 1;
      if (pendingAuthValidation.count === 0) {
        pendingAuthValidationRef.current = null;
        pendingAuthValidation.resolve();
      }
    }

    // Claim the generation before a waiting auto-connect can resume.
    const generation = ++connectionGenerationRef.current;
    cancelPendingElicitations();
    await closePendingTransport();
    if (!isCurrentConnection(generation)) throw createInterruptedAuthError();

    setConnectionState("authPending");
    setLastError(null);
    try {
      let transport = transportRef.current;
      if (!transport) {
        transport = await buildTransport();
        if (!isCurrentConnection(generation)) {
          await closeQueuedTransports([transport]);
          throw createInterruptedAuthError();
        }
      }
      transportRef.current = null;
      clientRef.current = null;
      pendingTransportRef.current = transport;
      await transport.finishAuth(url.searchParams);
      if (!isCurrentConnection(generation)) throw createInterruptedAuthError();
      setAuthorizationUrl(null);
      const connected = await finalizeConnect(transport, generation);
      if (!connected) throw createInterruptedAuthError();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (!isCurrentConnection(generation))
        throw createInterruptedAuthError(error);

      await closeTransports();
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
      const generation = connectionGenerationRef.current;
      let loaded: Awaited<ReturnType<typeof loadAuthState>>;
      try {
        loaded = await loadAuthState();
      } catch (error) {
        if (signal.cancelled || !isCurrentConnection(generation)) return;
        const message = error instanceof Error ? error.message : String(error);
        setLastError({
          message: `MCP server "${props.id}" failed to load saved authentication: ${message}`,
        });
        setConnectionState("error");
        return;
      }
      if (signal.cancelled || !isCurrentConnection(generation)) return;
      if (loaded.unbound) {
        setLastError({ message: unboundAuthMessage() });
        return;
      }
      const persisted = loaded.state;
      if (props.auth.type === "oauth") {
        if (!persisted?.tokens) return;
      } else if (!persisted?.token) {
        return;
      }
      const pendingAuthValidation = pendingAuthValidationRef.current;
      if (pendingAuthValidation) {
        await pendingAuthValidation.promise;
        if (signal.cancelled || !isCurrentConnection(generation)) return;
      }
      void doConnect();
    },
  );

  // Auto-connect on mount when usable auth exists.
  useEffect(() => {
    const transportCloseQueueRef = props.transportCloseQueueRef;
    const previousDisposal = pendingDisposalRef.current;
    if (previousDisposal) previousDisposal.cancelled = true;
    const pendingDisposal = { cancelled: false };
    pendingDisposalRef.current = pendingDisposal;
    mountedRef.current = true;
    const signal = { cancelled: false };
    // Auto-connect opens a transport, so it belongs to the same effect as the
    // disposal that closes it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void tryAutoConnect(signal);
    return () => {
      mountedRef.current = false;
      signal.cancelled = true;
      const task = transportCloseQueueRef.current.then(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve));
        if (pendingDisposal.cancelled) return;
        connectionGenerationRef.current += 1;
        await Promise.all(detachTransports().map(closeTransportSafely));
      });
      transportCloseQueueRef.current = task;
    };
  }, [props.transportCloseQueueRef]);

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
      pendingElicitations,
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
      pendingElicitations,
    ],
  );

  return {
    getState: () => state,
    connect: doConnect,
    disconnect: doDisconnect,
    remove: async () => {
      await doDisconnect();
      try {
        await clearOAuthProviderAuthState(props.storage, props.id);
        await props.onRemove();
      } catch (err) {
        setLastError({
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
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
    answerElicitation: (
      id: string,
      response: MCPElicitationResponse,
    ): readonly { property: string; message: string }[] | undefined => {
      if (response.action === "accept") {
        const entry = elicitationResolversRef.current.get(id);
        if (!entry) return;

        if (
          typeof response.content !== "object" ||
          response.content === null ||
          Array.isArray(response.content)
        ) {
          const errors = [
            {
              property: "content",
              message: "Response content must be an object.",
            },
          ];
          setPendingElicitationError(id, {
            message: "Invalid elicitation content: content.",
            properties: ["content"],
          });
          return errors;
        }

        const errors = validateElicitationContent(
          entry.requestedSchema,
          response.content,
        );
        if (errors.length > 0) {
          const properties = [
            ...new Set(errors.map((error) => error.property)),
          ];
          setPendingElicitationError(id, {
            message: `Invalid elicitation content: ${properties.join(", ")}.`,
            properties,
          });
          return errors;
        }

        const result: ElicitResult = {
          action: "accept",
          content: response.content as ElicitResult["content"],
        };
        resolvePendingElicitation(id, result);
        return;
      }

      resolvePendingElicitation(id, { action: response.action });
    },
  };
};

const McpServerResourceInstance = resource(useMcpServerResourceInstance);

export const McpServerResource = resource(function useMcpServerResource(
  props: McpServerResourceProps,
): ClientOutput<"mcpServer"> {
  const transportCloseQueueRef = useRef(Promise.resolve());
  const dependencies = getConnectionDependencies(props);
  const [connection, setConnection] = useState({ dependencies, generation: 0 });
  let currentConnection = connection;
  if (!areConnectionDependenciesEqual(connection.dependencies, dependencies)) {
    currentConnection = {
      dependencies,
      generation: connection.generation + 1,
    };
    setConnection(currentConnection);
  }

  // Storage keys remounts through its optional scopeId rather than object
  // identity, because a defaulted storage element is rebuilt on ordinary
  // renders.
  return useResource(
    withKey(
      currentConnection.generation,
      McpServerResourceInstance({ ...props, transportCloseQueueRef }),
    ),
  );
});
