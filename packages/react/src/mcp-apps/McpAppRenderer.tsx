"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { McpAppMetadata } from "@assistant-ui/core";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { create, type StoreApi, type UseBoundStore } from "zustand";

import { useResource, resource, type ResourceElement } from "@assistant-ui/tap";
import { McpAppFrame } from "./app-frame";
import type {
  McpAppBridgeHandlers,
  McpAppHostContext,
  McpAppHostInfo,
  McpAppResource,
  McpAppSandboxConfig,
  McpAppsHost,
} from "./types";
import { getMcpAppFromToolPart } from "./utils";
import { isRecord } from "@assistant-ui/core/internal";

export type McpAppRendererOptions = {
  /**
   * Provides the data-plane operations the widget can request
   * (`loadResource`, `callTool`, `readResource`, `listResources`). Use
   * `McpAppsRemoteHost({ url })` for the default HTTP-route convention.
   */
  host: ResourceElement<McpAppsHost>;
  /** Sandbox + container styling. Passes through to SafeContentFrame. */
  sandbox?: McpAppSandboxConfig;
  /**
   * Upper bound (in pixels) applied to the widget-driven auto-resize height.
   * Defaults to 800.
   */
  maxHeight?: number;
  /** Identifies the host to the widget in the `ui/initialize` response. */
  hostInfo?: McpAppHostInfo;
  /** Delivered to the widget on initialize and pushed via `notifications/host_context/changed` on change. */
  hostContext?: McpAppHostContext;
  /** Rendered when no MCP app is on the part, or while load is in flight / failed (unless overridden). */
  fallback?: ReactNode;
  /** Rendered while the resource is loading. Defaults to `fallback`. */
  loadingFallback?: ReactNode;
  /** Rendered when the resource load rejects. Defaults to `fallback`. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};

type LoadedResourceState = {
  host: McpAppsHost;
  resourceUri: string;
  serverId?: string;
  resource?: McpAppResource;
  error?: Error;
};

type UseHostStore = UseBoundStore<StoreApi<{ host: McpAppsHost }>>;

function getInput(part: {
  status: { type: string };
  argsText: string;
  args: unknown;
}): unknown {
  if (
    part.status.type === "running" &&
    (part.argsText === "" || part.argsText === "{}")
  ) {
    return undefined;
  }
  return part.args;
}

const defaultOpenLink = ({ url }: { url: string }) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

function extractSendMessageText(params: unknown): string | undefined {
  if (typeof params === "string") return params;
  if (!params || typeof params !== "object") return undefined;
  const obj = params as Record<string, unknown>;
  if (typeof obj["prompt"] === "string") return obj["prompt"];
  if (typeof obj["text"] === "string") return obj["text"];
  if (typeof obj["message"] === "string") return obj["message"];
  return undefined;
}

function InlineRenderer({
  part,
  useHostStore,
  optionsRef,
}: {
  part: ToolCallMessagePartProps;
  useHostStore: UseHostStore;
  optionsRef: MutableRefObject<McpAppRendererOptions>;
}) {
  const opts = optionsRef.current;
  const aui = useAui();
  const app = getMcpAppFromToolPart(part);
  const cachedAppRef = useRef<McpAppMetadata | undefined>(undefined);
  if (
    app != null &&
    (cachedAppRef.current?.resourceUri !== app.resourceUri ||
      cachedAppRef.current?.serverId !== app.serverId)
  ) {
    cachedAppRef.current = app;
  }
  const appForRender = app ?? cachedAppRef.current;

  const [loadedResource, setLoadedResource] = useState<LoadedResourceState>();

  const host = useHostStore((state) => state.host);
  const resourceUri = appForRender?.resourceUri;
  const serverId = appForRender?.serverId;
  const serverIdRef = useRef<string | undefined>(undefined);
  serverIdRef.current = serverId;
  useEffect(() => {
    if (resourceUri == null) return;
    let cancelled = false;
    const targetHost = host;
    const targetUri = resourceUri;
    const targetServerId = serverId;

    targetHost
      .loadResource({
        uri: targetUri,
        ...(targetServerId ? { serverId: targetServerId } : {}),
      })
      .then((res) => {
        if (!cancelled)
          setLoadedResource({
            host: targetHost,
            resourceUri: targetUri,
            ...(targetServerId !== undefined
              ? { serverId: targetServerId }
              : {}),
            resource: res,
          });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadedResource({
            host: targetHost,
            resourceUri: targetUri,
            ...(targetServerId !== undefined
              ? { serverId: targetServerId }
              : {}),
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [host, resourceUri, serverId]);

  const bridgeHandlers = useMemo<McpAppBridgeHandlers>(
    () => ({
      openLink: defaultOpenLink,
      sendMessage: (params) => {
        const text = extractSendMessageText(params);
        if (!text) return { ok: false, reason: "unrecognised params shape" };
        aui.thread.append({ content: [{ type: "text", text }] });
        return { ok: true };
      },
      callTool: (params) =>
        useHostStore.getState().host.callTool({
          ...params,
          ...(serverIdRef.current ? { serverId: serverIdRef.current } : {}),
        }),
      readResource: (params) =>
        useHostStore.getState().host.readResource({
          ...params,
          ...(serverIdRef.current ? { serverId: serverIdRef.current } : {}),
        }),
      listResources: (params) => {
        if (!serverIdRef.current) {
          return useHostStore.getState().host.listResources(params);
        }
        return useHostStore.getState().host.listResources({
          ...(isRecord(params) ? params : {}),
          serverId: serverIdRef.current,
        });
      },
    }),
    [aui, useHostStore],
  );

  const loadedResourceForApp =
    loadedResource?.host === host &&
    loadedResource?.resourceUri === appForRender?.resourceUri &&
    loadedResource?.serverId === appForRender?.serverId
      ? loadedResource
      : undefined;
  const appResource = loadedResourceForApp?.resource;
  const error = loadedResourceForApp?.error;

  const fallback = opts.fallback ?? null;
  if (appForRender == null) {
    return <>{fallback}</>;
  }
  if (error != null) {
    const errorFallback = opts.errorFallback;
    if (errorFallback === undefined) return <>{fallback}</>;
    if (typeof errorFallback === "function") return <>{errorFallback(error)}</>;
    return <>{errorFallback}</>;
  }
  if (appResource == null) {
    return <>{opts.loadingFallback ?? fallback}</>;
  }

  return (
    <McpAppFrame
      app={appForRender}
      resource={appResource}
      input={getInput(part)}
      output={part.result}
      sandbox={opts.sandbox}
      handlers={bridgeHandlers}
      hostInfo={opts.hostInfo}
      hostContext={opts.hostContext}
      maxHeight={opts.maxHeight}
    />
  );
}

/**
 * Creates a tool-call renderer for MCP Apps embedded in assistant messages.
 *
 * Compose this into the `Tools` resource through its `mcpApp` option. When a
 * tool-call part carries `mcp.app` metadata for a `ui://` resource, the
 * renderer loads that resource from the configured host and displays it in a
 * sandboxed frame.
 */
const useMcpAppRenderer = (
  options: McpAppRendererOptions,
): { readonly render: ToolCallMessagePartComponent } => {
  const host = useResource(options.host);

  const optionsRef = useRef<McpAppRendererOptions>(options);
  optionsRef.current = options;

  const [useHostStore] = useState(() =>
    create<{ host: McpAppsHost }>(() => ({ host })),
  );
  useEffect(() => {
    useHostStore.setState({ host });
  }, [host, useHostStore]);

  const render = useMemo((): ToolCallMessagePartComponent => {
    const Render: ToolCallMessagePartComponent = (props) => (
      <InlineRenderer
        part={props}
        useHostStore={useHostStore}
        optionsRef={optionsRef}
      />
    );
    Render.displayName = "McpAppRenderer";
    return Render;
  }, [useHostStore]);

  return { render };
};

export const McpAppRenderer = resource(useMcpAppRenderer);
