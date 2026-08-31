"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { McpAppMetadata, ToolCallMessagePart } from "@assistant-ui/core";
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

/**
 * Options that apply to a single MCP app. `McpAppRenderer` takes them as
 * thread-wide defaults, and its `forPart` resolver overrides them for one part.
 */
export type McpAppPartOptions = {
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
  /**
   * Optional widget interaction and lifecycle handlers. Data-plane handlers
   * (`callTool`, `readResource`, `listResources`) always use `host`.
   *
   * Which handlers a widget may call is captured when its frame mounts, so a
   * `forPart` resolver returns the same handler keys for a part on every
   * render even when the implementations change.
   */
  handlers?: Omit<
    McpAppBridgeHandlers,
    "callTool" | "readResource" | "listResources"
  >;
  /** Rendered when no MCP app is on the part, or while load is in flight / failed (unless overridden). */
  fallback?: ReactNode;
  /** Rendered while the resource is loading. Defaults to `fallback`. */
  loadingFallback?: ReactNode;
  /** Rendered when the resource load rejects. Defaults to `fallback`. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};

export type McpAppRendererOptions = McpAppPartOptions & {
  /**
   * Provides the data-plane operations the widget can request
   * (`loadResource`, `callTool`, `readResource`, `listResources`). Use
   * `McpAppsRemoteHost({ url })` for the default HTTP-route convention.
   */
  host: ResourceElement<McpAppsHost>;
  /**
   * Resolves the options for one part. Each returned value replaces the
   * thread-wide option of the same name, so a host can give every MCP app its
   * own display mode and answer `requestDisplayMode` for the part that asked.
   *
   * `handlers` is the exception and merges per key. Its keys are capabilities
   * negotiated with the widget rather than data, so replacing the whole bag to
   * add one handler would withdraw the others from that part's widget with
   * nothing to observe it by.
   */
  forPart?: (part: ToolCallMessagePart) => McpAppPartOptions;
};

type LoadedResourceState = {
  host: McpAppsHost;
  resourceUri: string;
  serverId?: string;
  resource?: McpAppResource;
  error?: Error;
};

type RendererState = {
  host: McpAppsHost;
  options: McpAppRendererOptions;
};

type UseRendererStore = UseBoundStore<StoreApi<RendererState>>;

// Callers pass options as an object literal, so the resource hands this a fresh
// identity on every run; comparing the values keeps an unchanged run from
// re-rendering every mounted part. `host` is excluded because it is an element
// rebuilt on every run, and the store carries the resolved host separately.
const isSameOptions = (
  a: McpAppRendererOptions,
  b: McpAppRendererOptions,
): boolean => {
  const aKeys = Object.keys(a).filter((key) => key !== "host");
  const bKeys = Object.keys(b).filter((key) => key !== "host");
  if (aKeys.length !== bKeys.length) return false;
  const aValues = a as Record<string, unknown>;
  const bValues = b as Record<string, unknown>;
  return aKeys.every(
    (key) =>
      Object.hasOwn(bValues, key) && Object.is(aValues[key], bValues[key]),
  );
};

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

function resolvePartOptions(
  options: McpAppRendererOptions,
  part: ToolCallMessagePartProps,
): McpAppRendererOptions {
  const overrides = options.forPart?.(part);
  if (!overrides) return options;
  const handlers =
    options.handlers && overrides.handlers
      ? { ...options.handlers, ...overrides.handlers }
      : (overrides.handlers ?? options.handlers);
  return {
    ...options,
    ...overrides,
    ...(handlers === undefined ? {} : { handlers }),
  };
}

function InlineRenderer({
  part,
  useRendererStore,
}: {
  part: ToolCallMessagePartProps;
  useRendererStore: UseRendererStore;
}) {
  const aui = useAui();
  const rendererOptions = useRendererStore((state) => state.options);
  const opts = resolvePartOptions(rendererOptions, part);
  const app = getMcpAppFromToolPart(part);
  const cachedAppRef = useRef<McpAppMetadata | undefined>(undefined);
  useLayoutEffect(() => {
    if (app != null) cachedAppRef.current = app;
  }, [app]);
  const appForRender = app ?? cachedAppRef.current;

  const [loadedResource, setLoadedResource] = useState<LoadedResourceState>();

  const host = useRendererStore((state) => state.host);
  const resourceUri = appForRender?.resourceUri;
  const serverId = appForRender?.serverId;
  const callerHandlers = opts.handlers;
  useEffect(() => {
    if (resourceUri == null) return;
    let cancelled = false;
    const targetHost = host;
    const targetUri = resourceUri;
    const targetServerId = serverId;

    // Host changes are published later in this passive flush. Defer until that
    // publication lands, then verify this effect still owns the current host.
    const loadResource = async () => {
      await Promise.resolve();
      if (cancelled || useRendererStore.getState().host !== targetHost) return;
      try {
        const res = await targetHost.loadResource({
          uri: targetUri,
          ...(targetServerId ? { serverId: targetServerId } : {}),
        });
        if (!cancelled)
          setLoadedResource({
            host: targetHost,
            resourceUri: targetUri,
            ...(targetServerId !== undefined
              ? { serverId: targetServerId }
              : {}),
            resource: res,
          });
      } catch (error: unknown) {
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
      }
    };
    void loadResource();

    return () => {
      cancelled = true;
    };
  }, [host, resourceUri, serverId, useRendererStore]);

  const bridgeHandlers = useMemo<McpAppBridgeHandlers>(
    () => ({
      ...callerHandlers,
      openLink: callerHandlers?.openLink ?? defaultOpenLink,
      sendMessage:
        callerHandlers?.sendMessage ??
        ((params) => {
          const text = extractSendMessageText(params);
          if (!text) return { ok: false, reason: "unrecognised params shape" };
          aui.thread.append({ content: [{ type: "text", text }] });
          return { ok: true };
        }),
      callTool: (params) =>
        useRendererStore.getState().host.callTool({
          ...params,
          ...(serverId ? { serverId } : {}),
        }),
      readResource: (params) =>
        useRendererStore.getState().host.readResource({
          ...params,
          ...(serverId ? { serverId } : {}),
        }),
      listResources: (params) => {
        if (!serverId) {
          return useRendererStore.getState().host.listResources(params);
        }
        return useRendererStore.getState().host.listResources({
          ...(isRecord(params) ? params : {}),
          serverId,
        });
      },
    }),
    [aui, callerHandlers, serverId, useRendererStore],
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

  // The rendered component identity has to stay stable, or every part remounts
  // its frame; options reach the parts through the store instead of props.
  const [useRendererStore] = useState(() =>
    create<RendererState>(() => ({ host, options })),
  );
  useEffect(() => {
    useRendererStore.setState((prev) =>
      prev.host === host && isSameOptions(prev.options, options)
        ? prev
        : { host, options },
    );
  }, [host, options, useRendererStore]);

  const render = useMemo((): ToolCallMessagePartComponent => {
    const Render: ToolCallMessagePartComponent = (props) => (
      <InlineRenderer part={props} useRendererStore={useRendererStore} />
    );
    Render.displayName = "McpAppRenderer";
    return Render;
  }, [useRendererStore]);

  return { render };
};

export const McpAppRenderer = resource(useMcpAppRenderer);
